"""
Suite de Testes Unitários e de Integração: Importação em Lote de Turmas e Alunos via SIG.
Cobre: Normalização de cabeçalhos, descarte de rodapés, parsing em memória (CSV/XLSX),
Idempotência (UPSERT), Atomicidade (Rollback) e Rota FastAPI via httpx.AsyncClient.
"""

import io
import pytest
import pandas as pd
from datetime import timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient, ASGITransport

try:
    from database import Base
    import models
    from main import app, create_access_token
except ImportError:
    from backend.database import Base
    from backend import models
    from backend.main import app, create_access_token

from app.services.sig_importer import (
    SIGImporterService,
    normalizar_texto_cabecalho,
    processar_importacao_sig_stream
)


# Configuração de Banco de Dados Isolado em Memória para Testes
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Cria tabelas limpas no início de cada teste e descarta ao final."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def ti_user(db_session):
    """Cria um usuário do setor de TI para testes com permissões elevadas."""
    user = models.Usuario(
        matricula="TI99999",
        nome="Administrador TI Teste",
        email="admin.ti@senac.df.br",
        senha_hash="hash_teste",
        role="ti",
        ativo=True,
        primeiro_acesso=False
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def ti_token(ti_user):
    """Gera um token JWT válido para o usuário de TI."""
    return create_access_token(
        data={"sub": str(ti_user.id), "role": ti_user.role},
        expires_delta=timedelta(minutes=30)
    )


# ==============================================================================
# 1. TESTES UNITÁRIOS DE PARSER E NORMALIZAÇÃO
# ==============================================================================

def test_normalizacao_cabecalhos_sinonimos():
    """Valida a limpeza e tolerância a acentos e maiúsculas nos cabeçalhos do SIG."""
    assert normalizar_texto_cabecalho("Matrícula") == "matricula"
    assert normalizar_texto_cabecalho("CD_ALUNO") == "cd_aluno"
    assert normalizar_texto_cabecalho("Nome do Estudante") == "nome_do_estudante"
    assert normalizar_texto_cabecalho("Correio Eletrônico") == "correio_eletronico"
    assert normalizar_texto_cabecalho(" Código da Turma ") == "codigo_da_turma"


def test_descarte_linhas_rodape_e_totalizadores():
    """Garante que linhas de rodapé típicas do SIG não sejam importadas como alunos."""
    descartar, motivo = SIGImporterService.eh_linha_rodape_ou_invalida("TOTAL", "Total de Alunos: 25")
    assert descartar is True
    assert "totalizador" in motivo.lower() or "rodapé" in motivo.lower()

    descartar, motivo = SIGImporterService.eh_linha_rodape_ou_invalida("", "Relatório emitido em 05/10/2026")
    assert descartar is True

    descartar, motivo = SIGImporterService.eh_linha_rodape_ou_invalida("2026001", "Lucas Pereira Silva")
    assert descartar is False
    assert motivo is None


# ==============================================================================
# 2. TESTES DE PROCESSAMENTO EM MEMÓRIA (CSV e XLSX)
# ==============================================================================

def test_importacao_sig_csv_em_memoria(db_session):
    """Testa leitura de CSV sem gravação em disco com acentos e delimitador ponto-e-vírgula."""
    csv_content = (
        "Relatório de Alunos por Turma - SIG Senac\n"
        "Turma: 2026.1-DS-T1;Curso: Técnico em Informática\n"
        "cd_aluno;nome_aluno;correio_eletronico\n"
        "20260101;Ana Beatriz Souza;ana.souza@teste.com\n"
        "20260102;Carlos Eduardo Santos;carlos.santos@teste.com\n"
        "Total Geral;2 Alunos Listados;\n"
    ).encode("utf-8-sig")

    response = processar_importacao_sig_stream(
        db=db_session,
        file_bytes=csv_content,
        filename="relatorio_turma.csv",
        codigo_turma=None,  # Deve detectar automaticamente da linha 2
        nome_curso=None
    )

    assert response.total_lidos == 2
    assert response.novos_alunos == 2
    assert response.alunos_atualizados == 0
    assert response.turma_codigo == "2026.1-DS-T1"
    assert "Técnico em Informática" in (response.nome_curso or "")

    # Validar persistência no banco
    alunos_db = db_session.query(models.Usuario).filter(models.Usuario.turma == "2026.1-DS-T1").all()
    assert len(alunos_db) == 2
    assert any(a.matricula == "20260101" and a.nome == "Ana Beatriz Souza" for a in alunos_db)


def test_importacao_sig_excel_xlsx_em_memoria(db_session):
    """Testa parsing de planilha Excel .xlsx com formatação de matrícula float para string."""
    df = pd.DataFrame({
        "Matrícula": ["20260201", "20260202", "Total de Alunos:"],
        "Nome do Aluno": ["Mariana Oliveira", "Rodrigo Costa", "2 Alunos"],
        "E-mail": ["mariana@aluno.com", "", ""]
    })

    bio = io.BytesIO()
    with pd.ExcelWriter(bio, engine="openpyxl") as writer:
        df.to_excel(writer, index=False)
    excel_bytes = bio.getvalue()

    response = processar_importacao_sig_stream(
        db=db_session,
        file_bytes=excel_bytes,
        filename="turma_sig.xlsx",
        codigo_turma="2026.1-ADM-N1",
        nome_curso="Técnico em Administração"
    )

    assert response.total_lidos == 2
    assert response.novos_alunos == 2
    assert response.turma_codigo == "2026.1-ADM-N1"

    # Aluno sem e-mail deve ter e-mail institucional gerado automaticamente
    aluno_rodrigo = db_session.query(models.Usuario).filter(models.Usuario.matricula == "20260202").first()
    assert aluno_rodrigo is not None
    assert aluno_rodrigo.email == "20260202@aluno.senac.br"


# ==============================================================================
# 3. TESTE DE IDEMPOTÊNCIA (UPSERT)
# ==============================================================================

def test_idempotencia_upsert_reimportacao(db_session):
    """
    Garante que reimportar a mesma planilha ou alunos pré-cadastrados atualiza
    apenas dados cadastrais e vínculo de turma, sem duplicar registros ou quebrar integridade.
    """
    csv_v1 = (
        "matricula;nome;email\n"
        "20260301;Felipe Ramos;felipe@teste.com\n"
    ).encode("utf-8")

    # Primeira Importação: Cria o aluno
    resp1 = processar_importacao_sig_stream(
        db=db_session,
        file_bytes=csv_v1,
        filename="turma_v1.csv",
        codigo_turma="TURMA-A",
        nome_curso="Desenvolvimento de Sistemas"
    )
    assert resp1.novos_alunos == 1
    assert resp1.alunos_atualizados == 0

    aluno_criado = db_session.query(models.Usuario).filter_by(matricula="20260301").first()
    id_original = aluno_criado.id

    # Segunda Importação (Nova turma no semestre seguinte com nome corrigido)
    csv_v2 = (
        "matricula;nome;email\n"
        "20260301;Felipe Ramos Da Silva;felipe.silva@teste.com\n"
    ).encode("utf-8")

    resp2 = processar_importacao_sig_stream(
        db=db_session,
        file_bytes=csv_v2,
        filename="turma_v2.csv",
        codigo_turma="TURMA-B",
        nome_curso="Desenvolvimento Avançado"
    )

    assert resp2.novos_alunos == 0
    assert resp2.alunos_atualizados == 1

    # Valida que o ID original foi preservado (sem quebrar chaves estrangeiras com empréstimos)
    aluno_atualizado = db_session.query(models.Usuario).filter_by(matricula="20260301").first()
    assert aluno_atualizado.id == id_original
    assert aluno_atualizado.nome == "Felipe Ramos Da Silva"
    assert aluno_atualizado.turma == "TURMA-B"


# ==============================================================================
# 4. TESTE DE ATOMICIDADE (ROLLBACK)
# ==============================================================================

def test_atomicidade_rollback_em_caso_de_erro_critico(db_session):
    """
    Valida que qualquer erro durante a transação reverte todas as alterações (Zero partial commits).
    """
    # Cria previamente um aluno com email específico
    usuario_existente = models.Usuario(
        matricula="99990001",
        nome="Aluno Existente",
        email="conflito@teste.com",
        senha_hash="hash",
        role="aluno",
        ativo=True
    )
    db_session.add(usuario_existente)
    db_session.commit()

    # Planilha tentando inserir outro aluno com o MESMO e-mail único
    csv_conflito = (
        "matricula;nome;email\n"
        "20269999;Novo Aluno Valido;novo.valido@teste.com\n"
        "20268888;Aluno Com Email Duplicado;conflito@teste.com\n"
    ).encode("utf-8")

    with pytest.raises(Exception):
        processar_importacao_sig_stream(
            db=db_session,
            file_bytes=csv_conflito,
            filename="conflito.csv",
            codigo_turma="TURMA-ERRO"
        )

    # Verifica que o primeiro aluno ("20269999") NÃO foi persistido devido ao Rollback atômico
    aluno_fantasma = db_session.query(models.Usuario).filter_by(matricula="20269999").first()
    assert aluno_fantasma is None


# ==============================================================================
# 5. TESTES DE ROTA FastAPI COM httpx.AsyncClient
# ==============================================================================

@pytest.mark.asyncio
async def test_endpoint_importar_sig_com_sucesso(ti_token, db_session):
    """Testa a rota POST /api/v1/turmas/importar-sig via AsyncClient com perfil de TI."""
    # Sobrescrever dependência get_db do FastAPI para usar a sessão do teste
    from database import get_db
    app.dependency_overrides[get_db] = lambda: db_session

    csv_data = "matricula;nome;email\n20260501;Lucas TI;lucas.ti@senac.br\n"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "arquivo": ("alunos_sig.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
        }
        data = {
            "codigo_turma": "2026.1-TESTE-FASTAPI",
            "nome_curso": "Curso Teste FastAPI"
        }
        headers = {
            "Authorization": f"Bearer {ti_token}"
        }

        response = await client.post(
            "/api/v1/turmas/importar-sig",
            files=files,
            data=data,
            headers=headers
        )

    app.dependency_overrides.clear()

    assert response.status_code == 200
    res_json = response.json()
    assert res_json["total_lidos"] == 1
    assert res_json["novos_alunos"] == 1
    assert res_json["turma_codigo"] == "2026.1-TESTE-FASTAPI"


@pytest.mark.asyncio
async def test_endpoint_importar_sig_sem_autenticacao():
    """Valida bloqueio 401 Unauthorized para chamadas sem token Bearer."""
    csv_data = "matricula;nome;email\n20260501;Lucas TI;lucas.ti@senac.br\n"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {
            "arquivo": ("alunos_sig.csv", io.BytesIO(csv_data.encode("utf-8")), "text/csv")
        }
        response = await client.post(
            "/api/v1/turmas/importar-sig",
            files=files
        )

    assert response.status_code == 401
