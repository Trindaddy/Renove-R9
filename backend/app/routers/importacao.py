"""
Router FastAPI para Importação em Lote de Turmas e Alunos via relatórios SIG.
Endpoint seguro protegido por autenticação JWT e restrito à equipe de TI / Administradores.
"""

from typing import Optional
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    HTTPException,
    Request,
    status
)
from sqlalchemy.orm import Session

try:
    from database import get_db
    import models
    from main import get_current_user, get_client_metadata
except ImportError:
    from backend.database import get_db
    from backend import models
    from backend.main import get_current_user, get_client_metadata

from app.schemas.importacao import ImportacaoSIGResponse
from app.services.sig_importer import processar_importacao_sig_stream


router = APIRouter(
    tags=["Importação SIG - Turmas e Alunos"]
)

# Constantes de validação de arquivos
TAMANHO_MAXIMO_BYTES = 5 * 1024 * 1024  # 5 MB
EXTENSOES_PERMITIDAS = {".xlsx", ".xls", ".csv"}
MIME_TYPES_PERMITIDOS = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
    "text/plain",
    "application/octet-stream"
}


def get_current_active_admin_or_ti(current_user = Depends(get_current_user)):
    """
    Dependência de segurança que valida se o usuário autenticado está ativo
    e possui perfil de TI / Administração.
    """
    if not getattr(current_user, "ativo", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Conta de usuário inativa."
        )
    if getattr(current_user, "role", "") not in ["ti", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operação restrita aos membros da equipe de TI / Administradores."
        )
    return current_user


async def executar_importacao_sig(
    request: Request,
    arquivo: UploadFile = File(..., description="Arquivo de relatório SIG (.xlsx, .xls ou .csv)"),
    codigo_turma: Optional[str] = Form(None, description="Código da turma (opcional, sobrescreve detecção do arquivo)"),
    nome_curso: Optional[str] = Form(None, description="Nome do curso (opcional)"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin_or_ti)
) -> ImportacaoSIGResponse:
    """
    Processa a planilha de alunos e turma gerada pelo SIG.
    Garante leitura em memória (io.BytesIO), validação estrita de MIME/tamanho,
    UPSERT idempotente e auditoria no histórico do sistema.
    """
    # 1. Validação de extensão
    filename = arquivo.filename or "planilha_sig.xlsx"
    extensao = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    if extensao not in EXTENSOES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Extensão de arquivo inválida ('{extensao}'). "
                f"Por favor, envie um relatório nos formatos: {', '.join(EXTENSOES_PERMITIDAS)}"
            )
        )

    # 2. Validação de MIME Type (se fornecido pelo cliente)
    content_type = (arquivo.content_type or "").lower().split(";")[0].strip()
    if content_type and content_type not in MIME_TYPES_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo MIME do arquivo ('{content_type}') não é aceito. Envie um arquivo de planilha (.xlsx/.xls/.csv)."
        )

    # 3. Leitura segura em memória e validação de tamanho (máximo 5MB)
    file_bytes = await arquivo.read()
    tamanho_bytes = len(file_bytes)
    
    if tamanho_bytes == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado está vazio (0 bytes)."
        )

    if tamanho_bytes > TAMANHO_MAXIMO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Arquivo excede o limite máximo permitido de 5 MB ({tamanho_bytes / (1024 * 1024):.2f} MB enviados)."
        )

    # 4. Execução do processamento atômico e idempotente
    resultado = processar_importacao_sig_stream(
        db=db,
        file_bytes=file_bytes,
        filename=filename,
        codigo_turma=codigo_turma.strip() if codigo_turma else None,
        nome_curso=nome_curso.strip() if nome_curso else None
    )

    # 5. Auditoria de Segurança no Histórico
    try:
        ip, ua = get_client_metadata(request)
        historico_audit = models.Historico(
            usuario_id=current_user.id,
            responsavel_id=current_user.id,
            tipo_movimentacao="CADASTRO",
            status_anterior="Lote SIG",
            status_novo="Processado",
            descricao=(
                f"Importação SIG da Turma '{resultado.turma_codigo}': "
                f"{resultado.novos_alunos} novos alunos cadastrados, "
                f"{resultado.alunos_atualizados} atualizados. Total lido: {resultado.total_lidos}."
            ),
            informacoes_adicionais=f"Arquivo: {filename} ({tamanho_bytes} bytes). Erros/Avisos: {len(resultado.erros)}",
            ip_address=ip,
            user_agent=ua
        )
        db.add(historico_audit)
        db.commit()
    except Exception:
        # Falha de log de auditoria não deve derrubar a transação já consolidada
        pass

    return resultado


# Registra a rota principal solicitada (/api/v1/turmas/importar-sig)
@router.post(
    "/api/v1/turmas/importar-sig",
    response_model=ImportacaoSIGResponse,
    status_code=status.HTTP_200_OK,
    summary="Importação em lote de turmas e alunos via relatórios do SIG",
    description="Processa relatórios .xlsx, .xls ou .csv do SIG, criando a turma e executando UPSERT idempotente dos alunos."
)
async def importar_sig_v1_api(
    request: Request,
    arquivo: UploadFile = File(...),
    codigo_turma: Optional[str] = Form(None),
    nome_curso: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin_or_ti)
) -> ImportacaoSIGResponse:
    return await executar_importacao_sig(
        request=request,
        arquivo=arquivo,
        codigo_turma=codigo_turma,
        nome_curso=nome_curso,
        db=db,
        current_user=current_user
    )


# Registra a rota espelho para acesso via proxy Vite (/v1/turmas/importar-sig)
@router.post(
    "/v1/turmas/importar-sig",
    response_model=ImportacaoSIGResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False
)
async def importar_sig_v1_mirror(
    request: Request,
    arquivo: UploadFile = File(...),
    codigo_turma: Optional[str] = Form(None),
    nome_curso: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_admin_or_ti)
) -> ImportacaoSIGResponse:
    return await executar_importacao_sig(
        request=request,
        arquivo=arquivo,
        codigo_turma=codigo_turma,
        nome_curso=nome_curso,
        db=db,
        current_user=current_user
    )
