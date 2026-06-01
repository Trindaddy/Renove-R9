"""
R9 - Renove: Sistema de Gestão de Notebooks
Backend FastAPI - Módulo de Empréstimo
"""

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
import asyncio

from database import engine, SessionLocal, get_db, get_brasilia_time, run_db_migrations
import models
from models import Base
import crud
import schemas
from websocket import websocket_endpoint, manager, broadcast_disponibilidade, broadcast_emprestimo_realizado, broadcast_devolucao_realizada
from alertas import verificar_alerta_escassez_sync

# Criar tabelas (apenas se configurado para evitar conflito com Alembic em produção)
if os.getenv("CREATE_TABLES_ON_STARTUP", "true").lower() == "true":
    Base.metadata.create_all(bind=engine)
    run_db_migrations()

app = FastAPI(
    title="R9 - Gestão de Notebooks",
    description="API para gerenciamento de empréstimo de notebooks",
    version="1.0.0"
)

# CORS — permitir origem do frontend em produção
# Defina CORS_ORIGINS no formato: "https://dominio.com,http://localhost:5173"
_default_origins = os.getenv("CORS_ORIGINS", "http://127.0.0.1:5500,http://localhost:5500,http://localhost:5173,http://localhost:3000")
allow_list = [o.strip() for o in _default_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configurações de segurança
SECRET_KEY = os.getenv("SECRET_KEY", "SNC@1234")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ==================== UTILITÁRIOS DE AUTENTICAÇÃO ====================

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = crud.get_usuario(db, int(user_id))
    if user is None:
        raise credentials_exception
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta suspensa/inativa"
        )
    return user

def require_role(roles: List[str]):
    def role_checker(current_user: schemas.UsuarioResponse = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sem permissão para esta operação"
            )
        return current_user
    return role_checker

# ==================== ROTAS DE AUTENTICAÇÃO ====================

@app.post("/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.get_usuario_by_email(db, form_data.username)
    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(status_code=400, detail="Email ou senha incorretos")
    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta conta está atualmente inativa. Por favor, entre em contato com o setor de TI para verificar o seu status e solicitar o desbloqueio."
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UsuarioResponse)
def me(current_user: schemas.UsuarioResponse = Depends(get_current_user)):
    return current_user

# ==================== ROTAS DE USUÁRIOS ====================

