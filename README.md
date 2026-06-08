# R9 - Renove: Sistema de Gestão de Notebooks

Sistema completo para gerenciamento de empréstimo de notebooks do Senac, com backend Python/FastAPI, banco de dados SQLite e interface React no estilo **Dark Tech Premium**.

---

## 🏗️ Estrutura do Projeto

```
Renove-R9/
├── backend/                    # API Python (FastAPI)
│   ├── main.py                 # Aplicação principal e rotas
│   ├── database.py             # Conexão SQLAlchemy & Session
│   ├── models.py               # Modelos ORM (SQLite)
│   ├── schemas.py              # Validação Pydantic
│   ├── crud.py                 # Regras de negócio e transações
│   ├── alertas.py              # Monitoramento de escassez
│   ├── websocket.py            # Comunicação em tempo real
│   ├── seed.py                 # Seed dos dados principais
│   ├── requirements.txt        # Dependências do Python
│   ├── .env.example            # Exemplo de configurações de ambiente
│   └── r9_notebooks.db         # Banco de dados SQLite de produção local
│
├── src/                        # Frontend React (Vite)
│   ├── components/             # Componentes reutilizáveis (Input, Button, Badges)
│   ├── pages/                  # Páginas da aplicação
│   │   ├── Home.jsx            # Dashboard principal com atalhos de TI
│   │   ├── Login.jsx           # Tela de login e fluxo de recuperação reativo
│   │   ├── Equipamentos.jsx    # Inventário e controle de condições
│   │   ├── Usuarios.jsx        # Controle de usuários (exclusivo TI)
│   │   ├── Alocacoes.jsx       # Reservas e Alocações diárias
│   │   ├── Historico.jsx       # Log completo de movimentações
│   │   └── ...
│   ├── services/               # API clients (axios / endpoints)
│   ├── styles/                 # Estilização (Tailwind CSS)
│   └── ...
```

---

## 🎨 Design System: Dark Tech Premium

O sistema utiliza a estética **Glassmorphism** com gradientes neon sobre fundo escuro:

| Elemento | Valor | Rótulo/Uso |
|----------|-------|------------|
| Fundo Principal | `#0a192f` | Deep Navy |
| Cartões / Painéis | `#172a45` | Glassmorphism translúcido |
| Rótulo Destaque | `#64ffda` | Cyan / Aqua Neon |
| Chamada (CTA) | `#ff9f43` | Laranja-Queimado |
| Excelente | `#10b981` (Cyan/Verde) | Badge Condição |
| Bom | `#22c55e` (Verde) | Badge Condição |
| Regular | `#eab308` (Amarelo) | Badge Condição |
| Ruim | `#f97316` (Laranja) | Badge Condição |
| Danificado | `#ef4444` (Vermelho) | Badge Condição |
| Obsoleto | `#a855f7` (Roxo) | Badge Condição |

---

## 🚀 Inicialização

### 1. Backend (FastAPI)

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Iniciar servidor
python -m uvicorn main:app --reload --port 8000
```

* API disponível em: `http://localhost:8000`
* Documentação OpenAPI: `http://localhost:8000/docs`

### 2. Frontend (React + Vite)

```bash
# Na raiz do projeto
npm install
npm run dev
```

* Interface disponível em: `http://localhost:5173`

---

## 📊 Principais Recursos Implementados

### 🔒 1. Fluxo de Recuperação de Senha Reativo
* Implementação de uma **Máquina de Estados** completa no card de login (`Login.jsx`).
* Permite alternar dinamicamente e sem redirecionamento de páginas:
  - **Estado 0**: Login padrão.
  - **Estado 1**: Solicitação de OTP via e-mail institucional.
  - **Estado 2**: Validação do código OTP enviado (gerado no log do backend).
  - **Estado 3**: Cadastro de nova senha segura.
* Validação rígida de domínios institucionais: `@df.senac.br` para TI/Professores e `@edu.df.senac.br` para alunos.

### ⚙️ 2. Edição Dinâmica de Condições (6 Estados)
* Padronização de todos os notebooks ativos com a condição inicial **Bom**.
* Suporte total a 6 classificações de estado: *Excelente*, *Bom*, *Regular*, *Ruim*, *Danificado*, e *Obsoleto* com badges coloridos personalizados.
* **Gatilhos Duplos na UI**: Abertura do modal de alteração clicando tanto diretamente no Badge de Condição quanto no ícone de Lápis (visibilidade otimizada para toque/mobile).
* **Validação no Banco**: Restrição de integridade a nível de banco de dados (`CHECK constraint` no SQLite) e validação através do Pydantic Enum no FastAPI.

### 🧠 3. IA Predita (Insights de Operação)
* Módulo de análise preditiva real através do endpoint `/ia/insights`.
* Gera insights analíticos baseados nos dados históricos de empréstimos e manutenções:
  - Previsão de dias com picos de alta demanda.
  - Alerta de taxa de avarias elevada por modelo de notebook.
  - Identificação de unidades ociosas (sem movimentação nos últimos 30 dias).
  - Definições de remanejamento preventivo de estoque.

### 👥 4. Painel de Controle de Usuários (TI)
* Tela exclusiva para o grupo de TI (`Usuarios.jsx`) para cadastrar novos usuários, gerenciar o status de ativação/inativação de contas e redefinir senhas esquecidas de alunos e professores em tempo real.

---

## 🔐 Credenciais de Teste Homologadas

O banco de dados SQLite (`backend/r9_notebooks.db`) conta com os seguintes logins pré-configurados:

| Perfil | E-mail Institucional | Senha | Acesso |
|--------|----------------------|-------|--------|
| **TI (Administrador)** | `ti@df.senac.br` | `senha123` | Acesso total, inventário, usuários, IA e alocações |
| **Professor** | `alysson@df.senac.br` | `senha123` | Empréstimos, histórico, reservas e IA |
| **Aluno** | `pedro.costa@edu.df.senac.br` | `senha123` | Visualização e solicitações básicas |

---

## 📡 API Endpoints Principais

| Método | Endpoint | Função / Acesso |
|--------|----------|-----------------|
| POST | `/auth/login` | Login e geração de Token JWT |
| GET | `/notebooks` | Lista completa do inventário de computadores |
| PATCH | `/notebooks/{id}` | Atualização de notebook (Condição, Status, Manutenção) |
| POST | `/notebooks/{id}/forcar-devolucao` | Contingência de liberação de notebook travado |
| GET | `/ia/insights` | insights preditivos gerados pelo motor analítico |
| GET | `/usuarios` | Listagem de usuários (apenas TI) |
| PATCH | `/usuarios/{id}` | Ativação/inativação de usuário |
| PATCH | `/usuarios/{id}/senha` | Redefinição administrativa de senha |
| WS | `/ws` | Conexão WebSocket para estatísticas em tempo real |

---

Desenvolvido para o Projeto Renove (R9) - Senac.
