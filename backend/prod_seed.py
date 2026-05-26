"""
Renove - Script de Inicialização (Seed) de Produção
Cria apenas o administrador de TI inicial se não existir no banco.
Execute: python prod_seed.py
"""
import os
import sys
from passlib.context import CryptContext

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Usuario, Configuracao, Turma

# Usar contexto idêntico ao do main.py
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def seed_prod():
    db = SessionLocal()
    try:
        # 1. Configurar administrador de TI padrão
        admin_email = os.getenv("ADMIN_EMAIL", "ti@senac.br")
        admin_password = os.getenv("ADMIN_PASSWORD", "SNC@1234")
        admin_matricula = os.getenv("ADMIN_MATRICULA", "TI001")
        admin_nome = os.getenv("ADMIN_NOME", "Administrador TI")

        exists = db.query(Usuario).filter(Usuario.email == admin_email).first()
        if not exists:
            admin = Usuario(
                matricula=admin_matricula,
                nome=admin_nome,
                email=admin_email,
                senha_hash=pwd_context.hash(admin_password),
                role="ti",
                ativo=True
            )
            db.add(admin)
            db.commit()
            print(f"[SUCCESS] Usuario administrador inicial ({admin_email}) criado com sucesso!")
        else:
            print(f"[INFO] Usuario administrador ({admin_email}) ja existe.")

        # 2. Configurações essenciais (se não existirem)
        configuracoes_obrigatorias = [
            ("alerta_escassez_percentual", "10", "Percentual mínimo de notebooks disponíveis para disparar alerta"),
            ("tempo_maximo_emprestimo_horas", "4", "Tempo máximo padrão de empréstimo em horas"),
            ("dia_alta_demanda", "False", "Indica se hoje é um dia de alta demanda e restrições de inventário"),
            ("limite_distribuicao_alta_demanda_percentual", "50", "Percentual máximo de notebooks que podem ser emprestados em dias de alta demanda")
        ]

        for chave, valor, descricao in configuracoes_obrigatorias:
            config_exist = db.query(Configuracao).filter(Configuracao.chave == chave).first()
            if not config_exist:
                nova_config = Configuracao(chave=chave, valor=valor, descricao=descricao)
                db.add(nova_config)
                db.commit()
                print(f"[SUCCESS] Configuracao '{chave}' criada com valor inicial '{valor}'.")

        # 3. Turmas de produção (se não existirem)
        exists_turma = db.query(Turma).first()
        if not exists_turma:
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
            print("[SUCCESS] Turmas de producao criadas com sucesso!")
        else:
            print("[INFO] Turmas de producao ja existem.")

        print("[SUCCESS] Seed de producao concluido.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Erro ao rodar seed de producao: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_prod()