@app.post("/usuarios", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def create_usuario(
    usuario: schemas.UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    email = usuario.email.strip().lower()
    role = usuario.role
    
    if role in ["ti", "professor"]:
        if not email.endswith("@df.senac.br"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuários com perfil de TI ou Professor devem utilizar um e-mail do domínio @df.senac.br"
            )
    elif role == "aluno":
        if not email.endswith("@edu.df.senac.br"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Usuários com perfil de Aluno devem utilizar um e-mail do domínio @edu.df.senac.br"
            )
        if not usuario.turma or not usuario.turma.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="O campo turma é obrigatório para usuários com perfil de Aluno."
            )
            
    if crud.get_usuario_by_email(db, usuario.email):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    if crud.get_usuario_by_matricula(db, usuario.matricula):
        raise HTTPException(status_code=400, detail="Matrícula já cadastrada")
    
    return crud.create_usuario(db, usuario)

@app.get("/usuarios", response_model=List[schemas.UsuarioResponse])
def list_usuarios(
    role: Optional[str] = None,
    turma: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    return crud.listar_usuarios(db, role=role, turma=turma)

@app.get("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def get_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    user = crud.get_usuario(db, usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@app.get("/usuarios/matricula/{matricula}", response_model=schemas.UsuarioResponse)
def get_usuario_by_matricula(
    matricula: str,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    user = crud.get_usuario_by_matricula(db, matricula)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@app.patch("/usuarios/{usuario_id}/senha", status_code=status.HTTP_200_OK)
def reset_senha_usuario(
    usuario_id: int,
    body: dict,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    """Redefine a senha de um usuário. Exclusivo para TI."""
    require_role(["ti"])(current_user)
    
    nova_senha = body.get("nova_senha", "")
    if not nova_senha or len(nova_senha) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A nova senha deve ter pelo menos 6 caracteres"
        )
    
    user = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Obter um notebook ID válido para evitar erro de FK no histórico
    first_nb = db.query(models.Notebook).first()
    if not first_nb:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nenhum notebook cadastrado no sistema. Não é possível registrar alteração de senha no histórico."
        )
    
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    user.senha_hash = pwd_context.hash(nova_senha)
    
    # Adicionar histórico log na mesma transação
    db_hist = models.Historico(
        notebook_id=first_nb.id,
        usuario_id=user.id,
        responsavel_id=current_user.id,
        tipo_movimentacao="ATUALIZACAO",
        descricao=f"Senha redefinida pela TI para o usuário {user.nome} ({user.email})"
    )
    db.add(db_hist)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar redefinição de senha: {str(e)}")
        
    return {"detail": f"Senha de {user.nome} redefinida com sucesso"}

@app.delete("/usuarios/{usuario_id}", status_code=status.HTTP_200_OK)
async def delete_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    """Exclui permanentemente um usuário e seus registros dependentes (cascata). Exclusivo para TI."""
    require_role(["ti"])(current_user)
    
    if current_user.id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível excluir a própria conta de TI ativa."
        )
        
    user = crud.get_usuario(db, usuario_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    # 1. Buscar empréstimos ativos, pendentes ou atrasados deste usuário e liberar os respectivos notebooks
    active_loans = db.query(models.Emprestimo).filter(
        models.Emprestimo.usuario_id == usuario_id,
        models.Emprestimo.status.in_(["Ativo", "Pendente", "Atrasado"])
    ).all()
    for loan in active_loans:
        notebook = db.query(models.Notebook).filter(models.Notebook.id == loan.notebook_id).first()
        if notebook:
            notebook.status = "Disponível"
            notebook.usuario_id = None
            
    # 2. Excluir empréstimos
    db.query(models.Emprestimo).filter(
        (models.Emprestimo.usuario_id == usuario_id) | (models.Emprestimo.responsavel_id == usuario_id)
    ).delete()
    
    # 3. Excluir histórico
    db.query(models.Historico).filter(
        (models.Historico.usuario_id == usuario_id) | (models.Historico.responsavel_id == usuario_id)
    ).delete()
    
    # 4. Excluir reservas
    db.query(models.Reserva).filter(models.Reserva.usuario_id == usuario_id).delete()
    
    # 5. Excluir usuário
    db.delete(user)
    db.commit()
    
    # Atualizar disponibilidade
    stats = crud.get_dashboard_stats(db)
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return {"detail": f"Usuário {user.nome} e todos os seus registros foram excluídos com sucesso"}

@app.patch("/usuarios/{usuario_id}", response_model=schemas.UsuarioResponse)
def update_usuario_route(
    usuario_id: int,
    usuario_update: schemas.UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    email = usuario_update.email.strip().lower() if usuario_update.email is not None else db_usuario.email
    role = usuario_update.role or db_usuario.role
    
    if email:
        if role in ["ti", "professor"]:
            if not email.endswith("@df.senac.br"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuários com perfil de TI ou Professor devem utilizar um e-mail do domínio @df.senac.br"
                )
        elif role == "aluno":
            if not email.endswith("@edu.df.senac.br"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Usuários com perfil de Aluno devem utilizar um e-mail do domínio @edu.df.senac.br"
                )
                
    if usuario_update.email:
        existing_email = crud.get_usuario_by_email(db, email)
        if existing_email and existing_email.id != usuario_id:
            raise HTTPException(status_code=400, detail="Email já cadastrado")
            
    if usuario_update.matricula:
        existing_mat = crud.get_usuario_by_matricula(db, usuario_update.matricula)
        if existing_mat and existing_mat.id != usuario_id:
            raise HTTPException(status_code=400, detail="Matrícula já cadastrada")
            
    return crud.update_usuario(db, usuario_id, usuario_update)

@app.patch("/usuarios/{usuario_id}/remover-turma", response_model=schemas.UsuarioResponse)
def remover_usuario_turma_route(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
    db_usuario.turma = None
    db.commit()
    db.refresh(db_usuario)
    return db_usuario

# ==================== ROTAS DE NOTEBOOKS ====================

@app.get("/notebooks", response_model=List[schemas.NotebookResponse])
def list_notebooks(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    return crud.listar_notebooks(db, status=status, skip=skip, limit=limit)

@app.get("/notebooks/{notebook_id}", response_model=schemas.NotebookResponse)
def get_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    nb = crud.get_notebook(db, notebook_id)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook não encontrado")
    return nb

@app.post("/notebooks", response_model=schemas.NotebookResponse, status_code=status.HTTP_201_CREATED)
def create_notebook(
    notebook: schemas.NotebookCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    if crud.get_notebook_by_patrimonio(db, notebook.patrimonio):
        raise HTTPException(status_code=400, detail="Patrimônio já cadastrado")
    
    return crud.create_notebook(db, notebook, responsavel_id=current_user.id)

@app.patch("/notebooks/{notebook_id}", response_model=schemas.NotebookResponse)
async def update_notebook(
    notebook_id: int,
    notebook_update: schemas.NotebookUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    if notebook_update.status == "Manutenção":
        justificativa = notebook_update.justificativa_manutencao or notebook_update.observacoes
        if not justificativa or not justificativa.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A justificativa de manutenção é obrigatória."
            )
        notebook_update.justificativa_manutencao = justificativa.strip()
        notebook_update.autor_manutencao = f"{current_user.nome} ({current_user.email})"
    elif notebook_update.status and notebook_update.status != "Manutenção":
        notebook_update.justificativa_manutencao = None
        notebook_update.autor_manutencao = None
    
    nb = crud.update_notebook(db, notebook_id, notebook_update, responsavel_id=current_user.id)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook não encontrado")
        
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return nb

@app.post("/notebooks/{notebook_id}/forcar-devolucao")
async def forcar_devolucao(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    notebook = db.query(models.Notebook).filter(
        models.Notebook.id == notebook_id,
        models.Notebook.excluido == False
    ).with_for_update().first()
    
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook não encontrado")
        
    status_anterior = notebook.status
    if status_anterior not in ["Reservado", "Reservado (Em Lote)", "Emprestado"]:
        raise HTTPException(
            status_code=400,
            detail=f"Notebook não está em um estado que permita devolução forçada. Status atual: {status_anterior}"
        )
        
    # Encontrar empréstimo ativo/pendente associado
    loan = db.query(models.Emprestimo).filter(
        models.Emprestimo.notebook_id == notebook_id,
        models.Emprestimo.status.in_(["Pendente", "Reservado", "Ativo", "Atrasado"])
    ).first()
    
    if loan:
        loan.status = "Devolvido"
        loan.data_devolucao = get_brasilia_time()
        loan.responsavel_id = current_user.id
        loan.observacao_devolucao = f"Devolução forçada pela TI (Contingência) por {current_user.nome}"
        
    notebook.status = "Disponível"
    notebook.usuario_id = None
    
    # Registrar no histórico
    db_hist = models.Historico(
        notebook_id=notebook.id,
        usuario_id=loan.usuario_id if loan else None,
        responsavel_id=current_user.id,
        tipo_movimentacao="DEVOLUCAO",
        status_anterior=status_anterior,
        status_novo="Disponível",
        descricao=f"Devolução forçada administrativamente via contingência TI por {current_user.nome}"
    )
    db.add(db_hist)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar transação: {e}")
        
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return {"message": "Notebook liberado com sucesso!", "notebook_status": "Disponível"}

@app.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    notebook = db.query(models.Notebook).filter(
        models.Notebook.id == notebook_id,
        models.Notebook.excluido == False
    ).first()
    
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook não encontrado")
        
    if notebook.status == "Emprestado":
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir o notebook pois ele possui um empréstimo ativo."
        )
        
    active_loan = db.query(models.Emprestimo).filter(
        models.Emprestimo.notebook_id == notebook.id,
        models.Emprestimo.status.in_(["Ativo", "Atrasado"])
    ).first()
    
    if active_loan:
        raise HTTPException(
            status_code=400,
            detail="Não é possível excluir o notebook pois ele possui um empréstimo ativo."
        )
        
    # Soft delete
    notebook.excluido = True
    notebook.status = "Disponível"
    notebook.usuario_id = None
    
    # Cancelar empréstimos pendentes/reservados
    pending_loans = db.query(models.Emprestimo).filter(
        models.Emprestimo.notebook_id == notebook.id,
        models.Emprestimo.status.in_(["Pendente", "Reservado"])
    ).all()
    for loan in pending_loans:
        loan.status = "Cancelado"
        
    db_hist = models.Historico(
        notebook_id=notebook.id,
        responsavel_id=current_user.id,
        tipo_movimentacao="CANCELAMENTO",
        status_anterior=notebook.status,
        status_novo="Excluído",
        descricao=f"Notebook excluído logicamente (Soft Delete) por {current_user.nome}"
    )
    db.add(db_hist)
    
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao processar exclusão: {e}")
        
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# ==================== ROTAS DE EMPRÉSTIMOS ====================

@app.get("/emprestimos", response_model=List[schemas.EmprestimoResponse])
def list_emprestimos(
    status: Optional[str] = None,
    usuario_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    if current_user.role == "aluno":
        return crud.listar_emprestimos(db, status=status, usuario_id=current_user.id, skip=skip, limit=limit)
        
    elif current_user.role == "professor":
        prof_turmas = db.query(models.Turma).filter(models.Turma.instrutor == current_user.nome).all()
        turma_map = {t.codigo_turma: t.regime_dias for t in prof_turmas}
        
        query = db.query(models.Emprestimo).join(models.Usuario, models.Emprestimo.usuario_id == models.Usuario.id).options(
            joinedload(models.Emprestimo.notebook),
            joinedload(models.Emprestimo.usuario),
            joinedload(models.Emprestimo.responsavel)
        ).filter(models.Usuario.turma.in_(list(turma_map.keys())))
        
        if status:
            query = query.filter(models.Emprestimo.status == status)
            
        loans = query.order_by(models.Emprestimo.data_emprestimo.desc()).all()
        
        def date_matches_regime(dt: datetime, regime_dias: str) -> bool:
            regime = regime_dias.lower()
            wd = dt.weekday()
            if wd == 0 and "2ª" in regime: return True
            if wd == 1 and "3ª" in regime: return True
            if wd == 2 and "4ª" in regime: return True
            if wd == 3 and "5ª" in regime: return True
            if wd == 4 and ("6ª" in regime or "sexta" in regime): return True
            if wd == 5 and ("sabado" in regime or "sábado" in regime): return True
            if wd == 6 and "domingo" in regime: return True
            return False
            
        filtered = []
        for emp in loans:
            regime = turma_map.get(emp.usuario.turma)
            if regime and date_matches_regime(emp.data_emprestimo, regime):
                filtered.append(emp)
                
        return filtered[skip : skip + limit]
        
    return crud.listar_emprestimos(db, status=status, usuario_id=usuario_id, skip=skip, limit=limit)

@app.get("/emprestimos/{emprestimo_id}", response_model=schemas.EmprestimoResponse)
def get_emprestimo(
    emprestimo_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    emp = crud.get_emprestimo(db, emprestimo_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    if current_user.role == "aluno" and emp.usuario_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    return emp

@app.post("/emprestimos", response_model=schemas.EmprestimoResponse, status_code=status.HTTP_201_CREATED)
async def create_emprestimo(
    emprestimo: schemas.EmprestimoCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    # Limpar atrasados antes
    crud.verificar_atrasos(db)
    
    try:
        result = crud.criar_emprestimo(db, emprestimo, responsavel_id=current_user.id)
        
        # Eagerly load fields to prevent DetachedInstanceError in background task
        patrimonio = result.notebook.patrimonio if result.notebook else ""
        usuario_nome = result.usuario.nome if result.usuario else ""
        
        # Broadcast via WebSocket
        stats = crud.get_dashboard_stats(db)
        await_any = broadcast_disponibilidade(stats.__dict__)
        import asyncio
        asyncio.create_task(await_any)
        asyncio.create_task(broadcast_emprestimo_realizado({
            "id": result.id,
            "notebook_patrimonio": patrimonio,
            "usuario_nome": usuario_nome,
            "status": result.status
        }))
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))




@app.post("/emprestimos/rapido", response_model=schemas.EmprestimoResponse, status_code=status.HTTP_201_CREATED)
async def create_emprestimo_rapido(
    dados: schemas.EmprestimoRapido,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor", "aluno"])(current_user)
    
    if current_user.role == "aluno":
        if dados.usuario_matricula != current_user.matricula:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Alunos só podem realizar empréstimo para si mesmos"
            )
            
    crud.verificar_atrasos(db)
    
    try:
        result = crud.criar_emprestimo_rapido(db, dados, responsavel_id=current_user.id)
        
        # Eagerly load fields to prevent DetachedInstanceError in background task
        patrimonio = result.notebook.patrimonio if result.notebook else ""
        usuario_nome = result.usuario.nome if result.usuario else ""
        
        stats = crud.get_dashboard_stats(db)
        import asyncio
        asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
        asyncio.create_task(broadcast_emprestimo_realizado({
            "id": result.id,
            "notebook_patrimonio": patrimonio,
            "usuario_nome": usuario_nome,
            "status": result.status
        }))
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emprestimos/lote/{turma_id}")
async def create_emprestimos_lote(
    turma_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    import json
    
    # 1. Verificar se a turma existe
    turma = db.query(models.Turma).filter(models.Turma.codigo_turma == turma_id).first()
    if not turma:
        raise HTTPException(status_code=404, detail=f"Turma {turma_id} não encontrada")
        
    # 2. Obter alunos ativos da turma
    alunos = db.query(models.Usuario).filter(
        models.Usuario.turma == turma_id,
        models.Usuario.role == "aluno",
        models.Usuario.ativo == True
    ).all()
    
    if not alunos:
        return {
            "message": "Nenhum aluno ativo matriculado nesta turma.",
            "alocados": [],
            "nao_alocados": [],
            "ja_alocados": []
        }
        
    # 3. Filtrar alunos que já têm empréstimo ativo
    alunos_precisam = []
    alunos_ja_com_notebook = []
    for aluno in alunos:
        emp_ativo = db.query(models.Emprestimo).filter(
            models.Emprestimo.usuario_id == aluno.id,
            models.Emprestimo.status.in_(["Ativo", "Atrasado"])
        ).first()
        if emp_ativo:
            alunos_ja_com_notebook.append({
                "usuario_id": aluno.id,
                "nome": aluno.nome,
                "matricula": aluno.matricula,
                "notebook_patrimonio": emp_ativo.notebook.patrimonio if emp_ativo.notebook else "N/A"
            })
        else:
            alunos_precisam.append(aluno)
            
    # 4. Buscar notebooks disponíveis
    notebooks_disponiveis = db.query(models.Notebook).filter(
        models.Notebook.status == "Disponível"
    ).with_for_update().all()
    
    alocados = []
    nao_alocados = []
    
    idx_nb = 0
    num_nbs = len(notebooks_disponiveis)
    
    try:
        for aluno in alunos_precisam:
            if idx_nb < num_nbs:
                notebook = notebooks_disponiveis[idx_nb]
                idx_nb += 1
                
                # Criar empréstimo pré-alocado
                data_prevista = get_brasilia_time() + timedelta(hours=4)
                db_emp = models.Emprestimo(
                    notebook_id=notebook.id,
                    usuario_id=aluno.id,
                    responsavel_id=current_user.id,
                    data_prevista_devolucao=data_prevista,
                    status="Reservado",
                    observacao_saida="Pré-alocado (Aguardando Confirmação Aluno)",
                    motivo="Alocação em Lote"
                )
                notebook.status = "Reservado"
                notebook.usuario_id = aluno.id
                db.add(db_emp)
                db.flush()
                
                # Logs de Auditoria para Pedro Costa
                if aluno.email == "pedro.costa@edu.df.senac.br" or aluno.matricula == "ALU003":
                    print(f"\n--- [AUDITORIA - PEDRO COSTA] ---")
                    print(f"Ação: Alocação em Lote criada para {aluno.nome} ({aluno.email})")
                    print(f"Notebook: {notebook.patrimonio} ({notebook.modelo})")
                    print(f"Status do Empréstimo: Reservado")
                    print(f"Status do Ativo: Reservado")
                    print(f"---------------------------------\n")
                
                # Registrar no histórico
                db_hist = models.Historico(
                    notebook_id=notebook.id,
                    usuario_id=aluno.id,
                    responsavel_id=current_user.id,
                    tipo_movimentacao="EMPRESTIMO",
                    status_anterior="Disponível",
                    status_novo="Reservado",
                    descricao=f"Pré-alocação em lote para aluno {aluno.nome}",
                    informacoes_adicionais=json.dumps({"emprestimo_id": db_emp.id, "batch": True})
                )
                db.add(db_hist)
                
                alocados.append({
                    "usuario_id": aluno.id,
                    "nome": aluno.nome,
                    "matricula": aluno.matricula,
                    "notebook_patrimonio": notebook.patrimonio
                })
            else:
                # Sem notebook disponível para este aluno!
                # Vamos carregar o histórico anterior
                historico_registros = db.query(models.Historico).filter(
                    models.Historico.usuario_id == aluno.id,
                    models.Historico.tipo_movimentacao == "EMPRESTIMO"
                ).order_by(models.Historico.created_at.desc()).limit(5).all()
                
                hist_aluno = []
                for h in historico_registros:
                    hist_aluno.append({
                        "patrimonio": h.notebook.patrimonio if h.notebook else "N/A",
                        "modelo": h.notebook.modelo if h.notebook else "N/A",
                        "data": h.created_at.strftime('%d/%m/%Y %H:%M')
                    })
                    
                nao_alocados.append({
                    "usuario_id": aluno.id,
                    "nome": aluno.nome,
                    "matricula": aluno.matricula,
                    "motivo": "Sem notebook disponível hoje",
                    "historico": hist_aluno
                })
                
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao alocar empréstimos em lote: {str(e)}"
        )
        
    # WebSocket Broadcast
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return {
        "message": f"Processamento concluído. {len(alocados)} notebooks alocados, {len(nao_alocados)} alunos sem dispositivo.",
        "alocados": alocados,
        "nao_alocados": nao_alocados,
        "ja_alocados": alunos_ja_com_notebook
    }

@app.post("/emprestimos/{emprestimo_id}/confirmar")
async def confirmar_emprestimo(
    emprestimo_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["aluno", "ti", "professor"])(current_user)
    
    emp = db.query(models.Emprestimo).filter(models.Emprestimo.id == emprestimo_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
        
    if current_user.role == "aluno" and emp.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode confirmar retiradas associadas à sua conta"
        )
        
    # Verificar se já está confirmado
    if emp.status not in ["Pendente", "Reservado"]:
        return {"message": "Este empréstimo já foi confirmado ou não necessita de confirmação."}
        
    if emp.usuario and (emp.usuario.email == "pedro.costa@edu.df.senac.br" or emp.usuario.matricula == "ALU003"):
        print(f"\n--- [AUDITORIA - PEDRO COSTA] ---")
        print(f"Ação: Confirmação de Retirada realizada por/para {emp.usuario.nome} ({emp.usuario.email})")
        print(f"Notebook: {emp.notebook.patrimonio if emp.notebook else 'N/A'}")
        print(f"Status do Empréstimo: {emp.status} -> Ativo")
        print(f"Status do Ativo: {emp.notebook.status if emp.notebook else 'N/A'} -> Emprestado")
        print(f"---------------------------------\n")

    emp.status = "Ativo"
    emp.observacao_saida = "Retirada Confirmada pelo Aluno"
    emp.data_emprestimo = get_brasilia_time()
    
    # Atualizar status do notebook e vincular usuario_id
    if emp.notebook:
        emp.notebook.status = "Emprestado"
        emp.notebook.usuario_id = emp.usuario_id
        
    # Registrar no histórico
    crud.registrar_historico(db, schemas.HistoricoCreate(
        notebook_id=emp.notebook_id,
        usuario_id=emp.usuario_id,
        responsavel_id=current_user.id,
        tipo_movimentacao=schemas.TipoMovimentacao.atualizacao,
        descricao=f"Aluno {emp.usuario.nome} confirmou a retirada física do notebook {emp.notebook.patrimonio if emp.notebook else 'N/A'}"
    ))
    
    db.commit()
    db.refresh(emp)
    
    # Broadcast
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    # Também broadcast do empréstimo realizado para atualizar painéis de TI
    try:
        from websocket import broadcast_emprestimo_realizado
        asyncio.create_task(broadcast_emprestimo_realizado({
            "id": emp.id,
            "usuario_nome": emp.usuario.nome if emp.usuario else "N/A",
            "notebook_patrimonio": emp.notebook.patrimonio if emp.notebook else "N/A",
            "status": emp.status
        }))
    except Exception as e:
        print(f"Erro ao transmitir broadcast: {e}")
        
    return {"message": "Retirada física confirmada com sucesso!", "emprestimo": emp}

@app.post("/emprestimos/{emprestimo_id}/devolver")
async def devolver_emprestimo(
    emprestimo_id: int,
    dados: schemas.EmprestimoDevolucao,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    try:
        result = crud.registrar_devolucao(db, emprestimo_id, dados, responsavel_id=current_user.id)
        
        # Eagerly load fields to prevent DetachedInstanceError in background task
        patrimonio = result.notebook.patrimonio if result.notebook else ""
        usuario_nome = result.usuario.nome if result.usuario else ""
        
        stats = crud.get_dashboard_stats(db)
        import asyncio
        asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
        asyncio.create_task(broadcast_devolucao_realizada({
            "id": result.id,
            "notebook_patrimonio": patrimonio,
            "usuario_nome": usuario_nome
        }))
        
        return {"message": "Devolução registrada com sucesso", "emprestimo": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/emprestimos/{emprestimo_id}/cancelar")
async def cancelar_emprestimo(
    emprestimo_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    try:
        result = crud.cancelar_emprestimo(db, emprestimo_id, responsavel_id=current_user.id)
        
        stats = crud.get_dashboard_stats(db)
        import asyncio
        asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
        
        return {"message": "Empréstimo cancelado com sucesso", "emprestimo": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== ROTAS DE HISTÓRICO ====================

@app.get("/historico", response_model=List[schemas.HistoricoResponse])
def list_historico(
    notebook_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor", "aluno"])(current_user)
    
    if current_user.role == "aluno":
        return crud.get_historico(db, notebook_id=notebook_id, usuario_id=current_user.id, skip=skip, limit=limit)
        
    elif current_user.role == "professor":
        prof_turmas = db.query(models.Turma).filter(models.Turma.instrutor == current_user.nome).all()
        turma_map = {t.codigo_turma: t.regime_dias for t in prof_turmas}
        
        query = db.query(models.Historico).join(models.Usuario, models.Historico.usuario_id == models.Usuario.id).options(
            joinedload(models.Historico.notebook),
            joinedload(models.Historico.usuario),
            joinedload(models.Historico.responsavel)
        ).filter(models.Usuario.turma.in_(list(turma_map.keys())))
        
        if notebook_id:
            query = query.filter(models.Historico.notebook_id == notebook_id)
        if usuario_id:
            query = query.filter(models.Historico.usuario_id == usuario_id)
            
        records = query.order_by(models.Historico.created_at.desc()).all()
        
        def date_matches_regime(dt: datetime, regime_dias: str) -> bool:
            regime = regime_dias.lower()
            wd = dt.weekday()
            if wd == 0 and "2ª" in regime: return True
            if wd == 1 and "3ª" in regime: return True
            if wd == 2 and "4ª" in regime: return True
            if wd == 3 and "5ª" in regime: return True
            if wd == 4 and ("6ª" in regime or "sexta" in regime): return True
            if wd == 5 and ("sabado" in regime or "sábado" in regime): return True
            if wd == 6 and "domingo" in regime: return True
            return False
            
        filtered = []
        for h in records:
            regime = turma_map.get(h.usuario.turma)
            if regime and date_matches_regime(h.created_at, regime):
                filtered.append(h)
                
        return filtered[skip : skip + limit]
        
    return crud.get_historico(db, notebook_id=notebook_id, usuario_id=usuario_id, skip=skip, limit=limit)

@app.get("/historico/notebook/{notebook_id}", response_model=List[schemas.HistoricoResponse])
def get_historico_notebook(
    notebook_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    return crud.get_historico(db, notebook_id=notebook_id)

# ==================== ROTAS DE TURMAS E RESERVAS ====================

@app.get("/turmas", response_model=List[schemas.TurmaResponse])
def list_turmas(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    db_turmas = db.query(models.Turma).all()
    return [
        schemas.TurmaResponse(
            id=t.codigo_turma,
            curso=t.nome_curso,
            instrutor=t.instrutor,
            carga_horaria=t.carga_horaria,
            turno=t.turno,
            regime_dias=t.regime_dias
        )
        for t in db_turmas
    ]

@app.post("/turmas", response_model=schemas.TurmaResponse, status_code=status.HTTP_201_CREATED)
def create_turma(
    turma: schemas.TurmaCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    db_turma = db.query(models.Turma).filter(models.Turma.codigo_turma == turma.codigo_turma).first()
    if db_turma:
        raise HTTPException(status_code=400, detail="Turma com este código já existe")
        
    db_turma = models.Turma(
        codigo_turma=turma.codigo_turma,
        nome_curso=turma.nome_curso,
        instrutor=turma.instrutor,
        carga_horaria=turma.carga_horaria,
        turno=turma.turno,
        regime_dias=turma.regime_dias
    )
    db.add(db_turma)
    db.commit()
    db.refresh(db_turma)
    
    return schemas.TurmaResponse(
        id=db_turma.codigo_turma,
        curso=db_turma.nome_curso,
        instrutor=db_turma.instrutor,
        carga_horaria=db_turma.carga_horaria,
        turno=db_turma.turno,
        regime_dias=db_turma.regime_dias
    )

@app.patch("/turmas/{codigo_turma}", response_model=schemas.TurmaResponse)
def update_turma(
    codigo_turma: str,
    turma_update: schemas.TurmaUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    db_turma = db.query(models.Turma).filter(models.Turma.codigo_turma == codigo_turma).first()
    if not db_turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
        
    update_data = turma_update.model_dump(exclude_unset=True)
    if "nome_curso" in update_data:
        db_turma.nome_curso = update_data["nome_curso"]
    if "instrutor" in update_data:
        db_turma.instrutor = update_data["instrutor"]
    if "carga_horaria" in update_data:
        db_turma.carga_horaria = update_data["carga_horaria"]
    if "turno" in update_data:
        db_turma.turno = update_data["turno"]
    if "regime_dias" in update_data:
        db_turma.regime_dias = update_data["regime_dias"]
        
    db.commit()
    db.refresh(db_turma)
    
    return schemas.TurmaResponse(
        id=db_turma.codigo_turma,
        curso=db_turma.nome_curso,
        instrutor=db_turma.instrutor,
        carga_horaria=db_turma.carga_horaria,
        turno=db_turma.turno,
        regime_dias=db_turma.regime_dias
    )

@app.delete("/turmas/{codigo_turma}", status_code=status.HTTP_204_NO_CONTENT)
def delete_turma(
    codigo_turma: str,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    db_turma = db.query(models.Turma).filter(models.Turma.codigo_turma == codigo_turma).first()
    if not db_turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
        
    # Deletar reservas associadas primeiro
    db.query(models.Reserva).filter(models.Reserva.turma_id == codigo_turma).delete()
    
    db.delete(db_turma)
    db.commit()
    return None

@app.get("/reservas", response_model=List[schemas.ReservaResponse])
def list_reservas(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    db_reservas = db.query(models.Reserva).all()
    return [
        schemas.ReservaResponse(
            id=r.id,
            turma=r.turma_id,
            data=r.data,
            turno=r.turno,
            quantidade=r.quantidade,
            status=r.status,
            usuario=r.usuario
        )
        for r in db_reservas
    ]

@app.post("/reservas", response_model=schemas.ReservaResponse, status_code=status.HTTP_201_CREATED)
async def create_reserva(
    reserva: schemas.ReservaCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    import json
    
    turma_exists = db.query(models.Turma).filter(models.Turma.codigo_turma == reserva.turmaId).first()
    if not turma_exists:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
        
    try:
        # 1. Buscar notebooks disponíveis na transação com bloqueio
        notebooks_disponiveis = db.query(models.Notebook).filter(
            models.Notebook.status == "Disponível"
        ).with_for_update().limit(reserva.quantidade).all()
        
        if len(notebooks_disponiveis) < reserva.quantidade:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantidade solicitada de notebooks não disponível em estoque."
            )
            
        # 2. Obter alunos ativos da turma
        alunos = db.query(models.Usuario).filter(
            models.Usuario.turma == reserva.turmaId,
            models.Usuario.role == "aluno",
            models.Usuario.ativo == True
        ).all()
        
        # 3. Criar registro de Reserva (Alocado / Pronto para Retirada)
        db_reserva = models.Reserva(
            turma_id=reserva.turmaId,
            data=reserva.data,
            turno=reserva.turno,
            quantidade=reserva.quantidade,
            status="Alocado / Pronto para Retirada",
            usuario_id=current_user.id
        )
        db.add(db_reserva)
        db.flush()
        
        # 4. Vincular notebooks aos alunos
        data_prevista = get_brasilia_time() + timedelta(hours=4)
        for i, notebook in enumerate(notebooks_disponiveis):
            notebook.status = "Reservado"
            
            if i < len(alunos):
                aluno = alunos[i]
                notebook.usuario_id = aluno.id
                
                # Criar empréstimo pendente
                db_emp = models.Emprestimo(
                    notebook_id=notebook.id,
                    usuario_id=aluno.id,
                    responsavel_id=current_user.id,
                    data_prevista_devolucao=data_prevista,
                    status="Reservado",
                    observacao_saida="Reserva em Lote - Aguardando Confirmação",
                    motivo="Reserva em Lote"
                )
                db.add(db_emp)
                db.flush()
                
                # Logs de Auditoria para Pedro Costa
                if aluno.email == "pedro.costa@edu.df.senac.br" or aluno.matricula == "ALU003":
                    print(f"\n--- [AUDITORIA - PEDRO COSTA] ---")
                    print(f"Ação: Reserva Manual criada para {aluno.nome} ({aluno.email})")
                    print(f"Notebook: {notebook.patrimonio} ({notebook.modelo})")
                    print(f"Status do Empréstimo: Reservado")
                    print(f"Status do Ativo: Reservado")
                    print(f"---------------------------------\n")
                
                # Histórico
                db_hist = models.Historico(
                    notebook_id=notebook.id,
                    usuario_id=aluno.id,
                    responsavel_id=current_user.id,
                    tipo_movimentacao="EMPRESTIMO",
                    status_anterior="Disponível",
                    status_novo="Reservado",
                    descricao=f"Reserva em Lote para aluno {aluno.nome} (Reserva ID: {db_reserva.id})",
                    informacoes_adicionais=json.dumps({"reserva_id": db_reserva.id, "batch": True})
                )
                db.add(db_hist)
            else:
                # Notebook extra reservado para a turma
                db_hist = models.Historico(
                    notebook_id=notebook.id,
                    responsavel_id=current_user.id,
                    tipo_movimentacao="RESERVA",
                    status_anterior="Disponível",
                    status_novo="Reservado",
                    descricao=f"Notebook reservado em lote para a turma {reserva.turmaId} (extra, Reserva ID: {db_reserva.id})"
                )
                db.add(db_hist)
                
        db.commit()
        db.refresh(db_reserva)
    except HTTPException as he:
        db.rollback()
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar reserva em lote: {str(e)}"
        )
        
    # Broadcast availability updates
    stats = crud.get_dashboard_stats(db)
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return schemas.ReservaResponse(
        id=db_reserva.id,
        turma=db_reserva.turma_id,
        data=db_reserva.data,
        turno=db_reserva.turno,
        quantidade=db_reserva.quantidade,
        status=db_reserva.status,
        usuario=db_reserva.usuario
    )

@app.patch("/reservas/{reserva_id}", response_model=schemas.ReservaResponse)
async def update_reserva(
    reserva_id: int,
    reserva_update: schemas.ReservaUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    db_reserva = db.query(models.Reserva).filter(models.Reserva.id == reserva_id).first()
    if not db_reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
    update_data = reserva_update.model_dump(exclude_unset=True)
    if "turmaId" in update_data:
        turma_exists = db.query(models.Turma).filter(models.Turma.codigo_turma == update_data["turmaId"]).first()
        if not turma_exists:
            raise HTTPException(status_code=404, detail="Turma não encontrada")
        db_reserva.turma_id = update_data["turmaId"]
        
    if "data" in update_data:
        db_reserva.data = update_data["data"]
    if "turno" in update_data:
        db_reserva.turno = update_data["turno"]
    if "quantidade" in update_data:
        db_reserva.quantidade = update_data["quantidade"]
    if "status" in update_data:
        db_reserva.status = update_data["status"]
        
    db.commit()
    db.refresh(db_reserva)
    
    # Broadcast availability updates
    stats = crud.get_dashboard_stats(db)
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return schemas.ReservaResponse(
        id=db_reserva.id,
        turma=db_reserva.turma_id,
        data=db_reserva.data,
        turno=db_reserva.turno,
        quantidade=db_reserva.quantidade,
        status=db_reserva.status,
        usuario=db_reserva.usuario
    )

@app.delete("/reservas/{reserva_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    db_reserva = db.query(models.Reserva).filter(models.Reserva.id == reserva_id).first()
    if not db_reserva:
        raise HTTPException(status_code=404, detail="Reserva não encontrada")
        
    db.delete(db_reserva)
    db.commit()
    
    # Broadcast availability updates
    stats = crud.get_dashboard_stats(db)
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ==================== ROTAS DE DASHBOARD ====================

@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def get_dashboard(db: Session = Depends(get_db)):
    crud.verificar_atrasos(db)
    return crud.get_dashboard_stats(db)

@app.get("/dashboard/alerta-escassez", response_model=schemas.AlertaEscassez)
def get_alerta_escassez(db: Session = Depends(get_db)):
    alerta = verificar_alerta_escassez_sync(db)
    return schemas.AlertaEscassez(**alerta)

@app.get("/dashboard/emprestimos-atrasados")
def get_emprestimos_atrasados(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    atrasados = crud.listar_emprestimos(db, status="Atrasado")
    return {"count": len(atrasados), "emprestimos": atrasados}

@app.get("/dashboard/ti")
def get_dashboard_ti_route(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    crud.verificar_atrasos(db)
    stats = crud.get_dashboard_stats(db)
    
    # Count of delayed loans
    atrasados_count = db.query(models.Emprestimo).filter(models.Emprestimo.status == "Atrasado").count()
    
    # Count of notebooks sent to maintenance today
    today_start = get_brasilia_time().replace(hour=0, minute=0, second=0, microsecond=0)
    manutencao_hoje_count = db.query(models.Historico).filter(
        models.Historico.status_novo == "Manutenção",
        models.Historico.created_at >= today_start
    ).count()
    
    # Count of unique classes with reservations today
    today_str = get_brasilia_time().strftime("%Y-%m-%d")
    alocacoes_hoje = db.query(models.Reserva.turma_id).filter(
        models.Reserva.data == today_str
    ).distinct().count()
    
    # Total users in the system
    total_usuarios = db.query(models.Usuario).filter(models.Usuario.ativo == True).count()
    
    return {
        "notebooksTotais": stats.total,
        "notebooksDisponiveis": stats.disponiveis,
        "notebooksEmUso": stats.emprestados,
        "notebooksManutencao": stats.manutencao,
        "reservasHoje": stats.reservados,
        "solicitacoesPendentes": stats.emprestimos_ativos,
        "percentualDisponivel": stats.percentual_disponivel,
        "alerta_escassez": stats.alerta_escassez,
        "atrasadosCount": atrasados_count,
        "manutencaoHojeCount": manutencao_hoje_count,
        "alocacoesHoje": alocacoes_hoje,
        "totalUsuarios": total_usuarios,
    }

@app.get("/dashboard/aluno")
def get_dashboard_aluno_route(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["aluno", "ti"])(current_user)
    
    emp = db.query(models.Emprestimo).join(
        models.Usuario, models.Emprestimo.usuario_id == models.Usuario.id
    ).join(
        models.Notebook, models.Emprestimo.notebook_id == models.Notebook.id
    ).options(
        joinedload(models.Emprestimo.notebook)
    ).filter(
        models.Usuario.id == current_user.id,
        models.Emprestimo.status.in_(["Pendente", "Reservado", "Aguardando Retirada", "Ativo", "Atrasado"])
    ).first()
    
    if current_user.email == "pedro.costa@edu.df.senac.br" or current_user.matricula == "ALU003":
        print(f"\n--- [AUDITORIA - PEDRO COSTA] ---")
        print(f"Ação: Busca do dashboard (/dashboard/aluno) por {current_user.nome} ({current_user.email})")
        if emp:
            print(f"Empréstimo Ativo/Reservado encontrado: ID {emp.id}")
            print(f"Status do Empréstimo: {emp.status}")
            print(f"Notebook: {emp.notebook.patrimonio if emp.notebook else 'N/A'} ({emp.notebook.modelo if emp.notebook else 'N/A'})")
        else:
            print("Nenhum empréstimo ativo/reservado encontrado.")
        print(f"---------------------------------\n")
        
    reserva_atual = None
    sem_disponibilidade_hoje = False
    historico_anterior = []
    
    if emp:
        confirmacao_pendente = emp.status in ["Pendente", "Reservado", "Aguardando Retirada"]
        status_label = "Notebook Disponível" if confirmacao_pendente else ("Em uso" if emp.status == "Ativo" else "Atrasado")
        
        is_masked = emp.status == "Pendente"
        patr_val = "******" if is_masked else (emp.notebook.patrimonio if emp.notebook else "N/A")
        
        reserva_atual = {
            "id": emp.id,
            "notebook_id": emp.notebook.id if emp.notebook else None,
            "patrimonio": patr_val,
            "modelo": emp.notebook.modelo if emp.notebook else "N/A",
            "marca": emp.notebook.marca if emp.notebook else "N/A",
            "condicao": emp.notebook.condicao if emp.notebook else "Bom",
            "observacoes": emp.notebook.observacoes if emp.notebook else "",
            "equipamento": f"Notebook - {patr_val} ({emp.notebook.modelo})" if emp.notebook else "Notebook",
            "horario": f"Retirado em {emp.data_emprestimo.strftime('%d/%m/%Y %H:%M')}" if emp.data_emprestimo else "Data pendente",
            "status": status_label,
            "confirmacaoPendente": confirmacao_pendente
        }
    else:
        # Se não há empréstimo, verificar se havia reserva da turma hoje (gerando déficit de estoque para o aluno)
        today_str = get_brasilia_time().strftime("%Y-%m-%d")
        reserva_hoje = db.query(models.Reserva).filter(
            models.Reserva.turma_id == current_user.turma,
            models.Reserva.data == today_str
        ).first()
        
        if reserva_hoje:
            sem_disponibilidade_hoje = True
            
    # Buscar histórico de notebooks utilizados (finalizados/devolvidos) incondicionalmente
    historicos = db.query(models.Emprestimo).options(
        joinedload(models.Emprestimo.notebook)
    ).filter(
        models.Emprestimo.usuario_id == current_user.id,
        models.Emprestimo.status == "Devolvido"
    ).order_by(models.Emprestimo.data_devolucao.desc()).limit(10).all()
    
    for h in historicos:
        historico_anterior.append({
            "id": h.id,
            "patrimonio": h.notebook.patrimonio if h.notebook else "N/A",
            "modelo": h.notebook.modelo if h.notebook else "N/A",
            "data": h.data_devolucao.strftime('%d/%m/%Y %H:%M') if h.data_devolucao else (h.data_emprestimo.strftime('%d/%m/%Y %H:%M') if h.data_emprestimo else "N/A")
        })
        
    db_turmas = db.query(models.Turma).filter(models.Turma.codigo_turma == current_user.turma).all()
    proximas_aulas = []
    for t in db_turmas:
        proximas_aulas.append({
            "id": t.codigo_turma,
            "curso": t.nome_curso,
            "data": t.regime_dias,
            "turno": t.turno
        })
        
    return {
        "reservaAtual": reserva_atual,
        "proximasAulas": proximas_aulas,
        "semDisponibilidadeHoje": sem_disponibilidade_hoje,
        "historicoAnterior": historico_anterior
    }

@app.get("/dashboard/professor")
def get_dashboard_professor_route(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["professor", "ti"])(current_user)
    
    prof_turmas = db.query(models.Turma).filter(models.Turma.instrutor == current_user.nome).all()
    turma_ids = [t.codigo_turma for t in prof_turmas]
    
    today_str = get_brasilia_time().strftime("%Y-%m-%d")
    
    def date_matches_regime(dt: datetime, regime_dias: str) -> bool:
        regime = regime_dias.lower()
        wd = dt.weekday()
        if wd == 0 and "2ª" in regime: return True
        if wd == 1 and "3ª" in regime: return True
        if wd == 2 and "4ª" in regime: return True
        if wd == 3 and "5ª" in regime: return True
        if wd == 4 and ("6ª" in regime or "sexta" in regime): return True
        if wd == 5 and ("sabado" in regime or "sábado" in regime): return True
        if wd == 6 and "domingo" in regime: return True
        return False
        
    now_dt = get_brasilia_time()
    turmas_hoje = sum(1 for t in prof_turmas if date_matches_regime(now_dt, t.regime_dias))
    
    reservas_hoje = db.query(models.Reserva).filter(
        models.Reserva.turma_id.in_(turma_ids),
        models.Reserva.data == today_str
    ).all()
    reservas_ativas = sum(r.quantidade for r in reservas_hoje)
    
    active_loans_count = db.query(models.Emprestimo).join(
        models.Usuario, models.Emprestimo.usuario_id == models.Usuario.id
    ).filter(
        models.Usuario.turma.in_(turma_ids),
        models.Emprestimo.status.in_(["Ativo", "Atrasado"])
    ).count()
    
    alunos_aguardando = max(0, reservas_ativas - active_loans_count)
    
    db_reservas = db.query(models.Reserva).filter(models.Reserva.turma_id.in_(turma_ids)).all()
    lotes = []
    for r in db_reservas:
        lotes.append({
            "id": r.id,
            "turma": r.turma_id,
            "data": r.data,
            "turno": r.turno,
            "quantidade": r.quantidade,
            "status": r.status
        })
        
    return {
        "turmasHoje": turmas_hoje,
        "reservasAtivas": reservas_ativas,
        "alunosAguardandoNotebook": alunos_aguardando,
        "lotes": lotes
    }

# ==================== ROTAS DE IA PREDITIVA ====================

@app.get("/ia/insights")
def get_ia_insights(
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    from collections import Counter, defaultdict
    from datetime import timedelta
    
    hoje = get_brasilia_time()
    insights = []
    
    # === 1. Previsão de alta demanda por dia da semana ===
    # Analisa empréstimos dos últimos 60 dias por dia da semana
    data_limite = hoje - timedelta(days=60)
    emprestimos_recentes = db.query(models.Emprestimo).filter(
        models.Emprestimo.data_emprestimo >= data_limite
    ).all()
    
    dias_semana_nomes = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]
    contagem_por_dia = Counter()
    for emp in emprestimos_recentes:
        if emp.data_emprestimo:
            dia = emp.data_emprestimo.weekday()
            contagem_por_dia[dia] += 1
    
    if contagem_por_dia:
        dia_pico = contagem_por_dia.most_common(1)[0][0]
        total_pico = contagem_por_dia[dia_pico]
        insights.append({
            "tipo": "previsao_demanda",
            "icone": "trending-up",
            "titulo": f"Alta Demanda Prevista: {dias_semana_nomes[dia_pico]}s",
            "descricao": f"Com base nos últimos 60 dias, {dias_semana_nomes[dia_pico]}s concentram o maior volume de empréstimos ({total_pico} retiradas). Prepare o estoque para esse dia.",
            "prioridade": "alta" if total_pico > 5 else "media"
        })
    
    # === 2. Turmas com maior consumo de notebooks ===
    turma_consumo = defaultdict(int)
    for emp in emprestimos_recentes:
        if emp.usuario and emp.usuario.turma:
            turma_consumo[emp.usuario.turma] += 1
    
    if turma_consumo:
        top_turma = max(turma_consumo, key=turma_consumo.get)
        top_count = turma_consumo[top_turma]
        turma_info = db.query(models.Turma).filter(models.Turma.codigo_turma == top_turma).first()
        nome_turma = f"{top_turma} - {turma_info.nome_curso}" if turma_info else top_turma
        insights.append({
            "tipo": "turma_alta_demanda",
            "icone": "users",
            "titulo": f"Turma com Maior Consumo: {top_turma}",
            "descricao": f"{nome_turma} realizou {top_count} empréstimos nos últimos 60 dias. Considere reservar notebooks dedicados para esta turma.",
            "prioridade": "media"
        })
    
    # === 3. Taxa de avaria elevada por modelo ===
    notebooks_manutencao = db.query(models.Notebook).filter(
        models.Notebook.status == "Manutenção"
    ).all()
    
    avaria_por_modelo = Counter(nb.modelo for nb in notebooks_manutencao)
    total_por_modelo = Counter()
    for nb in db.query(models.Notebook).all():
        total_por_modelo[nb.modelo] += 1
    
    for modelo, qtd_avaria in avaria_por_modelo.most_common(3):
        total = total_por_modelo.get(modelo, 1)
        taxa = (qtd_avaria / total) * 100
        if taxa >= 20:  # Alerta se 20%+ do modelo em manutenção
            insights.append({
                "tipo": "alerta_avaria",
                "icone": "warning",
                "titulo": f"Taxa de Avaria Elevada: {modelo}",
                "descricao": f"{qtd_avaria} de {total} notebooks {modelo} estão em manutenção ({taxa:.0f}%). Avalie contato com fornecedor ou substituição do modelo.",
                "prioridade": "critica" if taxa >= 40 else "alta"
            })
    
    # === 4. Notebooks ociosos (disponíveis há mais de 30 dias sem uso) ===
    data_30_dias = hoje - timedelta(days=30)
    notebooks_disponiveis = db.query(models.Notebook).filter(
        models.Notebook.status == "Disponível"
    ).all()
    
    notebooks_ids_disponiveis = [nb.id for nb in notebooks_disponiveis]
    notebooks_usados_recentemente = db.query(models.Historico.notebook_id).filter(
        models.Historico.notebook_id.in_(notebooks_ids_disponiveis),
        models.Historico.tipo_movimentacao.in_(["EMPRESTIMO", "DEVOLUCAO"]),
        models.Historico.created_at >= data_30_dias
    ).distinct().all()
    ids_usados = {r[0] for r in notebooks_usados_recentemente}
    ociosos = [nb for nb in notebooks_disponiveis if nb.id not in ids_usados]
    
    if len(ociosos) > 5:
        insights.append({
            "tipo": "notebooks_ociosos",
            "icone": "package",
            "titulo": f"{len(ociosos)} Notebooks Sem Uso Recente",
            "descricao": f"{len(ociosos)} notebooks disponíveis não foram emprestados nos últimos 30 dias. Verifique se estão em bom estado ou se podem ser redistribuídos entre unidades.",
            "prioridade": "baixa"
        })
    
    # === 5. Remanejamento sugerido ===
    total_disponiveis = db.query(models.Notebook).filter(
        models.Notebook.status == "Disponível"
    ).count()
    total_reservas_pendentes = db.query(models.Reserva).filter(
        models.Reserva.status == "Pendente",
        models.Reserva.data >= hoje.strftime("%Y-%m-%d")
    ).count()
    
    if total_reservas_pendentes > 0 and total_disponiveis < total_reservas_pendentes:
        deficit = total_reservas_pendentes - total_disponiveis
        insights.append({
            "tipo": "deficit_estoque",
            "icone": "alert-circle",
            "titulo": f"Déficit de Estoque Previsto",
            "descricao": f"Há {total_reservas_pendentes} reservas pendentes mas apenas {total_disponiveis} notebooks disponíveis. Déficit de {deficit} unidade(s). Ação imediata necessária.",
            "prioridade": "critica"
        })
    
    # Se não houver insights críticos, adicionar mensagem positiva
    if not insights:
        insights.append({
            "tipo": "sistema_ok",
            "icone": "check-circle",
            "titulo": "Sistema Operando Normalmente",
            "descricao": "Nenhum padrão crítico detectado no período analisado. Continue monitorando os indicadores.",
            "prioridade": "baixa"
        })
    
    # Resumo estatístico
    total_emprestimos_periodo = len(emprestimos_recentes)
    taxa_devolucao = 0
    if total_emprestimos_periodo > 0:
        devolvidos = sum(1 for e in emprestimos_recentes if e.status == "Devolvido")
        taxa_devolucao = round((devolvidos / total_emprestimos_periodo) * 100, 1)
    
    return {
        "insights": insights,
        "periodo_analise_dias": 60,
        "total_emprestimos_analisados": total_emprestimos_periodo,
        "taxa_devolucao_percentual": taxa_devolucao,
        "gerado_em": hoje.isoformat()
    }

# ==================== ROTAS DE WEBSOCKET ====================

@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.websocket("/ws/{user_id}")
async def websocket_user_route(websocket: WebSocket, user_id: int):
    await websocket_endpoint(websocket, user_id=user_id)

@app.get("/alocacoes/diarias")
def get_alocacoes_diarias(
    data: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    if not data:
        data = get_brasilia_time().strftime("%Y-%m-%d")
        
    # Buscar todas as reservas para essa data
    reservas = db.query(models.Reserva).options(
        joinedload(models.Reserva.usuario)
    ).filter(models.Reserva.data == data).all()
    
    # Buscar todos os empréstimos realizados nessa data
    start_date = datetime.strptime(data, "%Y-%m-%d")
    end_date = start_date + timedelta(days=1)
    
    emprestimos = db.query(models.Emprestimo).options(
        joinedload(models.Emprestimo.notebook),
        joinedload(models.Emprestimo.usuario)
    ).filter(
        models.Emprestimo.data_emprestimo >= start_date,
        models.Emprestimo.data_emprestimo < end_date,
        models.Emprestimo.status.in_(["Ativo", "Devolvido", "Atrasado"])
    ).all()
    
    # Mapear turmas de empréstimos e reservas
    alocacoes_map = {}
    
    # Processar reservas
    for r in reservas:
        key = (r.turma_id, r.turno)
        alocacoes_map[key] = {
            "turma": r.turma_id,
            "solicitante": r.usuario.nome if r.usuario else "Sistema",
            "turno": r.turno,
            "quantidade_solicitada": r.quantidade,
            "quantidade_retirada": 0,
            "patrimonios": []
        }
        
    # Processar empréstimos
    for emp in emprestimos:
        turma_id = emp.usuario.turma if emp.usuario else "Sem Turma"
        # Determinar turno do empréstimo a partir da hora
        hour = emp.data_emprestimo.hour
        if hour < 12:
            turno = "Manhã"
        elif hour < 18:
            turno = "Tarde"
        else:
            turno = "Noite"
            
        key = (turma_id, turno)
        if key not in alocacoes_map:
            # Buscar instrutor da turma para ser o solicitante
            turma_info = db.query(models.Turma).filter(models.Turma.codigo_turma == turma_id).first()
            solicitante = turma_info.instrutor if turma_info else "Desconhecido"
            alocacoes_map[key] = {
                "turma": turma_id,
                "solicitante": solicitante,
                "turno": turno,
                "quantidade_solicitada": 0,
                "quantidade_retirada": 0,
                "patrimonios": []
            }
            
        alocacoes_map[key]["quantidade_retirada"] += 1
        if emp.notebook and emp.notebook.patrimonio not in alocacoes_map[key]["patrimonios"]:
            alocacoes_map[key]["patrimonios"].append(emp.notebook.patrimonio)
            
    return list(alocacoes_map.values())

# ==================== ROTAS DE SAÚDE ====================

@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/")
def root():
    return {
        "name": "R9 - Gestão de Notebooks",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# ==================== INICIALIZAÇÃO ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
