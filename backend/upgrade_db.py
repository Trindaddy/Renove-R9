import sqlite3

def run_migration():
    db_path = "backend/r9_notebooks.db"
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(reservas)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if "usuario_id" not in columns:
            print("Adding 'usuario_id' column to 'reservas' table...")
            cursor.execute("ALTER TABLE reservas ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)")
            conn.commit()
            print("Successfully added 'usuario_id' column!")
        else:
            print("Column 'usuario_id' already exists in 'reservas' table.")
    except Exception as e:
        print("An error occurred during database migration:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
