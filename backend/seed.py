"""
R9 - Seed de dados para teste
Execute: python seed.py
"""
from passlib.context import CryptContext
import sys
import os
import logging
# Isso silencia o aviso de erro de versão que não impede o funcionamento
logging.getLogger("passlib").setLevel(logging.ERROR) 

# Certifique-se de que o pwd_context está assim:
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import SessionLocal, engine
from models import Base, Usuario, Notebook, Configuracao

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Verificar se já tem dados
        if db.query(Usuario).first():
            print("[INFO] Banco ja possui dados. Seed ignorado.")
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
        print(f"[SUCCESS] {len(usuarios)} usuarios criados")
        
        # Notebooks de teste (sequência exata de patrimônio: 37568 a 37608)
        # Requisitos: loop limpo + commit.
        notebooks = []

        for patrimonio in range(37568, 37609):
            # Modelos/locais simples para variar visualmente os dados
            if patrimonio % 5 == 0:
                local = "Manutenção"
                status = "Manutenção"
                condicao = "Regular"
                observacoes = "Setup de manutenção (seed)"
            elif patrimonio % 7 == 0:
                local = "Estoque"
                status = "Disponível"
                condicao = "Novo"
                observacoes = None
            else:
                local = "Lab 1" if patrimonio % 2 == 0 else "Lab 2"
                status = "Disponível"
                condicao = "Bom"
                observacoes = None

            notebooks.append(
                Notebook(
                    patrimonio=str(patrimonio),
                    modelo="Dell Latitude 3420" if patrimonio % 3 != 0 else "Lenovo ThinkPad E14",
                    marca="Dell" if patrimonio % 3 != 0 else "Lenovo",
                    local=local,
                    status=status,
                    condicao=condicao,
                    observacoes=observacoes,
                )
            )

        db.add_all(notebooks)
        db.commit()
        print(f"[SUCCESS] {len(notebooks)} notebooks criados (37568..37608)")

        
        # Configurações
        configs = [
            Configuracao(chave="alerta_escassez_percentual", valor="10", descricao="Percentual mínimo de notebooks disponíveis para disparar alerta"),
            Configuracao(chave="tempo_maximo_emprestimo_horas", valor="4", descricao="Tempo máximo padrão de empréstimo em horas"),
            Configuracao(chave="quantidade_total_notebooks", valor=str(len(notebooks)), descricao="Quantidade total de notebooks no sistema"),
            Configuracao(chave="dia_alta_demanda", valor="False", descricao="Indica se hoje é um dia de alta demanda e restrições de inventário"),
            Configuracao(chave="limite_distribuicao_alta_demanda_percentual", valor="50", descricao="Percentual máximo de notebooks que podem ser emprestados em dias de alta demanda"),
        ]
        
        for c in configs:
            db.add(c)
        db.commit()
        print(f"[SUCCESS] {len(configs)} configuracoes criadas")
        
        print("\n[SUCCESS] Seed concluido com sucesso!")
        print("\nCredenciais de teste:")
        print("  TI:       ti@senac.br / senha123")
        print("  Professor: professor@senac.br / senha123")
        print("  Aluno:     aluno@senac.br / senha123")
        
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Erro no seed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()

