"""
Serviço de parsing, normalização e importação em lote de turmas e alunos via relatórios SIG.
Totalmente em memória (io.BytesIO), idempotente via SQLAlchemy 2.0 UPSERT e com transações atômicas.
"""

import io
import re
import unicodedata
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select, text
from fastapi import HTTPException, status
import bcrypt

try:
    import models
    from database import get_brasilia_time
except ImportError:
    from backend import models
    from backend.database import get_brasilia_time

from app.schemas.importacao import (
    ImportacaoSIGResponse,
    AlunoImportadoItem,
    ImportacaoSIGStatusEnum
)


# Dicionário de sinônimos conhecidos gerados por relatórios do SIG
HEADER_SYNONYMS = {
    "matricula": [
        "matricula", "cd_aluno", "codigo_aluno", "ra", "cod_matricula", 
        "cod_aluno", "nr_matricula", "registro_academico", "matricula_aluno", "id_aluno"
    ],
    "nome": [
        "nome", "nome_aluno", "aluno", "estudante", "nome_estudante", 
        "no_aluno", "aluno_nome", "nome_completo"
    ],
    "email": [
        "email", "e_mail", "correio_eletronico", "email_aluno", 
        "e_mail_aluno", "ds_email", "correio_eletronico_aluno"
    ],
    "turma": [
        "turma", "codigo_turma", "cod_turma", "cd_turma", "sigla_turma", "id_turma"
    ],
    "curso": [
        "curso", "nome_curso", "no_curso", "ds_curso", "programa"
    ]
}

# Palavras-chave que indicam linhas de totalizadores ou rodapés típicos do SIG
FOOTER_KEYWORDS = [
    "total", "totalizadores", "total de alunos", "total geral", "registros", 
    "emitido em", "relatorio", "relatório", "data de emissao", "data de emissão", 
    "pagina", "página", "usuario emissor", "usuário emissor", "sistema integrado"
]


def normalizar_texto_cabecalho(texto: Any) -> str:
    """
    Remove acentos, espaços extras, caracteres especiais e converte para minúsculas com underscores.
    Ex: 'Matrícula do Aluno' -> 'matricula_do_aluno'
    """
    if texto is None:
        return ""
    s = str(texto).strip()
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('ASCII')
    s = s.lower()
    s = re.sub(r'[^a-z0-9]+', '_', s)
    return s.strip('_')


def identificar_campo_canonico(norm_col: str) -> Optional[str]:
    """Identifica se uma coluna normalizada corresponde a algum dos campos conhecidos do SIG."""
    if not norm_col:
        return None

    # Normaliza removendo conectivos portugueses para casamento de sinônimos
    norm_clean = re.sub(r'_(?:de|do|da|dos|das)_', '_', f"_{norm_col}_").strip('_')

    for canonical_name, synonyms in HEADER_SYNONYMS.items():
        if norm_col in synonyms or norm_clean in synonyms:
            return canonical_name

    # Heurística semântica resiliente para cabeçalhos com variações não previstas
    if "matricula" in norm_clean or "cd_aluno" in norm_clean or norm_clean == "ra" or "cod_aluno" in norm_clean or "registro" in norm_clean:
        return "matricula"
    if ("nome" in norm_clean or "aluno" in norm_clean or "estudante" in norm_clean) and "curso" not in norm_clean and "turma" not in norm_clean:
        return "nome"
    if "email" in norm_clean or "correio" in norm_clean:
        return "email"
    if "turma" in norm_clean:
        return "turma"
    if "curso" in norm_clean:
        return "curso"
    return None


