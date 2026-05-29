from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from typing import List, Optional
from datetime import datetime, timedelta
import json

import models
import schemas
from alertas import verificar_alerta_escassez_sync, notificar_alerta_escassez, obter_disponiveis_reais
from database import get_brasilia_time

def get_usuario(db: Session, usuario_id: int):
    return db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()

def get_usuario_by_email(db: Session, email: str):
    return db.query(models.Usuario).filter(models.Usuario.email == email).first()

def get_usuario_by_matricula(db: Session, matricula: str):
    return db.query(models.Usuario).filter(models.Usuario.matricula == matricula).first()

def create_usuario(db: Session, usuario: schemas.UsuarioCreate):
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
    
    db_usuario = models.Usuario(
        matricula=usuario.matricula,
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=pwd_context.hash(usuario.senha),
        role=usuario.role,
        curso=usuario.curso,
        turma=usuario.turma,
        ativo=usuario.ativo
    )
    try:
        db.add(db_usuario)
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    except Exception as e:
        db.rollback()
        raise e

def get_notebook(db: Session, notebook_id: int):
    return db.query(models.Notebook).filter(models.Notebook.id == notebook_id).first()

def get_notebook_by_patrimonio(db: Session, patrimonio: str):
    return db.query(models.Notebook).filter(models.Notebook.patrimonio == patrimonio).first()

def listar_notebooks(db: Session, status: Optional[str] = None, skip: int = 0, limit: int = 1000):
    query = db.query(models.Notebook)
    if status:
        query = query.filter(models.Notebook.status == status)
    return query.offset(skip).limit(limit).all()

def create_notebook(db: Session, notebook: schemas.NotebookCreate, responsavel_id: Optional[int] = None):
    db_notebook = models.Notebook(**notebook.model_dump())
    try:
        db.add(db_notebook)
        db.flush()
        
        db_hist = models.Historico(
            notebook_id=db_notebook.id,
            tipo_movimentacao="CADASTRO",
            responsavel_id=responsavel_id,
            status_novo=db_notebook.status,
            descricao=f"Notebook {db_notebook.patrimonio} ({db_notebook.modelo}) cadastrado no sistema"
        )
        db.add(db_hist)
        db.commit()
        db.refresh(db_notebook)
        return db_notebook
    except Exception as e:
        db.rollback()
        raise e

def update_notebook(db: Session, notebook_id: int, notebook_update: schemas.NotebookUpdate, responsavel_id: Optional[int] = None):
    db_notebook = get_notebook(db, notebook_id)
    if not db_notebook:
        return None
    
    status_anterior = db_notebook.status
    update_data = notebook_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(db_notebook, key, value)
    
    try:
        if 'status' in update_data:
            tipo_mov = "ATUALIZACAO"
            desc = f"Status alterado de {status_anterior} para {db_notebook.status}"
            
            if db_notebook.status == "Manutenção":
                tipo_mov = "MANUTENCAO_ENTRADA"
                desc = f"Entrada em Manutenção. Justificativa: {db_notebook.justificativa_manutencao}. Autor: {db_notebook.autor_manutencao}"
            elif status_anterior == "Manutenção":
                tipo_mov = "MANUTENCAO_SAIDA"
                desc = f"Saída de Manutenção. Retornou para {db_notebook.status}"
                
            db_hist = models.Historico(
                notebook_id=db_notebook.id,
                tipo_movimentacao=tipo_mov,
                status_anterior=status_anterior,
                status_novo=db_notebook.status,
                descricao=desc,
                responsavel_id=responsavel_id
            )
            db.add(db_hist)
        db.commit()
        db.refresh(db_notebook)
        
        if 'status' in update_data:
            verificar_e_notificar_escassez(db)
        return db_notebook
    except Exception as e:
        db.rollback()
        raise e

def get_emprestimo(db: Session, emprestimo_id: int):
    return db.query(models.Emprestimo).options(
        joinedload(models.Emprestimo.notebook),
        joinedload(models.Emprestimo.usuario),
        joinedload(models.Emprestimo.responsavel)
    ).filter(models.Emprestimo.id == emprestimo_id).first()

