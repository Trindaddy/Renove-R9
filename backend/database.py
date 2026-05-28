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
            
            # Check reservas table columns
            result = conn.execute(text("PRAGMA table_info(reservas)"))
            columns = [row[1] for row in result.fetchall()]
            if columns and "usuario_id" not in columns:
                print("Adding usuario_id column to reservas table...")
                conn.execute(text("ALTER TABLE reservas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)"))
                conn.commit()
                print("Successfully added usuario_id column to reservas table.")
    except Exception as e:
        print(f"Error running db migration: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

