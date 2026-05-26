import sqlite3

def seed_instructors():
    db_path = "backend/r9_notebooks.db"
    print(f"Connecting to database at {db_path} to seed instructors...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    mapping = {
        "2025.09.53": "André Alonso",
        "2025.09.56": "Marileia",
        "2025.09.75": "Marileia",
        "2026.09.69": "Marileia",
        "2025.09.83": "José de Assis",
        "2026.09.77": "José de Assis",
        "2026.09.34": "José Chaves",
        "2026.09.55": "Lucas Dionisio",
        "2026.09.56": "Carlos Eduardo",
        "2026.09.58": "Ricardo Serra",
        "2026.09.59": "Diego Lohan",
        "2026.09.65": "Lucas Augusto",
        "2025.09.121": "Lucas Augusto",
        "2026.09.78": "Shirllany",
        "2026.09.79": "Wellerson",
        "2025.09.119": "Guilherme",
        "2026.09.67": "Nicole Candido"
    }

    try:
        for codigo_turma, instrutor in mapping.items():
            cursor.execute(
                "UPDATE turmas SET instrutor = ? WHERE codigo_turma = ?",
                (instrutor, codigo_turma)
            )
        conn.commit()
        print("Definitive instructors loaded successfully!")
        
        # Verify the seeding
        cursor.execute("SELECT codigo_turma, nome_curso, instrutor FROM turmas")
        rows = cursor.fetchall()
        print("\n--- Current seeded Turmas ---")
        for row in rows:
            print(f"Turma: {row[0]} | Curso: {row[1]} | Instrutor: {row[2]}")
            
    except Exception as e:
        print("An error occurred during instructor seeding:", e)
    finally:
        conn.close()

if __name__ == "__main__":
    seed_instructors()
