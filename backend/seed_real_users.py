import os
import sys
from passlib.context import CryptContext

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models import Usuario, Turma

# Contexto de hash do main.py
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed_real_users():
    db = SessionLocal()
    try:
        print("=== INICIANDO SEED DE USUARIOS REAIS (SEM QUEBRA DE FK) ===")
        
        # 1. Atualizar contas de teste/fictícias existentes in-place
        updates = {
            1: {"email": "ti@df.senac.br", "nome": "Administrador TI", "role": "ti", "matricula": "TI001", "turma": None},
            2: {"email": "alysson@df.senac.br", "nome": "Alysson Santos", "role": "professor", "matricula": "PROF002", "turma": None},
            3: {"email": "joao.pereira@edu.df.senac.br", "nome": "João Pereira", "role": "aluno", "matricula": "ALU001", "turma": "2026.09.55"},
            4: {"email": "maria.santos@edu.df.senac.br", "nome": "Maria Santos", "role": "aluno", "matricula": "ALU002", "turma": "2026.09.55"},
            5: {"email": "pedro.costa@edu.df.senac.br", "nome": "Pedro Costa", "role": "aluno", "matricula": "ALU003", "turma": "2025.09.53"},
        }
        
        for uid, data in updates.items():
            user = db.query(Usuario).filter(Usuario.id == uid).first()
            if user:
                print(f"[UPDATE] Atualizando ID {uid}: {user.email} -> {data['email']}")
                user.email = data["email"]
                user.nome = data["nome"]
                user.role = data["role"]
                user.matricula = data["matricula"]
                user.turma = data["turma"]
                user.senha_hash = pwd_context.hash("Senac@2025")
                user.ativo = True
        db.commit()

        # 2. Cadastro dos outros Professores Reais se não existirem
        professores_novos = [
            {"matricula": "PROF003", "nome": "Anderson Silva", "email": "anderson@df.senac.br"},
            {"matricula": "PROF004", "nome": "Vanderson Souza", "email": "vanderson@df.senac.br"},
            {"matricula": "PROF005", "nome": "Abner Oliveira", "email": "abner@df.senac.br"},
            {"matricula": "PROF006", "nome": "André Alonso", "email": "andre.alonso@df.senac.br"},
            {"matricula": "PROF007", "nome": "Marileia Souza", "email": "marileia@df.senac.br"},
            {"matricula": "PROF008", "nome": "José de Assis", "email": "jose.assis@df.senac.br"},
            {"matricula": "PROF009", "nome": "José Chaves", "email": "jose.chaves@df.senac.br"},
            {"matricula": "PROF010", "nome": "Lucas Dionisio", "email": "lucas.dionisio@df.senac.br"},
            {"matricula": "PROF011", "nome": "Carlos Eduardo", "email": "carlos.eduardo@df.senac.br"},
            {"matricula": "PROF012", "nome": "Ricardo Serra", "email": "ricardo.serra@df.senac.br"},
            {"matricula": "PROF013", "nome": "Diego Lohan", "email": "diego.lohan@df.senac.br"},
            {"matricula": "PROF014", "nome": "Lucas Augusto", "email": "lucas.augusto@df.senac.br"},
        ]

        for p_info in professores_novos:
            p_exist = db.query(Usuario).filter(Usuario.email == p_info["email"]).first()
            if not p_exist:
                print(f"[INSERT] Criando professor real: {p_info['nome']} ({p_info['email']})")
                professor = Usuario(
                    matricula=p_info["matricula"],
                    nome=p_info["nome"],
                    email=p_info["email"],
                    senha_hash=pwd_context.hash("Senac@2025"),
                    role="professor",
                    ativo=True
                )
                db.add(professor)
            else:
                # Caso já exista mas esteja inativo ou com matricula diferente, atualiza
                print(f"[INFO] Professor {p_info['nome']} ja cadastrado. Atualizando dados.")
                p_exist.nome = p_info["nome"]
                p_exist.matricula = p_info["matricula"]
                p_exist.role = "professor"
                p_exist.ativo = True
        db.commit()

        # 3. Vincular instrutores das turmas aos professores reais cadastrados (normalizar nomes)
        # Ex: "Marileia" -> "Marileia Souza"
        turmas = db.query(Turma).all()
        for t in turmas:
            if t.instrutor == "Marileia":
                print(f"[UPDATE TURMA] Atualizando instrutor da turma {t.codigo_turma}: Marileia -> Marileia Souza")
                t.instrutor = "Marileia Souza"
        db.commit()

        print("=== SEED DE USUARIOS REAIS CONCLUIDO COM SUCESSO ===")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Erro durante o seed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_real_users()
