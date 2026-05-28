from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base, get_brasilia_time

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
    created_at = Column(DateTime(timezone=True), default=get_brasilia_time)
    updated_at = Column(DateTime(timezone=True), default=get_brasilia_time, onupdate=get_brasilia_time)

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
    created_at = Column(DateTime(timezone=True), default=get_brasilia_time)
    updated_at = Column(DateTime(timezone=True), default=get_brasilia_time, onupdate=get_brasilia_time)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)

    usuario = relationship("Usuario", foreign_keys=[usuario_id])

    __table_args__ = (
        CheckConstraint("status IN ('Disponível', 'Emprestado', 'Manutenção', 'Reservado')", name="check_notebook_status"),
        CheckConstraint("condicao IN ('Novo', 'Bom', 'Regular', 'Ruim')", name="check_notebook_condicao"),
    )

class Emprestimo(Base):
    __tablename__ = "emprestimos"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="RESTRICT"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"))
    status = Column(String(20), nullable=False, default='Ativo')

    notebook = relationship("Notebook")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    responsavel = relationship("Usuario", foreign_keys=[responsavel_id])
    data_emprestimo = Column(DateTime(timezone=True), default=get_brasilia_time)
    data_prevista_devolucao = Column(DateTime(timezone=True))
    data_devolucao = Column(DateTime(timezone=True))
    observacao_saida = Column(Text)
    observacao_devolucao = Column(Text)
    motivo = Column(String(50))

    __table_args__ = (
        CheckConstraint("status IN ('Pendente', 'Ativo', 'Devolvido', 'Atrasado', 'Cancelado')", name="check_emprestimo_status"),
    )

class Historico(Base):
    __tablename__ = "historico"

    id = Column(Integer, primary_key=True, index=True)
    notebook_id = Column(Integer, ForeignKey("notebooks.id", ondelete="RESTRICT"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"))
    responsavel_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"))

    notebook = relationship("Notebook")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    responsavel = relationship("Usuario", foreign_keys=[responsavel_id])
    tipo_movimentacao = Column(String(30), nullable=False)
    status_anterior = Column(String(20))
    status_novo = Column(String(20))
    descricao = Column(Text)
    informacoes_adicionais = Column(Text)
    created_at = Column(DateTime(timezone=True), default=get_brasilia_time)

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
    updated_at = Column(DateTime(timezone=True), default=get_brasilia_time, onupdate=get_brasilia_time)


class Turma(Base):
    __tablename__ = "turmas"

    codigo_turma = Column(String(50), primary_key=True, index=True)
    nome_curso = Column(String(100), nullable=False)
    instrutor = Column(String(100), nullable=False)
    carga_horaria = Column(Integer, nullable=False)
    turno = Column(String(50), nullable=False)
    regime_dias = Column(String(100), nullable=False)


class Reserva(Base):
    __tablename__ = "reservas"

    id = Column(Integer, primary_key=True, index=True)
    turma_id = Column(String(50), ForeignKey("turmas.codigo_turma", ondelete="RESTRICT"), nullable=False)
    data = Column(String(50), nullable=False)
    turno = Column(String(50), nullable=False)
    quantidade = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="Pendente")
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="RESTRICT"), nullable=True)

    usuario = relationship("Usuario")



