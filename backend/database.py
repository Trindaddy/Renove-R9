from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

def get_brasilia_time():
    return datetime.now(timezone(timedelta(hours=-3))).replace(tzinfo=None)

def get_sqlite_db_url(raw_url: str = None) -> str:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    default_db = os.path.join(BASE_DIR, "r9_notebooks.db")
    
    db_file = default_db
    if raw_url and raw_url.startswith("sqlite:///"):
        extracted = raw_url[len("sqlite:///"):]
        if extracted and extracted != ":memory:":
            db_file = os.path.abspath(extracted) if not os.path.isabs(extracted) else extracted

    # Testar se a pasta onde o banco está localizado permite transações de escrita
    # (Evita bloqueio do Windows Defender Acesso Controlado a Pastas / CFA em Documents)
    is_writable = False
    try:
        import sqlite3
        conn = sqlite3.connect(db_file)
        conn.execute("BEGIN IMMEDIATE")
        conn.rollback()
        conn.close()
        is_writable = True
    except Exception:
        is_writable = False

    if is_writable:
        return f"sqlite:///{db_file.replace('\\', '/')}"

    # Fallback seguro fora da pasta Documentos protegida pelo Windows Defender
    user_dir = os.path.join(os.path.expanduser("~"), ".renove")
    os.makedirs(user_dir, exist_ok=True)
    fallback_file = os.path.join(user_dir, "r9_notebooks.db")
    if not os.path.exists(fallback_file) and os.path.exists(default_db):
        import shutil
        shutil.copy2(default_db, fallback_file)
    
    return f"sqlite:///{fallback_file.replace('\\', '/')}"

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL.startswith("sqlite"):
    DATABASE_URL = get_sqlite_db_url(DATABASE_URL)

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Habilitar foreign keys no SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    if DATABASE_URL.startswith("sqlite"):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

def run_db_migrations():
    if not DATABASE_URL.startswith("sqlite"):
        return
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            # Check notebooks table columns
            result = conn.execute(text("PRAGMA table_info(notebooks)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "usuario_id" not in columns:
                print("Adding usuario_id column to notebooks table...")
                conn.execute(text("ALTER TABLE notebooks ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)"))
                conn.commit()
                print("Successfully added usuario_id column to notebooks table.")
            
            if columns and "justificativa_manutencao" not in columns:
                print("Adding justificativa_manutencao column to notebooks table...")
                conn.execute(text("ALTER TABLE notebooks ADD COLUMN justificativa_manutencao TEXT"))
                conn.commit()
                print("Successfully added justificativa_manutencao column to notebooks table.")

            if columns and "autor_manutencao" not in columns:
                print("Adding autor_manutencao column to notebooks table...")
                conn.execute(text("ALTER TABLE notebooks ADD COLUMN autor_manutencao VARCHAR(100)"))
                conn.commit()
                print("Successfully added autor_manutencao column to notebooks table.")
            
            if columns and "excluido" not in columns:
                print("Adding excluido column to notebooks table...")
                conn.execute(text("ALTER TABLE notebooks ADD COLUMN excluido BOOLEAN DEFAULT 0"))
                conn.commit()
                print("Successfully added excluido column to notebooks table.")
            
            # Check reservas table columns
            result = conn.execute(text("PRAGMA table_info(reservas)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "usuario_id" not in columns:
                print("Adding usuario_id column to reservas table...")
                conn.execute(text("ALTER TABLE reservas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)"))
                conn.commit()
                print("Successfully added usuario_id column to reservas table.")

            # Check historico table columns
            result = conn.execute(text("PRAGMA table_info(historico)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "ip_address" not in columns:
                print("Adding ip_address column to historico table...")
                conn.execute(text("ALTER TABLE historico ADD COLUMN ip_address VARCHAR(45)"))
                conn.commit()
                print("Successfully added ip_address column to historico table.")
            if columns and "user_agent" not in columns:
                print("Adding user_agent column to historico table...")
                conn.execute(text("ALTER TABLE historico ADD COLUMN user_agent VARCHAR(255)"))
                conn.commit()
                print("Successfully added user_agent column to historico table.")

            # Create solicitacoes_alocacao table if not exists
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS solicitacoes_alocacao (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    turma_id VARCHAR(50) NOT NULL REFERENCES turmas(codigo_turma) ON DELETE RESTRICT,
                    solicitante_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
                    responsavel_ti_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
                    justificativa TEXT NOT NULL,
                    motivo TEXT,
                    quantidade INTEGER DEFAULT 1,
                    local_uso VARCHAR(100),
                    data_necessidade VARCHAR(50),
                    periodo_letivo VARCHAR(50),
                    motivo_decisao TEXT,
                    status VARCHAR(20) NOT NULL DEFAULT 'Aberto',
                    data_decisao TIMESTAMP,
                    detalhes_alocacao TEXT,
                    visualizada_professor BOOLEAN DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            conn.commit()

            # Check solicitacoes_alocacao columns
            result = conn.execute(text("PRAGMA table_info(solicitacoes_alocacao)"))
            sol_cols = [row[1] for row in result.fetchall()]
            if sol_cols:
                if "motivo" not in sol_cols:
                    conn.execute(text("ALTER TABLE solicitacoes_alocacao ADD COLUMN motivo TEXT"))
                if "quantidade" not in sol_cols:
                    conn.execute(text("ALTER TABLE solicitacoes_alocacao ADD COLUMN quantidade INTEGER DEFAULT 1"))
                if "local_uso" not in sol_cols:
                    conn.execute(text("ALTER TABLE solicitacoes_alocacao ADD COLUMN local_uso VARCHAR(100)"))
                if "data_necessidade" not in sol_cols:
                    conn.execute(text("ALTER TABLE solicitacoes_alocacao ADD COLUMN data_necessidade VARCHAR(50)"))
                if "periodo_letivo" not in sol_cols:
                    conn.execute(text("ALTER TABLE solicitacoes_alocacao ADD COLUMN periodo_letivo VARCHAR(50)"))
                conn.commit()
    except Exception as e:
        print(f"Error running db migration: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