def hash_senha_inicial(senha_plana: str) -> str:
    """Gera hash seguro bcrypt para novos alunos criados via importação do SIG."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha_plana.encode('utf-8'), salt).decode('utf-8')


class SIGImporterService:
    """
    Serviço responsável por ler arquivos em memória, normalizar os dados do SIG,
    identificar turmas e executar o UPSERT atômico de alunos no SQLAlchemy 2.0.
    """

    @classmethod
    def extrair_metadados_cabecalho(cls, raw_df: pd.DataFrame) -> Dict[str, str]:
        """
        Analisa as primeiras linhas de uma planilha bruta em busca de metadados
        frequentes no SIG (ex: 'Turma: 2026.1-DS-N1', 'Curso: Técnico em Informática').
        """
        metadados = {}
        max_scan = min(15, len(raw_df))
        
        for idx in range(max_scan):
            row_str = " ".join([str(val) for val in raw_df.iloc[idx].dropna().tolist() if str(val).strip()])
            row_normalized = unicodedata.normalize('NFKD', row_str).encode('ASCII', 'ignore').decode('ASCII').lower()
            
            # Buscar identificador de turma (ex: "Turma: 2026.1-DS-N1" ou "Cod. Turma: 12345")
            if "turma" in row_normalized and "codigo_turma" not in metadados:
                match = re.search(r'(?:codigo da turma|cod\.?\s*turma|turma)\s*[:=]\s*([A-Za-z0-9\.\-_/]+)', row_str, re.IGNORECASE)
                if match:
                    t_val = match.group(1).strip(" -_;|")
                    if len(t_val) >= 2 and any(c.isalnum() for c in t_val):
                        metadados["codigo_turma"] = t_val
            
            # Buscar nome do curso (ex: "Curso: Técnico em Informática")
            if "curso" in row_normalized and "nome_curso" not in metadados:
                match = re.search(r'(?:nome do curso|curso)\s*[:=]\s*([A-Za-z0-9À-ÿ\s\-_/]+?)(?:[-–|;]|$)', row_str, re.IGNORECASE)
                if match:
                    curso_val = match.group(1).strip(" -_;|")
                    if len(curso_val) > 3 and any(c.isalnum() for c in curso_val):
                        metadados["nome_curso"] = curso_val

        return metadados

    @classmethod
    def localizar_linha_cabecalho(cls, raw_df: pd.DataFrame) -> Tuple[int, Dict[str, str]]:
        """
        Varre as primeiras linhas da planilha até encontrar a linha de cabeçalho
        que contenha ao menos 'matricula' e 'nome'.
        Retorna (indice_linha_cabecalho, mapa_colunas_detectadas).
        """
        max_scan = min(20, len(raw_df))
        for row_idx in range(max_scan):
            row_values = raw_df.iloc[row_idx].tolist()
            normalized_row = [normalizar_texto_cabecalho(v) for v in row_values]
            
            # Verificar quais campos conhecidos estão nesta linha
            col_map = {}
            for col_idx, norm_col in enumerate(normalized_row):
                if not norm_col:
                    continue
                canonical = identificar_campo_canonico(norm_col)
                if canonical and canonical not in col_map:
                    col_map[canonical] = col_idx
            
            # Matrícula e nome são indispensáveis para ser a linha de cabeçalho da turma
            if "matricula" in col_map and "nome" in col_map:
                return row_idx, col_map

        # Se não achou na varredura detalhada, tenta verificar a linha 0 como fallback
        return 0, {}

    @classmethod
    def ler_arquivo_em_memoria(cls, file_bytes: bytes, filename: str) -> pd.DataFrame:
        """
        Lê o buffer de bytes em memória suportando .csv, .xlsx e .xls.
        Não grava absolutamente nada em disco.
        """
        import csv
        lower_name = filename.lower()

        if lower_name.endswith('.csv'):
            encodings = ['utf-8-sig', 'utf-8', 'latin1', 'cp1252', 'iso-8859-1']
            delimiters = [';', ',', '\t']
            
            melhor_df = None
            max_colunas = 0

            # Utiliza csv.reader em memória para ser imune a linhas de metadados com colunas irregulares
            for delim in delimiters:
                for enc in encodings:
                    try:
                        text_content = file_bytes.decode(enc, errors='replace')
                        stream = io.StringIO(text_content)
                        reader = csv.reader(stream, delimiter=delim)
                        rows = [row for row in reader if any(field.strip() for field in row)]
                        if not rows:
                            continue
                        
                        max_len = max(len(r) for r in rows)
                        if max_len < 2:
                            continue
                        
                        padded_rows = [r + [''] * (max_len - len(r)) for r in rows]
                        df = pd.DataFrame(padded_rows)
                        
                        # Verifica se localiza matrícula e nome
                        _, col_map = cls.localizar_linha_cabecalho(df)
                        if "matricula" in col_map and "nome" in col_map:
                            return df
                        
                        if max_len > max_colunas:
                            max_colunas = max_len
                            melhor_df = df
                    except Exception:
                        continue

            if melhor_df is not None and not melhor_df.empty:
                return melhor_df

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Não foi possível decodificar o arquivo CSV. Verifique a codificação e separadores do arquivo."
            )

        elif lower_name.endswith(('.xlsx', '.xls')):
            bio = io.BytesIO(file_bytes)
            try:
                bio.seek(0)
                # Lê a primeira aba sem assumir cabeçalho fixo na linha 0
                df = pd.read_excel(bio, sheet_name=0, header=None, dtype=str)
                return df
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Falha ao ler planilha Excel (.xlsx/.xls): {str(e)}"
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de arquivo não suportado. Por favor, envie uma planilha .xlsx, .xls ou .csv."
            )

    @classmethod
    def normalizar_matricula_valor(cls, val: Any) -> str:
        """Limpa e formata o valor da matrícula, removendo ponto flutuante indesejado (ex: '202401.0' -> '202401')."""
        if pd.isna(val) or val is None:
            return ""
        s = str(val).strip()
        # Se veio como float terminado em .0
        if re.match(r'^\d+\.0$', s):
            s = s[:-2]
        return s.strip()

    @classmethod
    def eh_linha_rodape_ou_invalida(cls, matricula: str, nome: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica se a linha corresponde a totalizadores de rodapé, notas de emissão ou cabeçalhos residuais.
        """
        if not matricula and not nome:
            return True, "Linha em branco descartada"

        texto_comb = f"{matricula} {nome}".strip().lower()
        texto_comb_norm = unicodedata.normalize('NFKD', texto_comb).encode('ASCII', 'ignore').decode('ASCII')

        for kw in FOOTER_KEYWORDS:
            if kw in texto_comb_norm:
                return True, f"Linha de rodapé/totalizador descartada: '{matricula} {nome}'"

        if not matricula:
            return True, f"Aluno sem matrícula válida descartado (Nome: '{nome}')"

        if not nome or len(nome.strip()) < 2:
            return True, f"Registro com matrícula '{matricula}' descartado por não conter nome válido"

        return False, None

    @classmethod
    def processar_planilha(
        cls,
        db: Session,
        file_bytes: bytes,
        filename: str,
        codigo_turma: Optional[str] = None,
        nome_curso: Optional[str] = None
    ) -> ImportacaoSIGResponse:
        """
        Executa a rotina completa de importação:
        1. Carrega dados em memória via Pandas / BytesIO.
        2. Extrai metadados do cabeçalho e descarta totalizadores.
        3. Executa transação atômica com rollback automático em caso de exceção.
        4. Realiza UPSERT idempotente em SQLAlchemy 2.0 (PostgreSQL / SQLite).
        5. Atualiza vínculo na tabela associativa 'turma_alunos'.
        """
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Arquivo enviado está vazio.")

        raw_df = cls.ler_arquivo_em_memoria(file_bytes, filename)
        if raw_df.empty:
            raise HTTPException(status_code=400, detail="O arquivo enviado não contém linhas de dados.")

        # 1. Extração de metadados se código da turma ou curso não foram informados
        metadados = cls.extrair_metadados_cabecalho(raw_df)
        turma_final = (codigo_turma or metadados.get("codigo_turma") or "").strip()
        curso_final = (nome_curso or metadados.get("nome_curso") or "Curso Técnico Geral").strip()

        # 2. Localização da linha de cabeçalho
        header_row_idx, col_map = cls.localizar_linha_cabecalho(raw_df)
        if "matricula" not in col_map or "nome" not in col_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Não foi possível identificar as colunas obrigatórias ('Matrícula' e 'Nome') "
                    "no relatório SIG. Verifique o cabeçalho da planilha."
                )
            )

        # 3. Se a turma ainda não foi identificada, verificar se há coluna de turma na planilha
        if not turma_final and "turma" in col_map:
            col_turma_idx = col_map["turma"]
            first_valid = raw_df.iloc[header_row_idx + 1:, col_turma_idx].dropna().tolist()
            if first_valid:
                turma_final = str(first_valid[0]).strip()

        if not turma_final:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Código da turma não encontrado na planilha nem informado no formulário. "
                    "Por favor, digite o Código da Turma manualmente."
                )
            )

        # Preparação dos dados tabulares a partir da linha posterior ao cabeçalho
        data_df = raw_df.iloc[header_row_idx + 1:].copy()
        
        matricula_idx = col_map["matricula"]
        nome_idx = col_map["nome"]
        email_idx = col_map.get("email")

        erros_e_avisos: List[str] = []
        alunos_processados: List[AlunoImportadoItem] = []
        registros_validos: List[Dict[str, str]] = []

        # 4. Normalização e descarte de rodapés
        for idx, row in data_df.iterrows():
            raw_mat = row.iloc[matricula_idx] if matricula_idx < len(row) else ""
            raw_nome = row.iloc[nome_idx] if nome_idx < len(row) else ""
            raw_email = row.iloc[email_idx] if email_idx is not None and email_idx < len(row) else ""

            mat = cls.normalizar_matricula_valor(raw_mat)
            nome = str(raw_nome).strip().title() if pd.notna(raw_nome) else ""
            email = str(raw_email).strip().lower() if pd.notna(raw_email) and str(raw_email).strip() != "nan" else ""

            descartar, motivo = cls.eh_linha_rodape_ou_invalida(mat, nome)
            if descartar:
                if motivo:
                    erros_e_avisos.append(f"Linha {idx + 1}: {motivo}")
                continue

            # Se o e-mail não estiver presente na planilha, gerar e-mail institucional acadêmico padrão
            if not email or "@" not in email:
                email = f"{mat}@aluno.senac.br"

            registros_validos.append({
                "matricula": mat,
                "nome": nome,
                "email": email,
                "linha": idx + 1
            })

        if not registros_validos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nenhum registro válido de aluno foi encontrado para importação após a filtragem."
            )

        # 5. Processamento Transacional Atômico no Banco de Dados
        total_lidos = len(registros_validos)
        novos_alunos_count = 0
        alunos_atualizados_count = 0

        # Identificar dialeto para suportar PostgreSQL Dialect e SQLite Dialect
        dialect_name = db.bind.dialect.name if db.bind else "sqlite"

        try:
            # Garante que qualquer falha nesta rotina executará rollback total
            with db.begin_nested() if db.in_transaction() else db.begin():
                
                # A. Garantir a existência da Turma
                turma_db = db.query(models.Turma).filter(models.Turma.codigo_turma == turma_final).first()
                if not turma_db:
                    turma_db = models.Turma(
                        codigo_turma=turma_final,
                        nome_curso=curso_final,
                        instrutor="A Definir",
                        carga_horaria=200,
                        turno="Matutino",
                        regime_dias="Segunda a Sexta"
                    )
                    db.add(turma_db)
                    db.flush()
                else:
                    # Atualiza o nome do curso se fornecido explicitamente
                    if nome_curso and nome_curso.strip():
                        turma_db.nome_curso = nome_curso.strip()
                        db.flush()

                # B. Pré-carregar usuários existentes pelas matrículas para verificar status de novidade
                matriculas_lidas = [r["matricula"] for r in registros_validos]
                existentes_map = {
                    u.matricula: u
                    for u in db.query(models.Usuario).filter(models.Usuario.matricula.in_(matriculas_lidas)).all()
                }

                # Senha padrão criptografada em lote se novos alunos precisarem ser gerados
                senha_padrao_hash = None

                for reg in registros_validos:
                    mat = reg["matricula"]
                    nome = reg["nome"]
                    email = reg["email"]
                    usuario_existente = existentes_map.get(mat)

                    if usuario_existente:
                        # Aluno já cadastrado em semestres anteriores:
                        # Mantém seu histórico/senha intactos, atualiza dados cadastrais e vincula à nova turma
                        usuario_existente.nome = nome
                        usuario_existente.email = email
                        usuario_existente.turma = turma_final
                        usuario_existente.curso = turma_db.nome_curso
                        usuario_existente.ativo = True
                        db.flush()

                        usuario_id = usuario_existente.id
                        alunos_atualizados_count += 1
                        status_item = ImportacaoSIGStatusEnum.ATUALIZADO
                        detalhes_item = f"Dados cadastrais atualizados e vinculado à turma {turma_final}"
                    else:
                        # Novo aluno: cria com perfil 'aluno', primeiro_acesso=True e senha inicial
                        if not senha_padrao_hash:
                            senha_padrao_hash = hash_senha_inicial("Senac@123")

                        novo_usuario = models.Usuario(
                            matricula=mat,
                            nome=nome,
                            email=email,
                            senha_hash=senha_padrao_hash,
                            role="aluno",
                            curso=turma_db.nome_curso,
                            turma=turma_final,
                            ativo=True,
                            primeiro_acesso=True
                        )
                        db.add(novo_usuario)
                        db.flush()

                        usuario_id = novo_usuario.id
                        novos_alunos_count += 1
                        status_item = ImportacaoSIGStatusEnum.CRIADO
                        detalhes_item = f"Novo aluno cadastrado com sucesso na turma {turma_final}"

                    # C. Garantir vínculo na tabela associativa 'turma_alunos' (M:N)
                    # Verifica se a tabela turma_alunos existe no modelo
                    if hasattr(models, "TurmaAluno"):
                        vinculo_existente = db.query(models.TurmaAluno).filter(
                            models.TurmaAluno.turma_id == turma_final,
                            models.TurmaAluno.usuario_id == usuario_id
                        ).first()

                        if not vinculo_existente:
                            novo_vinculo = models.TurmaAluno(
                                turma_id=turma_final,
                                usuario_id=usuario_id
                            )
                            db.add(novo_vinculo)
                            db.flush()

                    alunos_processados.append(
                        AlunoImportadoItem(
                            matricula=mat,
                            nome=nome,
                            email=email,
                            status=status_item,
                            detalhes=detalhes_item
                        )
                    )

            # Transação concluída com sucesso
            db.commit()

        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            error_msg = str(e)
            if "UNIQUE constraint failed: usuarios.email" in error_msg or "usuarios_email_key" in error_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        "Conflito de unicidade de e-mail detectado. Um ou mais alunos na planilha "
                        "possuem e-mail já atribuído a outra matrícula no banco. "
                        "A transação foi totalmente revertida (ROLLBACK)."
                    )
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro crítico durante a importação da turma SIG: {error_msg}. Operação cancelada e revertida."
            )

        return ImportacaoSIGResponse(
            total_lidos=total_lidos,
            novos_alunos=novos_alunos_count,
            alunos_atualizados=alunos_atualizados_count,
            turma_codigo=turma_final,
            nome_curso=turma_db.nome_curso if turma_db else curso_final,
            erros=erros_e_avisos,
            alunos_processados=alunos_processados
        )


def processar_importacao_sig_stream(
    db: Session,
    file_bytes: bytes,
    filename: str,
    codigo_turma: Optional[str] = None,
    nome_curso: Optional[str] = None
) -> ImportacaoSIGResponse:
    """Função utilitária exposta para invocação direta via routers."""
    return SIGImporterService.processar_planilha(
        db=db,
        file_bytes=file_bytes,
        filename=filename,
        codigo_turma=codigo_turma,
        nome_curso=nome_curso
    )
