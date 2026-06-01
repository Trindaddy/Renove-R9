import sqlite3
import os

def run_migration():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "r9_notebooks.db")
    print(f"Connecting to database at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # Disable foreign key checks temporarily to allow renaming tables smoothly
        cur.execute("PRAGMA foreign_keys = OFF")
        
        # --- 1. Migrate emprestimos table ---
        cur.execute("SELECT * FROM emprestimos")
        emp_cols = [col[0] for col in cur.description]
        emp_rows = cur.fetchall()
        
        cur.execute("ALTER TABLE emprestimos RENAME TO emprestimos_old")
        print("Renamed emprestimos table.")
        
        # Create new table referencing notebooks instead of notebooks_old
        cur.execute("""
        CREATE TABLE emprestimos (
            id INTEGER NOT NULL, 
            notebook_id INTEGER NOT NULL, 
            usuario_id INTEGER NOT NULL, 
            responsavel_id INTEGER, 
            status VARCHAR(20) NOT NULL, 
            data_emprestimo DATETIME, 
            data_prevista_devolucao DATETIME, 
            data_devolucao DATETIME, 
            observacao_saida TEXT, 
            observacao_devolucao TEXT, 
            motivo VARCHAR(50), 
            PRIMARY KEY (id), 
            CONSTRAINT check_emprestimo_status CHECK (status IN ('Pendente', 'Ativo', 'Devolvido', 'Atrasado', 'Cancelado')), 
            FOREIGN KEY(notebook_id) REFERENCES notebooks (id) ON DELETE RESTRICT, 
            FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT, 
            FOREIGN KEY(responsavel_id) REFERENCES usuarios (id) ON DELETE RESTRICT
        )
        """)
        print("Recreated emprestimos table.")
        
        # Copy data back
        emp_cols_str = ", ".join(emp_cols)
        emp_placeholders = ", ".join(["?"] * len(emp_cols))
        cur.executemany(f"INSERT INTO emprestimos ({emp_cols_str}) VALUES ({emp_placeholders})", emp_rows)
        print("Restored data to new emprestimos table.")
        
        cur.execute("DROP TABLE emprestimos_old")
        print("Dropped old emprestimos table.")
        
        # --- 2. Migrate historico table ---
        cur.execute("SELECT * FROM historico")
        hist_cols = [col[0] for col in cur.description]
        hist_rows = cur.fetchall()
        
        cur.execute("ALTER TABLE historico RENAME TO historico_old")
        print("Renamed historico table.")
        
        # Create new table referencing notebooks instead of notebooks_old
        cur.execute("""
        CREATE TABLE historico (
            id INTEGER NOT NULL, 
            notebook_id INTEGER NOT NULL, 
            usuario_id INTEGER, 
            responsavel_id INTEGER, 
            tipo_movimentacao VARCHAR(30) NOT NULL, 
            status_anterior VARCHAR(20), 
            status_novo VARCHAR(20), 
            descricao TEXT, 
            informacoes_adicionais TEXT, 
            created_at DATETIME, 
            PRIMARY KEY (id), 
            CONSTRAINT check_historico_tipo CHECK (tipo_movimentacao IN ('EMPRESTIMO', 'DEVOLUCAO', 'MANUTENCAO_ENTRADA', 'MANUTENCAO_SAIDA', 'RESERVA', 'CANCELAMENTO', 'CADASTRO', 'ATUALIZACAO', 'ALERTA_ESCASSEZ')), 
            FOREIGN KEY(notebook_id) REFERENCES notebooks (id) ON DELETE RESTRICT, 
            FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT, 
            FOREIGN KEY(responsavel_id) REFERENCES usuarios (id) ON DELETE RESTRICT
        )
        """)
        print("Recreated historico table.")
        
        # Copy data back
        hist_cols_str = ", ".join(hist_cols)
        hist_placeholders = ", ".join(["?"] * len(hist_cols))
        cur.executemany(f"INSERT INTO historico ({hist_cols_str}) VALUES ({hist_placeholders})", hist_rows)
        print("Restored data to new historico table.")
        
        cur.execute("DROP TABLE historico_old")
        print("Dropped old historico table.")
        
        cur.execute("PRAGMA foreign_keys = ON")
        conn.commit()
        print("All tables and foreign keys migrated and verified successfully!")
    except Exception as e:
        conn.rollback()
        print("Error during FK repair migration:", e)
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
