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
from models import Base, Usuario, Notebook, Configuracao, Turma

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Usuários de teste
        if not db.query(Usuario).first():
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
        else:
            print("[INFO] Usuarios ja existentes.")

        # 2. Notebooks de teste (sequência exata de patrimônio: 37568 a 37608)
        if not db.query(Notebook).first():
            notebooks = []
            for patrimonio in range(37568, 37609):
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
        else:
            print("[INFO] Notebooks ja existentes.")

        # 3. Configurações
        if not db.query(Configuracao).first():
            # Contar notebooks cadastrados
            total_nbs = db.query(Notebook).count()
            configs = [
                Configuracao(chave="alerta_escassez_percentual", valor="10", descricao="Percentual mínimo de notebooks disponíveis para disparar alerta"),
                Configuracao(chave="tempo_maximo_emprestimo_horas", valor="4", descricao="Tempo máximo padrão de empréstimo em horas"),
                Configuracao(chave="quantidade_total_notebooks", valor=str(total_nbs), descricao="Quantidade total de notebooks no sistema"),
                Configuracao(chave="dia_alta_demanda", valor="False", descricao="Indica se hoje é um dia de alta demanda e restrições de inventário"),
                Configuracao(chave="limite_distribuicao_alta_demanda_percentual", valor="50", descricao="Percentual máximo de notebooks que podem ser emprestados em dias de alta demanda"),
            ]
            for c in configs:
                db.add(c)
            db.commit()
            print(f"[SUCCESS] {len(configs)} configuracoes criadas")
        else:
            print("[INFO] Configuracoes ja existentes.")

        # 4. Turmas de teste
        if not db.query(Turma).first():
            turmas = [
                Turma(codigo_turma="2025.09.53", nome_curso="Técnico em Administração", instrutor="André Alonso", carga_horaria=800, turno="Vespertino", regime_dias="3ª e 5ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2025.09.56", nome_curso="Técnico em Administração", instrutor="Marileia", carga_horaria=800, turno="Vespertino", regime_dias="3ª e 5ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2025.09.75", nome_curso="Técnico em Administração", instrutor="Marileia", carga_horaria=800, turno="Vespertino", regime_dias="3ª e 5ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2025.09.83", nome_curso="Técnico em Contabilidade", instrutor="José de Assis", carga_horaria=800, turno="Vespertino", regime_dias="3ª e 5ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2026.09.34", nome_curso="Técnico em Administração", instrutor="José Chaves", carga_horaria=800, turno="Noturno", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.55", nome_curso="Técnico em Desenvolvimento de Sistemas", instrutor="Lucas Dionisio", carga_horaria=1200, turno="Vespertino", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.56", nome_curso="Técnico em Marketing", instrutor="Carlos Eduardo", carga_horaria=800, turno="Noturno", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.58", nome_curso="Técnico em Desenvolvimento de Sistemas", instrutor="Ricardo Serra", carga_horaria=1200, turno="Vespertino", regime_dias="2ª e 4ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.59", nome_curso="Técnico em Desenvolvimento de Sistemas", instrutor="Diego Lohan", carga_horaria=1200, turno="Matutino", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.65", nome_curso="Técnico em Marketing", instrutor="Lucas Augusto", carga_horaria=800, turno="Vespertino", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.69", nome_curso="Técnico em Administração", instrutor="Marileia", carga_horaria=800, turno="Matutino", regime_dias="3ª e 5ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2026.09.77", nome_curso="Técnico em Administração", instrutor="José de Assis", carga_horaria=800, turno="Vespertino", regime_dias="2ª e 4ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2026.09.78", nome_curso="Técnico em Administração", instrutor="Shirllany", carga_horaria=800, turno="Vespertino", regime_dias="2ª e 4ª Presencial (sabado remoto)"),
                Turma(codigo_turma="2026.09.79", nome_curso="Técnico em Desenvolvimento de Sistemas", instrutor="Wellerson", carga_horaria=1200, turno="Vespertino", regime_dias="3ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2025.09.119", nome_curso="Técnico em Desenvolvimento de Sistemas", instrutor="Guilherme", carga_horaria=1200, turno="Matutino", regime_dias="2ª e 5ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2025.09.121", nome_curso="Técnico em Marketing", instrutor="Lucas Augusto", carga_horaria=800, turno="Matutino", regime_dias="2ª e 4ª Presencial (sexta remoto)"),
                Turma(codigo_turma="2026.09.67", nome_curso="Técnico em Programação de Jogos Digitais", instrutor="Nicole Candido", carga_horaria=1000, turno="Matutino", regime_dias="3ª e 5ª Presencial (sexta remoto)")
            ]
            for t in turmas:
                db.add(t)
            db.commit()
            print(f"[SUCCESS] {len(turmas)} turmas criadas")
        else:
            print("[INFO] Turmas ja existentes.")

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

