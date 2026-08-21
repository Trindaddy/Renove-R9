from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class Role(str, Enum):
    aluno = "aluno"
    professor = "professor"
    ti = "ti"

class NotebookStatus(str, Enum):
    disponivel = "Disponível"
    emprestado = "Emprestado"
    manutencao = "Manutenção"
    reservado = "Reservado"
    reservado_lote = "Reservado (Em Lote)"
    classe_s_suporte = "Classe S - Suporte"
    classe_s_pcd = "Classe S - PCD"
    classe_s_recanto = "Classe S - Alocação Recanto"
    classe_s_eventos = "Classe S - Eventos"

class NotebookCondicao(str, Enum):
    excelente = "Excelente"
    bom = "Bom"
    regular = "Regular"
    ruim = "Ruim"
    danificado = "Danificado"
    obsoleto = "Obsoleto"


class EmprestimoStatus(str, Enum):
    pendente = "Pendente"
    reservado = "Reservado"
    ativo = "Ativo"
    devolvido = "Devolvido"
    atrasado = "Atrasado"
    cancelado = "Cancelado"

class TipoMovimentacao(str, Enum):
    emprestimo = "EMPRESTIMO"
    devolucao = "DEVOLUCAO"
    manutencao_entrada = "MANUTENCAO_ENTRADA"
    manutencao_saida = "MANUTENCAO_SAIDA"
    reserva = "RESERVA"
    cancelamento = "CANCELAMENTO"
    cadastro = "CADASTRO"
    atualizacao = "ATUALIZACAO"
    alerta_escassez = "ALERTA_ESCASSEZ"

# Base Models
class UsuarioBase(BaseModel):
    nome: str = Field(..., min_length=3, max_length=100)
    email: str = Field(..., pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    role: Role
    curso: Optional[str] = None
    turma: Optional[str] = None
    ativo: bool = True
    primeiro_acesso: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str = Field(..., min_length=6)

class UsuarioResponse(UsuarioBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=100)
    email: Optional[str] = Field(None, pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    role: Optional[Role] = None
    curso: Optional[str] = None
    turma: Optional[str] = None
    ativo: Optional[bool] = None
    primeiro_acesso: Optional[bool] = None

class NotebookBase(BaseModel):
    patrimonio: str = Field(..., min_length=3, max_length=30)
    modelo: str = Field(..., min_length=2, max_length=100)
    marca: Optional[str] = Field(None, max_length=50)
    local: Optional[str] = Field("Estoque", max_length=50)
    status: NotebookStatus = NotebookStatus.disponivel
    condicao: NotebookCondicao = NotebookCondicao.bom
    observacoes: Optional[str] = None
    usuario_id: Optional[int] = None
    justificativa_manutencao: Optional[str] = None
    autor_manutencao: Optional[str] = None
    excluido: bool = False

class NotebookCreate(NotebookBase):
    pass

class NotebookUpdate(BaseModel):
    modelo: Optional[str] = None
    marca: Optional[str] = None
    local: Optional[str] = None
    status: Optional[NotebookStatus] = None
    condicao: Optional[NotebookCondicao] = None
    observacoes: Optional[str] = None
    justificativa_manutencao: Optional[str] = None
    autor_manutencao: Optional[str] = None
    excluido: Optional[bool] = None

class NotebookResponse(NotebookBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EmprestimoBase(BaseModel):
    notebook_id: int
    usuario_id: int
    responsavel_id: Optional[int] = None
    motivo: Optional[str] = Field(None, max_length=50)
    observacao_saida: Optional[str] = None

class EmprestimoCreate(EmprestimoBase):
    data_prevista_devolucao: Optional[datetime] = None

class EmprestimoDevolucao(BaseModel):
    observacao_devolucao: Optional[str] = None

class EmprestimoResponse(BaseModel):
    id: int
    status: EmprestimoStatus
    data_emprestimo: Optional[datetime] = None
    data_prevista_devolucao: Optional[datetime] = None
    data_devolucao: Optional[datetime] = None
    observacao_saida: Optional[str] = None
    observacao_devolucao: Optional[str] = None
    motivo: Optional[str] = None
    notebook: Optional[NotebookResponse] = None
    usuario: Optional[UsuarioResponse] = None
    responsavel: Optional[UsuarioResponse] = None

    class Config:
        from_attributes = True

class HistoricoBase(BaseModel):
    notebook_id: Optional[int] = None
    tipo_movimentacao: TipoMovimentacao
    status_anterior: Optional[str] = None
    status_novo: Optional[str] = None
    descricao: Optional[str] = None
    informacoes_adicionais: Optional[str] = None

class HistoricoCreate(HistoricoBase):
    usuario_id: Optional[int] = None
    responsavel_id: Optional[int] = None

class HistoricoResponse(HistoricoBase):
    id: int
    usuario_id: Optional[int] = None
    responsavel_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total: int
    disponiveis: int
    emprestados: int
    manutencao: int
    reservados: int
    percentual_disponivel: float
    emprestimos_ativos: int
    alerta_escassez: bool

class EmprestimoRapido(BaseModel):
    notebook_patrimonio: str = Field(..., min_length=3, max_length=30)
    usuario_matricula: str = Field(..., min_length=3, max_length=100)
    motivo: Optional[str] = Field(None, max_length=50)
    horas_previstas: Optional[int] = Field(4, ge=1, le=72)

class AlertaEscassez(BaseModel):
    ativo: bool
    percentual_atual: float
    limite_percentual: float
    quantidade_disponivel: int
    quantidade_total: int
    mensagem: str
    timestamp: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class LoginRequest(BaseModel):
    email: str
    senha: str


class UsuarioResetSenha(BaseModel):
    nova_senha: str = Field(..., min_length=6)



class PrimeiroAcessoVerificar(BaseModel):
    email: str

class PrimeiroAcessoValidar(BaseModel):
    email: str
    senha_padrao: str

class PrimeiroAcessoDefinir(BaseModel):
    email: str
    senha_padrao: str
    nova_senha: str
    confirmar_senha: str


class TurmaCreate(BaseModel):
    codigo_turma: str = Field(..., min_length=2, max_length=50)
    nome_curso: str = Field(..., min_length=2, max_length=100)
    instrutor: str = Field(..., min_length=2, max_length=100)
    carga_horaria: int = Field(..., gt=0)
    turno: str = Field(..., min_length=2, max_length=50)
    regime_dias: str = Field(..., min_length=2, max_length=100)

class TurmaUpdate(BaseModel):
    nome_curso: Optional[str] = None
    instrutor: Optional[str] = None
    carga_horaria: Optional[int] = None
    turno: Optional[str] = None
    regime_dias: Optional[str] = None

class TurmaResponse(BaseModel):
    id: str
    curso: str
    instrutor: str
    carga_horaria: int
    turno: str
    regime_dias: str
    alunos_count: int = 0

    class Config:
        from_attributes = True


class ReservaCreate(BaseModel):
    turmaId: str = Field(..., alias="turmaId")
    data: str
    turno: str
    quantidade: int

    class Config:
        populate_by_name = True


class ReservaResponse(BaseModel):
    id: int
    turma: str
    data: str
    turno: str
    quantidade: int
    status: str
    usuario: Optional[UsuarioResponse] = None

    class Config:
        from_attributes = True


class ReservaUpdate(BaseModel):
    turmaId: Optional[str] = Field(None, alias="turmaId")
    data: Optional[str] = None
    turno: Optional[str] = None
    quantidade: Optional[int] = None
    status: Optional[str] = None

    class Config:
        populate_by_name = True