def listar_emprestimos(
    db: Session, 
    status: Optional[str] = None, 
    usuario_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100
):
    query = db.query(models.Emprestimo).options(
        joinedload(models.Emprestimo.notebook),
        joinedload(models.Emprestimo.usuario),
        joinedload(models.Emprestimo.responsavel)
    )
    if status:
        query = query.filter(models.Emprestimo.status == status)
    if usuario_id:
        query = query.filter(models.Emprestimo.usuario_id == usuario_id)
    return query.order_by(models.Emprestimo.data_emprestimo.desc()).offset(skip).limit(limit).all()

def criar_emprestimo(db: Session, emprestimo: schemas.EmprestimoCreate, responsavel_id: Optional[int] = None, status_inicial: str = "Pendente"):
    # Obter lock pessimista na configuração de alta demanda para serializar as verificações sob concorrência
    config_alta_demanda = db.query(models.Configuracao).filter(
        models.Configuracao.chave == "dia_alta_demanda"
    ).with_for_update().first()
    
    dia_alta_demanda = config_alta_demanda.valor.lower() == "true" if config_alta_demanda else False
    
    # Se dia de alta demanda, verificar limite de distribuição
    if dia_alta_demanda:
        total_notebooks = db.query(models.Notebook).count()
        notebooks_distribuidos = db.query(models.Notebook).filter(
            models.Notebook.status.in_(["Emprestado", "Reservado"])
        ).count()
        
        config_limite = db.query(models.Configuracao).filter(
            models.Configuracao.chave == "limite_distribuicao_alta_demanda_percentual"
        ).first()
        limite_percentual = float(config_limite.valor) if config_limite else 50.0
        
        # O novo empréstimo aumentaria a distribuição em 1 unidade
        futura_distribuicao_percentual = ((notebooks_distribuidos + 1) / total_notebooks * 100) if total_notebooks > 0 else 0
        if futura_distribuicao_percentual > limite_percentual:
            raise ValueError(
                f"Limite de distribuição em dias de alta demanda atingido ({limite_percentual}%). "
                f"Notebooks atualmente distribuídos: {notebooks_distribuidos}/{total_notebooks}."
            )

    # Obter lock pessimista no notebook selecionado para garantir exclusão mútua
    notebook = db.query(models.Notebook).filter(
        models.Notebook.id == emprestimo.notebook_id
    ).with_for_update().first()

    if not notebook or notebook.status != "Disponível":
        raise ValueError("Notebook não está disponível para empréstimo")
    
    usuario = get_usuario(db, emprestimo.usuario_id)
    if not usuario or not usuario.ativo:
        raise ValueError("Usuário inválido ou inativo")
    
    # Verificar se usuário já tem empréstimo ativo
    emprestimo_ativo = db.query(models.Emprestimo).filter(
        models.Emprestimo.usuario_id == usuario.id,
        models.Emprestimo.status == "Ativo"
    ).first()
    
    if emprestimo_ativo:
        raise ValueError("Usuário já possui um empréstimo ativo")
    
    # Calcular data prevista se não informada
    data_prevista = emprestimo.data_prevista_devolucao
    if not data_prevista:
        config_horas = db.query(models.Configuracao).filter(models.Configuracao.chave == "tempo_maximo_emprestimo_horas").first()
        horas = int(config_horas.valor) if config_horas else 4
        data_prevista = get_brasilia_time() + timedelta(hours=horas)
    
    db_emprestimo = models.Emprestimo(
        notebook_id=emprestimo.notebook_id,
        usuario_id=emprestimo.usuario_id,
        responsavel_id=responsavel_id or emprestimo.responsavel_id,
        data_prevista_devolucao=data_prevista,
        observacao_saida=emprestimo.observacao_saida or ("Retirada física" if status_inicial == "Ativo" else "Pré-alocado (Aguardando Confirmação Aluno)"),
        motivo=emprestimo.motivo,
        status=status_inicial
    )
    
    # Atualizar status do notebook e vincular usuario_id
    notebook.status = "Emprestado" if status_inicial == "Ativo" else "Reservado"
    notebook.usuario_id = emprestimo.usuario_id
    
    try:
        db.add(db_emprestimo)
        db.flush()
        
        # Registrar no histórico na mesma transação
        db_hist = models.Historico(
            notebook_id=notebook.id,
            usuario_id=usuario.id,
            responsavel_id=responsavel_id or emprestimo.responsavel_id,
            tipo_movimentacao="EMPRESTIMO",
            status_anterior="Disponível",
            status_novo=notebook.status,
            descricao=f"Pré-alocação de notebook para {usuario.nome} ({usuario.matricula})" if status_inicial == "Pendente" else f"Empréstimo rápido para {usuario.nome} ({usuario.matricula})",
            informacoes_adicionais=json.dumps({"emprestimo_id": db_emprestimo.id, "motivo": emprestimo.motivo})
        )
        db.add(db_hist)
        db.commit()
        db.refresh(db_emprestimo)
        
        verificar_e_notificar_escassez(db)
        return db_emprestimo
    except Exception as e:
        db.rollback()
        raise e

