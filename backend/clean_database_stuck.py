import sqlite3

db_path = r"C:\Users\calebe.carvalho\OneDrive - SERVICO NACIONAL DE APRENDIZAGEM COMERCIAL DN-7170257-SENAC - DF\Documentos\Renove\Renove-R9\backend\r9_notebooks.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Update notebooks status
cursor.execute("UPDATE notebooks SET status = 'Disponível', usuario_id = NULL WHERE status IN ('Reservado', 'Reservado (Em Lote)')")
notebooks_updated = cursor.rowcount
print(f"Updated {notebooks_updated} notebooks back to 'Disponível'.")

# 2. Delete pending reserved loans
cursor.execute("DELETE FROM emprestimos WHERE status = 'Reservado'")
loans_deleted = cursor.rowcount
print(f"Deleted {loans_deleted} pending 'Reservado' loans.")

# 3. Double check counts
print("\n=== NOTEBOOK STATUS COUNTS ===")
cursor.execute("SELECT status, COUNT(*) FROM notebooks GROUP BY status")
for row in cursor.fetchall():
    print(f"Status: {row[0]}, Count: {row[1]}")

print("\n=== RESERVATIONS ===")
cursor.execute("SELECT COUNT(*) FROM reservas")
print(f"Total reservations: {cursor.fetchone()[0]}")

print("\n=== LOANS BY STATUS ===")
cursor.execute("SELECT status, COUNT(*) FROM emprestimos GROUP BY status")
for row in cursor.fetchall():
    print(f"Status: {row[0]}, Count: {row[1]}")

conn.commit()
conn.close()
print("\nDatabase cleaned successfully.")
