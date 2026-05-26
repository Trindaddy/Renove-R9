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
from models import Usuario, Configuracao

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

        print("[SUCCESS] Seed de producao concluido.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Erro ao rodar seed de producao: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_prod()