def criar_emprestimo_rapido(db: Session, dados: schemas.EmprestimoRapido, responsavel_id: Optional[int] = None):
    notebook = get_notebook_by_patrimonio(db, dados.notebook_patrimonio)
    if not notebook:
        raise ValueError(f"Notebook {dados.notebook_patrimonio} não encontrado")
    
    usuario = get_usuario_by_matricula(db, dados.usuario_matricula)
    if not usuario:
        raise ValueError(f"Usuário com matrícula {dados.usuario_matricula} não encontrado")
    
    data_prevista = get_brasilia_time() + timedelta(hours=dados.horas_previstas or 4)
    
    emprestimo = schemas.EmprestimoCreate(
        notebook_id=notebook.id,
        usuario_id=usuario.id,
        responsavel_id=responsavel_id,
        motivo=dados.motivo,
        data_prevista_devolucao=data_prevista
    )
    
    return criar_emprestimo(db, emprestimo, responsavel_id, status_inicial="Ativo")

def registrar_devolucao(db: Session, emprestimo_id: int, dados: schemas.EmprestimoDevolucao, responsavel_id: Optional[int] = None):
    emprestimo = get_emprestimo(db, emprestimo_id)
    if not emprestimo or emprestimo.status not in ["Ativo", "Atrasado", "Pendente"]:
        raise ValueError("Empréstimo não encontrado ou já finalizado")
    
    notebook = get_notebook(db, emprestimo.notebook_id)
    status_anterior_nb = notebook.status
    
    # Atualizar empréstimo
    emprestimo.status = "Devolvido"
    emprestimo.data_devolucao = get_brasilia_time()
    emprestimo.observacao_devolucao = dados.observacao_devolucao
    if responsavel_id:
        emprestimo.responsavel_id = responsavel_id
    
    # Liberar notebook e desvincular usuário
    notebook.status = "Disponível"
    notebook.usuario_id = None
    
    try:
        db_hist = models.Historico(
            notebook_id=notebook.id,
            usuario_id=emprestimo.usuario_id,
            responsavel_id=responsavel_id,
            tipo_movimentacao="DEVOLUCAO",
            status_anterior=status_anterior_nb,
            status_novo="Disponível",
            descricao=f"Devolução do notebook {notebook.patrimonio}",
            informacoes_adicionais=json.dumps({"emprestimo_id": emprestimo.id})
        )
        db.add(db_hist)
        db.commit()
        db.refresh(emprestimo)
        return emprestimo
    except Exception as e:
        db.rollback()
        raise e


def cancelar_emprestimo(db: Session, emprestimo_id: int, responsavel_id: Optional[int] = None):
    emprestimo = get_emprestimo(db, emprestimo_id)
    if not emprestimo or emprestimo.status not in ["Ativo", "Pendente", "Atrasado"]:
        raise ValueError("Empréstimo não encontrado ou não está ativo")
    
    notebook = get_notebook(db, emprestimo.notebook_id)
    status_anterior_nb = notebook.status
    
    emprestimo.status = "Cancelado"
    notebook.status = "Disponível"
    notebook.usuario_id = None
    
    try:
        db_hist = models.Historico(
            notebook_id=notebook.id,
            usuario_id=emprestimo.usuario_id,
            responsavel_id=responsavel_id,
            tipo_movimentacao="CANCELAMENTO",
            status_anterior=status_anterior_nb,
            status_novo="Disponível",
            descricao="Empréstimo cancelado"
        )
        db.add(db_hist)
        db.commit()
        db.refresh(emprestimo)
        
        verificar_e_notificar_escassez(db)
        return emprestimo
    except Exception as e:
        db.rollback()
        raise e

