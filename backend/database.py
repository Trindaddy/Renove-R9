from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

def get_brasilia_time():
    return datetime.now(timezone(timedelta(hours=-3))).replace(tzinfo=None)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL == "sqlite://" or DATABASE_URL == "sqlite:///:memory:":
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "r9_notebooks.db").replace("\\", "/")
    DATABASE_URL = f"sqlite:///{db_path}"

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

