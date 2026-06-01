import sqlite3
import os

def run_migration():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(BASE_DIR, "r9_notebooks.db")
    print(f"Connecting to database at {db_path}...")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # 1. Fetch current notebooks data
        cur.execute("SELECT * FROM notebooks")
        columns = [col[0] for col in cur.description]
        rows = cur.fetchall()
        print(f"Fetched {len(rows)} notebooks to migrate.")
        
        # 2. Rename existing table
        cur.execute("ALTER TABLE notebooks RENAME TO notebooks_old")
        print("Renamed notebooks table to notebooks_old.")
        
        # 3. Create new notebooks table with updated status constraint
        cur.execute("""
        CREATE TABLE notebooks (
            id INTEGER NOT NULL, 
            patrimonio VARCHAR(30) NOT NULL, 
            modelo VARCHAR(100) NOT NULL, 
            marca VARCHAR(50), 
            local VARCHAR(50), 
            status VARCHAR(20) NOT NULL, 
            condicao VARCHAR(20), 
            observacoes TEXT, 
            created_at DATETIME, 
            updated_at DATETIME, 
            usuario_id INTEGER, 
            justificativa_manutencao TEXT, 
            autor_manutencao VARCHAR(100), 
            PRIMARY KEY (id), 
            CONSTRAINT check_notebook_status CHECK (status IN ('Disponível', 'Emprestado', 'Manutenção', 'Reservado', 'Reservado (Em Lote)')), 
            CONSTRAINT check_notebook_condicao CHECK (condicao IN ('Novo', 'Bom', 'Regular', 'Ruim')), 
            FOREIGN KEY(usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
        )
        """)
        print("Created new notebooks table with Reservado (Em Lote) support.")
        
        # 4. Copy data back
        cols_str = ", ".join(columns)
        placeholders = ", ".join(["?"] * len(columns))
        cur.executemany(f"INSERT INTO notebooks ({cols_str}) VALUES ({placeholders})", rows)
        print("Copied notebooks data back.")
        
        # 5. Drop old table
        cur.execute("DROP TABLE notebooks_old")
        print("Dropped notebooks_old table.")
        
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