def get_historico(db: Session, notebook_id: Optional[int] = None, usuario_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Historico).options(
        joinedload(models.Historico.notebook),
        joinedload(models.Historico.usuario),
        joinedload(models.Historico.responsavel)
    )
    if notebook_id:
        query = query.filter(models.Historico.notebook_id == notebook_id)
    if usuario_id:
        query = query.filter(models.Historico.usuario_id == usuario_id)
    return query.order_by(models.Historico.created_at.desc()).offset(skip).limit(limit).all()

def registrar_historico(db: Session, historico: schemas.HistoricoCreate):
    db_historico = models.Historico(**historico.model_dump())
    try:
        db.add(db_historico)
        db.commit()
        db.refresh(db_historico)
        return db_historico
    except Exception as e:
        db.rollback()
        raise e

def get_dashboard_stats(db: Session):
    total = db.query(models.Notebook).count()
    disponiveis = obter_disponiveis_reais(db)
    emprestados = db.query(models.Notebook).filter(models.Notebook.status == "Emprestado").count()
    manutencao = db.query(models.Notebook).filter(models.Notebook.status == "Manutenção").count()
    
    # Calculate today's pending reservations (reservados)
    today_str = get_brasilia_time().strftime("%Y-%m-%d")
    reservas_hoje = db.query(models.Reserva).filter(
        models.Reserva.data == today_str,
        models.Reserva.status == "Pendente"
    ).all()
    
    reservas_por_turma = {}
    for r in reservas_hoje:
        reservas_por_turma[r.turma_id] = reservas_por_turma.get(r.turma_id, 0) + r.quantidade
        
    total_pendente_reservado = 0
    for turma_id, qtd_reservada in reservas_por_turma.items():
        active_loans = db.query(models.Emprestimo).join(
            models.Usuario, models.Emprestimo.usuario_id == models.Usuario.id
        ).filter(
            models.Usuario.turma == turma_id,
            models.Emprestimo.status.in_(["Ativo", "Atrasado"])
        ).count()
        
        pendente = max(0, qtd_reservada - active_loans)
        total_pendente_reservado += pendente
        
    reservados = total_pendente_reservado
    emprestimos_ativos = db.query(models.Emprestimo).filter(models.Emprestimo.status == "Ativo").count()
    
    percentual = round((disponiveis / total * 100), 2) if total > 0 else 0
    
    alerta = verificar_alerta_escassez_sync(db)
    
    return schemas.DashboardStats(
        total=total,
        disponiveis=disponiveis,
        emprestados=emprestados,
        manutencao=manutencao,
        reservados=reservados,
        percentual_disponivel=percentual,
        emprestimos_ativos=emprestimos_ativos,
        alerta_escassez=alerta["ativo"]
    )

def verificar_e_notificar_escassez(db: Session):
    alerta = verificar_alerta_escassez_sync(db)
    if alerta["ativo"]:
        notificar_alerta_escassez(alerta)
        # Registrar no histórico
        notebook = db.query(models.Notebook).first()
        if notebook:
            registrar_historico(db, schemas.HistoricoCreate(
                notebook_id=notebook.id,
                tipo_movimentacao=schemas.TipoMovimentacao.alerta_escassez,
                descricao=alerta["mensagem"],
                informacoes_adicionais=json.dumps({
                    "percentual_atual": alerta["percentual_atual"],
                    "limite": alerta["limite_percentual"]
                })
            ))
    return alerta

def verificar_atrasos(db: Session):
    """Verifica empréstimos atrasados e atualiza status"""
    atrasados = db.query(models.Emprestimo).filter(
        models.Emprestimo.status == "Ativo",
        models.Emprestimo.data_prevista_devolucao < get_brasilia_time()
    ).all()
    
    for emp in atrasados:
        emp.status = "Atrasado"
    
    db.commit()
    return len(atrasados)

def listar_usuarios(db: Session, role: Optional[str] = None, turma: Optional[str] = None):
    query = db.query(models.Usuario)
    if role:
        query = query.filter(models.Usuario.role == role)
    if turma:
        query = query.filter(models.Usuario.turma == turma)
    return query.all()

def update_usuario(db: Session, usuario_id: int, usuario_update: schemas.UsuarioUpdate):
    db_usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not db_usuario:
        return None
    
    update_data = usuario_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_usuario, key, value)
        
    try:
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    except Exception as e:
        db.rollback()
        raise e

