import sqlite3
import os

def run_migration():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "r9_notebooks.db")
    print(f"Connecting to database at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # 1. Add excluido column to notebooks if it does not exist
        cur.execute("PRAGMA table_info(notebooks)")
        nb_columns = [col[1] for col in cur.fetchall()]
        if "excluido" not in nb_columns:
            print("Adding 'excluido' column to notebooks table...")
            cur.execute("ALTER TABLE notebooks ADD COLUMN excluido BOOLEAN DEFAULT 0")
            print("Successfully added 'excluido' column.")
        else:
            print("'excluido' column already exists in notebooks.")

        # 2. Recreate emprestimos table to support 'Reservado' check constraint
        cur.execute("PRAGMA table_info(emprestimos)")
        emp_columns_info = cur.fetchall()
        emp_columns = [col[1] for col in emp_columns_info]
        
        cur.execute("SELECT * FROM emprestimos")
        emp_rows = cur.fetchall()
        print(f"Fetched {len(emp_rows)} loan records to migrate.")
        
        # Rename existing table
        cur.execute("ALTER TABLE emprestimos RENAME TO emprestimos_old")
        print("Renamed emprestimos table to emprestimos_old.")
        
        # Create new table with updated check constraint
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
            CONSTRAINT check_emprestimo_status CHECK (status IN ('Pendente', 'Reservado', 'Ativo', 'Devolvido', 'Atrasado', 'Cancelado')), 
            FOREIGN KEY(notebook_id) REFERENCES notebooks (id) ON DELETE RESTRICT, 
            FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT, 
            FOREIGN KEY(responsavel_id) REFERENCES usuarios (id) ON DELETE RESTRICT
        )
        """)
        print("Created new emprestimos table with 'Reservado' support.")
        
        # Copy data back
        cols_str = ", ".join(emp_columns)
        placeholders = ", ".join(["?"] * len(emp_columns))
        cur.executemany(f"INSERT INTO emprestimos ({cols_str}) VALUES ({placeholders})", emp_rows)
        print("Copied loan records back.")
        
        # Drop old table
        cur.execute("DROP TABLE emprestimos_old")
        print("Dropped emprestimos_old table.")
        
        conn.commit()
        print("Migration executed and committed successfully!")
    except Exception as e:
        conn.rollback()
        print("Error during migration, rolled back changes:", e)
        raise e
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
