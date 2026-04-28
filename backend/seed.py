"""
R9 - Seed de dados para teste
Execute: python seed.py
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, engine
from models import Base, Usuario, Notebook, Configuracao
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Verificar se já tem dados
        if db.query(Usuario).first():
            print("⚠️  Banco já possui dados. Seed ignorado.")
            return
        
        # Usuários de teste
        usuarios = [
            Usuario(
                matricula="TI001",
                nome="Administrador TI",
                email="ti@senac.br",
                senha_hash=pwd_context.hash("senha123"),
                role="ti",
                ativo=True
            ),
            Usuario(
                matricula="PROF001",
                nome="Prof. Carlos Silva",
                email="professor@senac.br",
                senha_hash=pwd_context.hash("senha123"),
                role="professor",
                curso="Técnico em Informática",
                ativo=True
            ),
            Usuario(
                matricula="ALU001",
                nome="João Pereira",
                email="aluno@senac.br",
                senha_hash=pwd_context.hash("senha123"),
                role="aluno",
                curso="Técnico em Informática",
                turma="TI-2024-A",
                ativo=True
            ),
            Usuario(
                matricula="ALU002",
                nome="Maria Santos",
                email="maria@senac.br",
                senha_hash=pwd_context.hash("senha123"),
                role="aluno",
                curso="Técnico em Informática",
                turma="TI-2024-A",
                ativo=True
            ),
            Usuario(
                matricula="ALU003",
                nome="Pedro Costa",
                email="pedro@senac.br",
                senha_hash=pwd_context.hash("senha123"),
                role="aluno",
                curso="Técnico em Informática",
                turma="TI-2024-B",
                ativo=True
            ),
        ]
        
        for u in usuarios:
            db.add(u)
        db.commit()
        print(f"✅ {len(usuarios)} usuários criados")
        
        # Notebooks de teste
        notebooks = [
            Notebook(patrimonio="NB-001", modelo="Dell Latitude 3420", marca="Dell", local="Lab 1", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-002", modelo="Dell Latitude 3420", marca="Dell", local="Lab 1", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-003", modelo="Dell Latitude 3420", marca="Dell", local="Lab 1", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-004", modelo="Dell Latitude 3420", marca="Dell", local="Lab 1", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-005", modelo="Dell Latitude 3420", marca="Dell", local="Lab 1", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-006", modelo="Dell Latitude 3420", marca="Dell", local="Lab 2", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-007", modelo="Dell Latitude 3420", marca="Dell", local="Lab 2", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-008", modelo="Dell Latitude 3420", marca="Dell", local="Lab 2", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-009", modelo="Dell Latitude 3420", marca="Dell", local="Lab 2", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-010", modelo="Dell Latitude 3420", marca="Dell", local="Lab 2", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-011", modelo="Lenovo ThinkPad E14", marca="Lenovo", local="Estoque", status="Disponível", condicao="Novo"),
            Notebook(patrimonio="NB-012", modelo="Lenovo ThinkPad E14", marca="Lenovo", local="Estoque", status="Disponível", condicao="Novo"),
            Notebook(patrimonio="NB-013", modelo="Lenovo ThinkPad E14", marca="Lenovo", local="Estoque", status="Disponível", condicao="Novo"),
            Notebook(patrimonio="NB-014", modelo="Lenovo ThinkPad E14", marca="Lenovo", local="Estoque", status="Disponível", condicao="Novo"),
            Notebook(patrimonio="NB-015", modelo="Lenovo ThinkPad E14", marca="Lenovo", local="Estoque", status="Disponível", condicao="Novo"),
            Notebook(patrimonio="NB-016", modelo="HP ProBook 440", marca="HP", local="Manutenção", status="Manutenção", condicao="Regular", observacoes="Troca de teclado"),
            Notebook(patrimonio="NB-017", modelo="HP ProBook 440", marca="HP", local="Manutenção", status="Manutenção", condicao="Ruim", observacoes="Problema na placa mãe"),
            Notebook(patrimonio="NB-018", modelo="HP ProBook 440", marca="HP", local="Lab 3", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-019", modelo="HP ProBook 440", marca="HP", local="Lab 3", status="Disponível", condicao="Bom"),
            Notebook(patrimonio="NB-020", modelo="HP ProBook 440", marca="HP", local="Lab 3", status="Disponível", condicao="Bom"),
        ]
        
        for n in notebooks:
            db.add(n)
        db.commit()
        print(f"✅ {len(notebooks)} notebooks criados")
        
        # Configurações
        configs = [
            Configuracao(chave="alerta_escassez_percentual", valor="10", descricao="Percentual mínimo de notebooks disponíveis para disparar alerta"),
            Configuracao(chave="tempo_maximo_emprestimo_horas", valor="4", descricao="Tempo máximo padrão de empréstimo em horas"),
            Configuracao(chave="quantidade_total_notebooks", valor=str(len(notebooks)), descricao="Quantidade total de notebooks no sistema"),
        ]
        
        for c in configs:
            db.add(c)
        db.commit()
        print(f"✅ {len(configs)} configurações criadas")
        
        print("\n🎉 Seed concluído com sucesso!")
        print("\nCredenciais de teste:")
        print("  TI:       ti@senac.br / senha123")
        print("  Professor: professor@senac.br / senha123")
        print("  Aluno:     aluno@senac.br / senha123")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Erro no seed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()

