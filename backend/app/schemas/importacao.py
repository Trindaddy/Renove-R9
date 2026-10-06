"""
Schemas Pydantic v2 para Importação em Lote de Turmas e Alunos via relatórios SIG.
"""
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict, field_validator


class ImportacaoSIGStatusEnum(str, Enum):
    CRIADO = "criado"
    ATUALIZADO = "atualizado"
    IGNORADO = "ignorado"


class AlunoImportadoItem(BaseModel):
    """
    Representação individual do processamento de um aluno.
    """
    matricula: str = Field(..., description="Matrícula única do aluno")
    nome: str = Field(..., description="Nome completo do aluno")
    email: str = Field(..., description="E-mail institucional/pessoal do aluno")
    status: ImportacaoSIGStatusEnum = Field(..., description="Status do processamento no banco")
    detalhes: Optional[str] = Field(None, description="Observações ou alertas específicos do aluno")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("matricula", mode="before")
    @classmethod
    def normalizar_matricula(cls, v: any) -> str:
        if v is None:
            return ""
        return str(v).strip()

    @field_validator("nome", mode="before")
    @classmethod
    def normalizar_nome(cls, v: any) -> str:
        if not v:
            return ""
        return str(v).strip().title()

    @field_validator("email", mode="before")
    @classmethod
    def normalizar_email(cls, v: any) -> str:
        if not v:
            return ""
        return str(v).strip().lower()


class ImportacaoSIGResponse(BaseModel):
    """
    Contrato Pydantic v2 de resposta detalhada após a importação de turmas/alunos via SIG.
    """
    total_lidos: int = Field(..., description="Total de registros de alunos lidos do arquivo")
    novos_alunos: int = Field(..., description="Quantidade de novos alunos criados no banco")
    alunos_atualizados: int = Field(..., description="Quantidade de alunos existentes atualizados e vinculados")
    turma_codigo: str = Field(..., description="Código identificador único da turma processada")
    nome_curso: Optional[str] = Field(None, description="Nome do curso associado à turma")
    erros: List[str] = Field(default_factory=list, description="Lista de alertas, inconsistências ou linhas ignoradas")
    alunos_processados: Optional[List[AlunoImportadoItem]] = Field(
        default=None,
        description="Lista detalhada dos alunos processados durante a importação"
    )

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "total_lidos": 28,
                "novos_alunos": 24,
                "alunos_atualizados": 4,
                "turma_codigo": "2026.1-DS-N1",
                "nome_curso": "Técnico em Desenvolvimento de Sistemas",
                "erros": [
                    "Linha 32 ignorada: totalizador de rodapé descartado ('Total de Alunos: 28')"
                ],
                "alunos_processados": [
                    {
                        "matricula": "202601001",
                        "nome": "Ana Clara Da Silva",
                        "email": "ana.silva@aluno.senac.br",
                        "status": "criado",
                        "detalhes": "Novo aluno cadastrado com sucesso"
                    }
                ]
            }
        }
    )
