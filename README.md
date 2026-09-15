# 💻 R9 - Renove: Sistema Integrado de Gestão de Notebooks

Sistema corporativo de alta confiabilidade desenvolvido para o gerenciamento de inventário, alocações em lote, reservas e empréstimos de notebooks do **Senac-DF**. Construído com arquitetura moderna orientada a microsserviços/APIs desacopladas, interface reativa no estilo **Dark Tech Premium** com Glassmorphism, atualizações em tempo real via WebSockets, motor de IA preditiva e controle estrito de acesso baseado em papéis (RBAC).

---

## 📑 Sumário

- [Visão Geral e Arquitetura](#-visão-geral-e-arquitetura)
- [Stack Tecnológica](#-stack-tecnológica)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Controle de Acesso e Segurança (RBAC)](#-controle-de-acesso-e-segurança-rbac)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Design System & UI](#-design-system--ui)
- [Como Executar o Projeto](#-como-executar-o-projeto)
  - [Opção 1: Desenvolvimento Local (SQLite + Vite)](#1-desenvolvimento-local-rápido-sqlite--vite)
  - [Opção 2: Produção com Docker Compose (PostgreSQL + Gunicorn)](#2-produção-com-docker-compose-postgresql--gunicorn)
- [Credenciais e Usuários Homologados](#-credenciais-e-usuários-homologados)
- [Matriz de Endpoints da API REST](#-matriz-de-endpoints-da-api-rest)
- [Licença](#-licença)

---

## 🏛️ Visão Geral e Arquitetura

O **Renove (R9)** resolve o desafio logístico de disponibilização e rastreamento de centenas de notebooks educacionais e corporativos entre unidades, turmas e professores do Senac. A solução opera em dois modos de persistência:
1. **Ambiente Local/Dev**: Motor SQLite integrado de alta agilidade, ideal para prototipagem rápida e desenvolvimento offline.
2. **Ambiente de Produção**: PostgreSQL 16 Alpine orquestrado via Docker Compose, com pool de conexões gerenciado pelo SQLAlchemy, migrações com Alembic e servidor ASGI Gunicorn/Uvicorn de alta concorrência.

A aplicação adota o padrão **Clean Architecture**, com separação clara entre modelos ORM, esquemas de validação tipados (Pydantic v2), camadas de serviço/CRUD com transações seguras e barramento de eventos em tempo real via WebSockets.

---

## 🛠️ Stack Tecnológica

### Backend (Python & FastAPI)
- **FastAPI 0.136+**: Framework moderno, assíncrono e de alta performance com documentação OpenAPI/Swagger automática.
- **SQLAlchemy 2.0+ & Alembic 1.17+**: Mapeamento objeto-relacional (ORM) avançado e controle versionado de migrações de schema.
- **Pydantic v2**: Validação estrita de contratos de dados, serialização e sanitização.
- **Autenticação & Criptografia**: JSON Web Tokens (JWT via `python-jose`) com chaves assimétricas e hashing de senhas via `bcrypt` com salt dinâmico.
- **WebSockets (`websockets` 15.0)**: Sincronização bidirecional de disponibilidade de estoque e notificações entre TI e docentes.
- **Gunicorn 23.0 & Uvicorn Workers**: Servidor de produção tolerante a falhas com múltiplos workers.

### Frontend (React & Vite)
- **React 18.3**: Biblioteca declarativa para criação de interfaces dinâmicas e modulares.
- **Vite 6**: Bundler ultra-rápido com Hot Module Replacement (HMR).
- **Tailwind CSS v3**: Utilitários atômicos para estilização consistente e responsiva.
- **Framer Motion 12**: Microinterações, transições suaves de abas e animações de modais.
- **Phosphor Icons React**: Biblioteca moderna de ícones vetoriais.
- **DOMPurify 3.4**: Sanitização completa contra ataques de Cross-Site Scripting (XSS).
- **Axios & React Router DOM v6**: Cliente HTTP com interceptors de autenticação e roteamento protegido por papéis.

---

## 📂 Estrutura do Projeto

```text
Renove-R9/
├── backend/
│   ├── alembic/                    # Versões e migrações do banco de dados
│   │   ├── versions/               # Scripts de migração Alembic
│   │   └── env.py
│   ├── alembic.ini                 # Configuração de migrações
│   ├── alertas.py                  # Monitoramento de escassez e estoque crítico
│   ├── crud.py                     # Regras de negócio, consultas e transações
│   ├── database.py                 # Conexão SQLAlchemy, SessionLocal e migrações SQLite
│   ├── Dockerfile                  # Build multi-stage otimizado (Python 3.12-slim)
│   ├── main.py                     # Instância da FastAPI, rotas, middlewares e rate limit
│   ├── models.py                   # Entidades do banco (Usuario, Notebook, Emprestimo, etc.)
│   ├── schemas.py                  # Schemas Pydantic de entrada e saída
│   ├── websocket.py                # Gerenciador de conexões e broadcast WebSocket
│   ├── requirements.txt            # Dependências Python travadas
│   ├── .env.example                # Template de variáveis de ambiente
│   ├── prod_seed.py                # Seeder de produção (Admin TI e configurações padrão)
│   ├── seed_real_users.py          # Seeder com corpo docente real e turmas do Senac
│   ├── seed.py                     # Seeder geral com dados de teste e patrimônios
│   └── r9_notebooks.db             # Base de dados SQLite local
│
├── src/
│   ├── components/                 # Componentes reutilizáveis (Button, Input, StatusBadge, etc.)
│   │   ├── DashboardCards.jsx      # Cards estatísticos de métricas
│   │   ├── EmprestimoForm.jsx      # Modal de novo empréstimo
│   │   ├── FirstAccessGuard.jsx    # Guarda que força redefinição no 1º acesso
│   │   ├── IAWidget.jsx            # Painel inteligente de insights preditivos
│   │   ├── Layout.jsx              # Navbar, Sidebar e container da aplicação
│   │   └── StatusBadge.jsx         # Badges coloridos por status e condição
│   ├── context/
│   │   └── AuthContext.jsx         # Gerenciamento de sessão, token JWT e perfil
│   ├── hooks/
│   │   └── useWebSocket.js         # Hook customizado com reconexão automática
│   ├── pages/
│   │   ├── AcessoNegado.jsx        # Tela de erro 403 para acessos não autorizados
│   │   ├── Alocacoes.jsx           # Painel diário de computadores e fila de solicitações
│   │   ├── ChangePasswordForm.jsx  # Tela de troca de senha mandatória
│   │   ├── Emprestimos.jsx         # Gestão de empréstimos individuais e devoluções
│   │   ├── Equipamentos.jsx        # Inventário completo, Classe S, manutenções e soft delete
│   │   ├── Historico.jsx           # Trilha de auditoria completa (IP, User-Agent e ações)
│   │   ├── Home.jsx                # Dashboards específicos por perfil (TI, Professor, Aluno)
│   │   ├── Login.jsx               # Login com máquina de estados e recuperação OTP
│   │   ├── Reservas.jsx            # Agendamento prévio de lotes por turma e turno
│   │   ├── Solicitacoes.jsx        # Visão simplificada de solicitações para alunos
│   │   ├── Turmas.jsx              # Gestão de turmas, alunos vinculados e empréstimo em lote
│   │   └── Usuarios.jsx            # Painel administrativo de contas (exclusivo TI)
│   ├── routes/
│   │   └── routes.jsx              # Matriz de rotas públicas, privadas e RBAC
│   ├── services/                   # Clientes de API desacoplados (Axios)
│   ├── styles/                     # Tailwind e fontes personalizadas (JetBrains Mono, Outfit)
│   └── main.jsx                    # Ponto de entrada React
│
├── docker-compose.yml              # Orquestração de containers (Postgres 16 + FastAPI)
├── package.json                    # Dependências e scripts Node.js
├── tailwind.config.js              # Configuração de temas e cores do Tailwind
└── vite.config.mjs                 # Configurações do Vite
```

---

## 🛡️ Controle de Acesso e Segurança (RBAC)

O sistema implementa o modelo de **Role-Based Access Control (RBAC)** em duas camadas sincronizadas (Backend e Frontend):

### 1. Perfis de Usuário
| Papel | Escopo de Acesso | Permissões |
|-------|------------------|------------|
| `ti` (Administrador) | Irrestrito | Gestão total de inventário, criação/edição/bloqueio de usuários, reset de senhas, aprovação/reprovação de solicitações de alocação, exclusão de equipamentos, contingência de devolução forçada e auditoria completa. |
| `professor` | Operacional Docente | Solicitação de alocação de lotes para suas turmas, empréstimo em lote instantâneo, visualização de alunos, agendamento de reservas por turno e consulta a históricos. |
| `aluno` | Consulta Pessoal | Visualização de máquina atribuída, status da solicitação, prazos de devolução e consulta de regras de conservação. |

### 2. Recursos Avançados de Segurança
- **Rate Limiting em Memória**: Proteção ativa contra força bruta nos endpoints `/auth/*`, restringindo a 5 requisições por minuto por endereço IP.
- **FirstAccessGuard**: Usuários recém-criados ou com flag `primeiro_acesso = true` são forçados a cadastrar uma nova senha segura antes de acessar qualquer recurso da plataforma.
- **Headers HTTP Defensivos**: Middlewares automáticos injetam `Content-Security-Policy (CSP)`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`.
- **Sanitização XSS com DOMPurify**: Todo input inserido em cadastros de patrimônios e observações passa por sanitização antes do envio e renderização.
- **Trilha de Auditoria (Audit Log)**: Cada movimentação registra o ID do executor, IP de origem, cabeçalho User-Agent e estado anterior/novo.

---

## 🚀 Funcionalidades Principais

### 1. Inventário Inteligente & Patrimônios
- **Auto-Identificação de Modelos**: O sistema detecta o modelo do equipamento automaticamente a partir do prefixo do patrimônio:
  - `21xxx` ➔ Dell Latitude 5430
  - `29xxx` ➔ Dell Latitude 5450
  - `37xxx` ➔ Dell Pro
- **6 Graus de Condição Física**: Classificação detalhada em *Excelente*, *Bom*, *Regular*, *Ruim*, *Danificado* e *Obsoleto*, com validação por `CHECK constraint` no banco e Pydantic Enum.
- **Status Especiais (Classe S)**: Reserva de contingência para máquinas de apoio institucional:
  - *Classe S - Suporte*
  - *Classe S - PCD* (acessibilidade)
  - *Classe S - Alocação Recanto*
  - *Classe S - Eventos*
- **Workflow de Manutenção**: Registro obrigatório de justificativa técnica e autor para envio de notebook à oficina.
- **Soft Delete & Devolução Forçada**: Exclusão lógica com preservação do histórico e liberação forçada de máquinas travadas em casos de contingência.

### 2. Gestão de Turmas e Alocações em Lote
- **Estrutura Curricular**: Cadastro de turmas vinculado ao corpo docente real do Senac, turnos (*Matutino*, *Vespertino*, *Noturno*), regimes de dias e carga horária.
- **Empréstimo em Lote com 1 Clique**: Professores podem realizar a entrega de notebooks para todos os alunos de uma turma instantaneamente.
- **Fluxo de Solicitações de Alocação**:
  1. Professor solicita notebooks para determinada turma/data justificando a necessidade pedagógica.
  2. TI recebe notificação em tempo real via WebSocket na fila de solicitações.
  3. TI avalia e **Aprova** ou **Reprova**, fornecendo parecer técnico ou alocação recomendada.
  4. O professor é notificado instantaneamente no painel com o resultado.

### 3. Painel Diário de Alocações
- Matriz interativa de ocupação por dia e turno, permitindo à TI identificar antecipadamente gargalos de equipamentos antes do início das aulas.

### 4. Inteligência Artificial & Insights Preditivos (`/ia/insights`)
- **Previsão de Sazonalidade**: Alerta antecipado sobre dias da semana com picos históricos de demanda.
- **Taxa de Avarias por Modelo**: Análise proporcional de defeitos para suporte a decisões de novos lotes de compras.
- **Detecção de Ociosidade**: Mapeamento de computadores sem movimentação nos últimos 30 dias para redistribuição preventiva.
- **Alerta de Escassez Dinâmico**: Notificação quando o estoque disponível cai abaixo da margem de segurança configurada (padrão 10%).

### 5. Sincronização em Tempo Real (WebSockets)
- O barramento `/ws` propaga eventos instantâneos de `disponibilidade_update`, `emprestimo_realizado`, `devolucao_realizada` e `solicitacao_alocacao_avaliada`, atualizando os dashboards conectados sem requisições manuais.

---

## 🎨 Design System & UI

O projeto adota uma estética **Dark Tech Premium** de alto contraste e legibilidade, utilizando superfícies translúcidas em camadas:

| Elemento | Token / Hex | Finalidade |
|----------|-------------|------------|
| **Fundo da Aplicação** | `#0a192f` (Deep Navy) | Fundo escuro imersivo |
| **Superfície dos Cards** | `#172a45` | Painéis e modais translúcidos |
| **Bordas e Divisores** | `#1e3a8a` / `#334155` | Linhas de contorno sutis |
| **Destaque Primário (Neon)** | `#64ffda` (Cyan) | Badges de status, links ativos e métricas |
| **Chamada para Ação (CTA)** | `#ff9f43` (Laranja) | Ações de destaque e alertas urgentes |
| **Condição: Excelente** | `#10b981` (Esmeralda) | Equipamentos em estado impecável |
| **Condição: Bom** | `#22c55e` (Verde) | Equipamentos operacionais padrão |
| **Condição: Regular** | `#eab308` (Amarelo) | Pequenos desgastes estéticos |
| **Condição: Ruim** | `#f97316` (Laranja) | Desgaste acentuado, demanda revisão |
| **Condição: Danificado** | `#ef4444` (Vermelho) | Avaria física ou componente inoperante |
| **Condição: Obsoleto** | `#a855f7` (Roxo) | Fim de ciclo de vida / descarte |

---

## 🚀 Como Executar o Projeto

### 1. Desenvolvimento Local Rápido (SQLite + Vite)

#### Pré-requisitos
- Python 3.10 ou superior
- Node.js 18 ou superior e npm

#### Passo 1: Configurar e Rodar o Backend
```bash
# Acessar a pasta do backend
cd backend

# Criar e ativar o ambiente virtual (Windows PowerShell)
python -m venv venv
.\venv\Scripts\Activate.ps1

# (Ou no Linux/macOS)
# source venv/bin/activate

# Instalar as dependências
pip install -r requirements.txt

# Popular o banco de dados com usuários reais e inventário de teste
python seed_real_users.py
python seed.py

# Iniciar o servidor de desenvolvimento
python -m uvicorn main:app --reload --port 8000
```
- API disponível em: `http://localhost:8000`
- Documentação interativa Swagger: `http://localhost:8000/docs`
- Documentação alternativa Redoc: `http://localhost:8000/redoc`

#### Passo 2: Configurar e Rodar o Frontend
```bash
# Na raiz de Renove-R9 (em outro terminal)
npm install
npm run dev
```
- Interface disponível em: `http://localhost:5173`

---

### 2. Produção com Docker Compose (PostgreSQL + Gunicorn)

A infraestrutura conteinerizada executa o banco relacional **PostgreSQL 16 Alpine**, aplica automaticamente as migrações via Alembic, executa os seeds e inicializa o servidor através do Gunicorn com múltiplos workers Uvicorn.

```bash
# Na raiz de Renove-R9

# 1. Configurar variáveis de ambiente (se desejar personalizar)
# Copie backend/.env.example para o ambiente desejado

# 2. Construir e inicializar os containers em background
docker compose up -d --build

# 3. Acompanhar os logs do backend
docker compose logs -f backend
```

Para encerrar os serviços:
```bash
docker compose down
```

---

## 🔐 Credenciais e Usuários Homologados

O banco de dados gerado pelos scripts de seed disponibiliza as seguintes contas prontas para uso:

| Perfil | E-mail Institucional | Senha Padrão | Escopo de Demonstração |
|--------|----------------------|--------------|------------------------|
| **TI (Administrador)** | `ti@df.senac.br` | `Senac@2025` | Acesso pleno a todas as abas, auditoria e moderação |
| **Professor (Docente)** | `alysson@df.senac.br` | `Senac@2025` | Solicitação em lote, reservas, alocações e turmas |
| **Professor (Docente)** | `anderson@df.senac.br` | `Senac@2025` | Gestão de turmas técnicas e empréstimos |
| **Aluno** | `joao.pereira@edu.df.senac.br` | `Senac@2025` | Consulta de máquina, status e solicitações |
| **Aluno** | `maria.santos@edu.df.senac.br` | `Senac@2025` | Consulta de máquina e turmas ativas |
| **Aluno** | `pedro.costa@edu.df.senac.br` | `Senac@2025` | Histórico e devoluções |

> [!NOTE]
> Para o ambiente de desenvolvimento inicial inicializado com `seed.py` tradicional, as credenciais `ti@senac.br`, `professor@senac.br` e `aluno@senac.br` utilizam a senha `senha123`. Para contas geradas via `seed_real_users.py`, a senha padronizada é `Senac@2025`.

---

## 📡 Matriz de Endpoints da API REST

### Autenticação & Recuperação
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `POST` | `/auth/login` | Login com geração de Token JWT (Rate limit: 5 req/min) | Público |
| `GET` | `/auth/me` | Retorna o perfil do usuário logado | Autenticado |
| `POST` | `/auth/primeiro-acesso/verificar-email` | Dispara verificação para primeiro acesso | Público |
| `POST` | `/auth/primeiro-acesso/validar` | Valida código de autorização OTP | Público |
| `POST` | `/auth/primeiro-acesso/definir-senha` | Cadastra nova senha definitiva | Público |

### Gestão de Usuários
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/usuarios` | Lista todos os usuários cadastrados | TI |
| `POST` | `/usuarios` | Criação de novo usuário | TI |
| `GET` | `/usuarios/{id}` | Detalhes de um usuário específico | TI |
| `PATCH` | `/usuarios/{id}` | Edição de dados ou ativação/desativação | TI |
| `PATCH` | `/usuarios/{id}/senha` | Redefinição administrativa direta de senha | TI |
| `PATCH` | `/usuarios/{id}/remover-turma` | Desvincula o usuário de sua turma | TI |
| `DELETE`| `/usuarios/{id}` | Exclusão de conta de usuário | TI |

### Inventário de Notebooks
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/notebooks` | Lista inventário (filtros: status, condição, modelo) | Autenticado |
| `POST` | `/notebooks` | Cadastro de novo equipamento com sanitização | TI |
| `GET` | `/notebooks/{id}` | Obter detalhes do notebook | Autenticado |
| `PATCH` | `/notebooks/{id}` | Atualização de status, condição ou manutenção | TI |
| `POST` | `/notebooks/{id}/forcar-devolucao` | Contingência de liberação de máquina travada | TI |
| `DELETE`| `/notebooks/{id}` | Exclusão lógica (Soft Delete) | TI |

### Empréstimos & Devoluções
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/emprestimos` | Lista histórico de empréstimos | Professor / TI |
| `POST` | `/emprestimos/rapido` | Realiza empréstimo expresso unitário | Professor / TI |
| `POST` | `/emprestimos/lote/{turma_id}` | Empréstimo em lote para todos os alunos da turma | Professor / TI |
| `POST` | `/emprestimos/{id}/confirmar` | Confirma entrega/recebimento | Professor / TI |
| `POST` | `/emprestimos/{id}/devolver` | Registra devolução e atualiza condição do item | Professor / TI |
| `POST` | `/emprestimos/{id}/cancelar` | Cancela solicitação pendente | Professor / TI |

### Turmas & Alunos
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/turmas` | Lista turmas e instrutores | Professor / TI |
| `POST` | `/turmas` | Cadastra nova turma | TI |
| `PATCH` | `/turmas/{codigo}` | Atualiza dados e horários da turma | TI |
| `DELETE`| `/turmas/{codigo}` | Remove turma | TI |

### Reservas de Estoque
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/reservas` | Lista reservas agendadas | Professor / TI |
| `POST` | `/reservas` | Cria reserva por turma, data e turno | Professor / TI |
| `PATCH` | `/reservas/{id}` | Altera quantidade ou data da reserva | Professor / TI |
| `DELETE`| `/reservas/{id}` | Cancela reserva | Professor / TI |

### Alocações Diárias & Solicitações Docentes
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/alocacoes/diarias` | Mapa de ocupação de notebooks por dia/turno | Professor / TI |
| `POST` | `/alocacoes/solicitar` | Professor envia solicitação de alocação de lote | Professor |
| `GET` | `/alocacoes/solicitacoes` | Lista solicitações de alocação | Professor / TI |
| `POST` | `/alocacoes/solicitacoes/{id}/avaliar` | TI aprova ou reprova com justificativa | TI |
| `PATCH` | `/alocacoes/solicitacoes/{id}/visualizar` | Marca solicitação como lida pelo solicitante | Professor |
| `GET` | `/alocacoes/notificacoes-pendentes` | Retorna pareceres pendentes de visualização | Professor |

### Dashboards, IA Preditiva & WebSockets
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/dashboard/stats` | Indicadores numéricos globais de estoque | Autenticado |
| `GET` | `/dashboard/ti` | Métricas e fila de ações exclusivas de TI | TI |
| `GET` | `/dashboard/professor` | Resumo de turmas e reservas ativas do docente | Professor |
| `GET` | `/dashboard/aluno` | Visualização personalizada do estudante | Aluno |
| `GET` | `/dashboard/alerta-escassez` | Status de margem de estoque seguro | TI |
| `GET` | `/dashboard/emprestimos-atrasados`| Relação de notebooks em atraso | TI |
| `GET` | `/ia/insights` | Motor de insights analíticos e preditivos | TI / Professor |
| `WS` | `/ws` | Canal WebSocket global de atualizações em tempo real | Autenticado |
| `WS` | `/ws/{user_id}` | Canal WebSocket direcionado para notificações do usuário | Autenticado |

### Auditoria & Diagnóstico
| Método | Endpoint | Descrição | Acesso |
|--------|----------|-----------|--------|
| `GET` | `/historico` | Log unificado de auditoria com IP e User-Agent | Professor / TI |
| `GET` | `/historico/notebook/{id}` | Histórico individual de um equipamento | Professor / TI |
| `GET` | `/health` | Healthcheck da aplicação | Público |

---

## 📄 Licença

Este projeto é desenvolvido para fins educacionais e de gestão institucional pelo **Senac-DF**. Consulte o arquivo [LICENSE](file:///c:/Users/calebe.carvalho/OneDrive%20-%20SERVICO%20NACIONAL%20DE%20APRENDIZAGEM%20COMERCIAL%20DN-7170257-SENAC%20-%20DF/Documentos/Renove/Renove-R9/LICENSE) para mais informações sobre os termos de uso.
