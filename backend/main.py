"""
R9 - Renove: Sistema de Gestão de Notebooks
Backend FastAPI - Módulo de Empréstimo
"""

from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import os

from database import engine, SessionLocal, get_db
import models
from models import Base
import crud
import schemas
from websocket import websocket_endpoint, manager, broadcast_disponibilidade, broadcast_emprestimo_realizado, broadcast_devolucao_realizada
from alertas import verificar_alerta_escassez_sync

# Criar tabelas (apenas se configurado para evitar conflito com Alembic em produção)
if os.getenv("CREATE_TABLES_ON_STARTUP", "true").lower() == "true":
    Base.metadata.create_all(bind=engine)

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

pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")
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
    
    if crud.get_usuario_by_email(db, usuario.email):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    if crud.get_usuario_by_matricula(db, usuario.matricula):
        raise HTTPException(status_code=400, detail="Matrícula já cadastrada")
    
    return crud.create_usuario(db, usuario)

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

# ==================== ROTAS DE NOTEBOOKS ====================

@app.get("/notebooks", response_model=List[schemas.NotebookResponse])
def list_notebooks(
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
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
    
    return crud.create_notebook(db, notebook)

@app.patch("/notebooks/{notebook_id}", response_model=schemas.NotebookResponse)
async def update_notebook(
    notebook_id: int,
    notebook_update: schemas.NotebookUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti"])(current_user)
    
    nb = crud.update_notebook(db, notebook_id, notebook_update)
    if not nb:
        raise HTTPException(status_code=404, detail="Notebook não encontrado")
        
    stats = crud.get_dashboard_stats(db)
    import asyncio
    asyncio.create_task(broadcast_disponibilidade(stats.__dict__))
    
    return nb


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
    if current_user.role == "aluno" and current_user.id != usuario_id:
        usuario_id = current_user.id
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
    require_role(["ti", "professor"])(current_user)
    
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

@app.post("/emprestimos/{emprestimo_id}/devolver")
async def devolver_emprestimo(
    emprestimo_id: int,
    dados: schemas.EmprestimoDevolucao,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
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
    require_role(["ti", "professor"])(current_user)
    
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
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    return crud.get_historico(db, notebook_id=notebook_id, skip=skip, limit=limit)

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
def create_reserva(
    reserva: schemas.ReservaCreate,
    db: Session = Depends(get_db),
    current_user: schemas.UsuarioResponse = Depends(get_current_user)
):
    require_role(["ti", "professor"])(current_user)
    
    turma_exists = db.query(models.Turma).filter(models.Turma.codigo_turma == reserva.turmaId).first()
    if not turma_exists:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
        
    db_reserva = models.Reserva(
        turma_id=reserva.turmaId,
        data=reserva.data,
        turno=reserva.turno,
        quantidade=reserva.quantidade,
        status="Pendente",
        usuario_id=current_user.id
    )
    db.add(db_reserva)
    db.commit()
    db.refresh(db_reserva)
    
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
def update_reserva(
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
def delete_reserva(
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

# ==================== ROTAS DE WEBSOCKET ====================

@app.websocket("/ws")
async def websocket_route(websocket: WebSocket):
    await websocket_endpoint(websocket)

@app.websocket("/ws/{user_id}")
async def websocket_user_route(websocket: WebSocket, user_id: int):
    await websocket_endpoint(websocket, user_id=user_id)

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
