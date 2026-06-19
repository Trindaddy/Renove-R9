import sqlite3
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
db_path = 'C:/Users/calebe.carvalho/OneDrive - SERVICO NACIONAL DE APRENDIZAGEM COMERCIAL DN-7170257-SENAC - DF/Documentos/Renove/Renove-R9/backend/r9_notebooks.db'

def run_migration():
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    try:
        print("=== INICIANDO MIGRAÇÃO DE PRIMEIRO ACESSO ===")
        
        # 1. Verificar se coluna primeiro_acesso existe
        cur.execute("PRAGMA table_info(usuarios);")
        columns = [col[1] for col in cur.fetchall()]
        
        if 'primeiro_acesso' not in columns:
            print("Adicionando coluna 'primeiro_acesso' à tabela usuarios...")
            cur.execute("ALTER TABLE usuarios ADD COLUMN primeiro_acesso BOOLEAN DEFAULT 1;")
            conn.commit()
            print("[SUCCESS] Coluna adicionada.")
        else:
            print("[INFO] A coluna 'primeiro_acesso' já existe.")
            
        # 2. Atualizar usuários pré-existentes para primeiro_acesso = 0 (False)
        # para que quem já tem conta ativa e senha definida não passe pelo fluxo novamente
        print("Definindo primeiro_acesso = 0 para contas pré-existentes...")
        cur.execute("UPDATE usuarios SET primeiro_acesso = 0 WHERE email != 'novo.usuario@edu.df.senac.br';")
        conn.commit()
        print("[SUCCESS] Contas pré-existentes atualizadas.")
        
        # 3. Criar ou resetar o usuário de homologação 'novo.usuario@edu.df.senac.br'
        temp_pwd_hash = pwd_context.hash("SNC@1234")
        
        cur.execute("SELECT id FROM usuarios WHERE email = 'novo.usuario@edu.df.senac.br'")
        user_test = cur.fetchone()
        
        if not user_test:
            print("Criando usuário de teste de Primeiro Acesso (novo.usuario@edu.df.senac.br)...")
            cur.execute("""
                INSERT INTO usuarios (matricula, nome, email, senha_hash, role, curso, turma, ativo, primeiro_acesso)
                VALUES ('ALU_NOVO_01', 'Novo Estudante Teste', 'novo.usuario@edu.df.senac.br', ?, 'aluno', 'Técnico em Informática', 'TI-2024-A', 1, 1)
            """, (temp_pwd_hash,))
            print("[SUCCESS] Usuário de teste criado.")
        else:
            print("Usuário de teste já existe. Resetando senha para 'SNC@1234' e primeiro_acesso = 1...")
            cur.execute("""
                UPDATE usuarios 
                SET senha_hash = ?, primeiro_acesso = 1, ativo = 1 
                WHERE email = 'novo.usuario@edu.df.senac.br'
            """, (temp_pwd_hash,))
            print("[SUCCESS] Usuário de teste resetado.")
            
        conn.commit()
        print("=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===")
        
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Falha na migração: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
