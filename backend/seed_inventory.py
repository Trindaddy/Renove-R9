import os
import sys
from sqlalchemy.orm import Session

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Notebook, Base, Historico
import schemas

def seed_inventory():
    db = SessionLocal()
    print("Iniciando a carga inicial de notebooks no inventário...")
    
    # Ranges de notebooks:
    # 1. Início 21 (Dell Latitude 5430): 21491 a 21520, 21581 a 21590, e 21770 a 21773.
    # 2. Início 29 (Dell Latitude 5450): 29673 a 29722.
    # 3. Início 37 (Dell Pro): 37568 a 37609.
    
    ranges = [
        # (inicio, fim, modelo, marca)
        (21491, 21520, "Dell Latitude 5430", "Dell"),
        (21581, 21590, "Dell Latitude 5430", "Dell"),
        (21770, 21773, "Dell Latitude 5430", "Dell"),
        (29673, 29722, "Dell Latitude 5450", "Dell"),
        (37568, 37609, "Dell Pro", "Dell")
    ]
    
    added_count = 0
    skipped_count = 0
    
    try:
        for start, end, model, brand in ranges:
            for pat_num in range(start, end + 1):
                patrimonio = str(pat_num)
                
                # Check if already exists
                exists = db.query(Notebook).filter(Notebook.patrimonio == patrimonio).first()
                if not exists:
                    nb = Notebook(
                        patrimonio=patrimonio,
                        modelo=model,
                        marca=brand,
                        local="Estoque",
                        status="Disponível",
                        condicao="Bom",
                        observacoes="Carga inicial automática"
                    )
                    db.add(nb)
                    db.flush() # Get the ID
                    
                    # Log in history
                    hist = Historico(
                        notebook_id=nb.id,
                        tipo_movimentacao="CADASTRO",
                        status_novo="Disponível",
                        descricao=f"Notebook {patrimonio} ({model}) cadastrado via carga inicial"
                    )
                    db.add(hist)
                    added_count += 1
                else:
                    skipped_count += 1
                    
        db.commit()
        print(f"Carga inicial concluída: {added_count} notebooks adicionados, {skipped_count} já existiam.")
    except Exception as e:
        db.rollback()
        print(f"Erro durante a carga de inventário: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_inventory()
