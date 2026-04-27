from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    matricula = Column(String(20), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    curso = Column(String(100))
    turma = Column(String(20))
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("role IN ('aluno', 'professor', 'ti')", name="check_usuario_role"),
    )

class Notebook(Base):
    __tablename__ = "notebooks"

    id = Column(Integer, primary_key=True, index=True)
    patrimonio = Column(String(30), unique=True, nullable=False, index=True)
    modelo = Column(String(100), nullable=False)
    marca = Column(String(50))
    local = Column(String(50), default='Estoque')
    status = Column(String(20), nullable=False, default='Disponível')
    condicao = Column(String(20), default='Bom')
    observacoes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('Disponível', 'Emprestado', 'Manutenção', 'Reservado')", name="check_notebook_status"),
        CheckConstraint("condicao IN ('Novo', 'Bom', 'Regular', 'Ruim')", name="check_notebook_condicao"),
    )

class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"))
    status = Column(String(20), nullable=False, default='Ativo')
    data_emprestimo = Column(DateTime(timezone=True), server_default=func.now())
    data_prevista_devolucao = Column(DateTime(timezone=True))
    data_devolucao = Column(DateTime(timezone=True))
    observacao_saida = Column(Text)
    observacao_devolucao = Column(Text)
    motivo = Column(String(50))

    __table_args__ = (
        CheckConstraint("status IN ('Ativo', 'Devolvido', 'Atrasado', 'Cancelado')", name="check_emprestimo_status"),
    )

class Historico(Base):
    __tablename__ = "historico"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"))
    tipo_movimentacao = Column(String(30), nullable=False)
    status_anterior = Column(String(20))
    status_novo = Column(String(20))
    descricao = Column(Text)
    metadata = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "tipo_movimentacao IN ('EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO_ENTRADA', "
            "'MANUTENCAO_SAIDA', 'RESERVA', 'CANCELAMENTO', 'CADASTRO', 'ATUALIZACAO', 'ALERTA_ESCASSEZ')",
            name="check_historico_tipo"
        ),
    )

class Configuracao(Base):
    __tablename__ = "configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    chave = Column(String(50), unique=True, nullable=False)
    valor = Column(Text, nullable=False)
    descricao = Column(Text)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

