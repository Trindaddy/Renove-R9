# R9 - Renove: Sistema de Gestão de Notebooks

Sistema completo para gerenciamento de empréstimo de notebooks do Senac, com backend Python/FastAPI, banco SQL e interface React no estilo **Dark Tech Profissional**.

---

## 🏗️ Estrutura do Projeto

```
Renove-R9/
├── backend/                    # API Python (FastAPI)
│   ├── main.py                 # Aplicação principal
│   ├── database.py             # Conexão SQLAlchemy
│   ├── models.py               # Modelos ORM
│   ├── schemas.py              # Validação Pydantic
│   ├── crud.py                 # Regras de negócio
│   ├── alertas.py              # Alerta de escassez
│   ├── websocket.py            # Tempo real (WebSocket)
│   ├── seed.py                 # Dados de teste
│   ├── requirements.txt        # Dependências
│   ├── .env.example            # Configurações
│   └── sql/
│       └── ddl.sql             # Esquema completo
│
├── src/                        # Frontend React
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Button.jsx
│   │   ├── DashboardCards.jsx
│   │   ├── EmprestimoForm.jsx
│   │   ├── IAWidget.jsx
│   │   ├── Input.jsx
│   │   └── Layout.jsx
│   ├── pages/                  # Páginas
│   │   ├── Emprestimos.jsx     # Dashboard principal
│   │   ├── Historico.jsx       # Log de movimentações
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Equipamentos.jsx
│   │   ├── Reservas.jsx
│   │   ├── Solicitacoes.jsx
│   │   └── Turmas.jsx
│   ├── services/               # API clients
│   │   ├── api.js
│   │   ├── emprestimosService.js
│   │   └── ...
│   ├── hooks/
│   │   └── useWebSocket.js     # Hook para tempo real
│   ├── enums/                  # Enums JavaScript
│   │   ├── EquipmentStatus.js
│   │   ├── SolicitacaoStatus.js
│   │   ├── Turno.js
│   │   └── index.js
│   ├── context/
│   ├── routes/
│   └── styles/
│
├── tailwind.config.js          # Config Tech (Navy/Cyan/Alert)
├── package.json
└── README.md
```

---

## 🎨 Design System: Dark Tech Profissional

| Elemento | Valor |
|----------|-------|
| Fundo | `#0a192f` (Deep Navy) |
| Cartões | `#172a45` com glassmorphism |
| Destaque | `#64ffda` (Cyan/Aqua) |
| Alerta/CTA | `#ff9f43` (Laranja-Queimado) |
| Fonte | Inter + Fira Code |
| Efeitos | Glow, scan lines, glassmorphism |

---

## 🚀 Inicialização

### 1. Backend

```bash
cd backend

# Criar ambiente virtual
python -m venv venv
venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Criar banco e dados de teste
python seed.py

# Iniciar servidor
uvicorn main:app --reload
```

API disponível em: `http://localhost:8000`
Documentação: `http://localhost:8000/docs`

### 2. Frontend

```bash
# Na raiz do projeto
npm install
npm run dev
```

Frontend disponível em: `http://localhost:5173`

---

## 📊 Funcionalidades

### Backend
- ✅ **Disponibilidade em tempo real** via WebSocket
- ✅ **Alerta de Escassez** automático (< 10% disponíveis)
- ✅ **Tabelas:** Usuarios, Notebooks, Emprestimos, Historico, Configuracoes
- ✅ **Autenticação JWT** com roles (aluno, professor, ti)
- ✅ **Log completo** de movimentações por equipamento
- ✅ **Preparado para IA** (endpoint de previsão estruturado)

### Frontend
- ✅ **Dashboard Tech** com KPIs e barra de disponibilidade
- ✅ **Empréstimo Rápido** (Patrimônio + Matrícula)
- ✅ **Tabela de Movimentações** com filtros e ações
- ✅ **Widget de IA Previsiva** (placeholder para ML)
- ✅ **WebSocket** para atualizações em tempo real
- ✅ **Interface adaptativa** por perfil (Aluno/Professor/TI)

---

## 🔐 Credenciais de Teste

| Perfil | E-mail | Senha |
|--------|--------|-------|
| TI | ti@senac.br | senha123 |
| Professor | professor@senac.br | senha123 |
| Aluno | aluno@senac.br | senha123 |

---

## 🔮 Integração Futura com IA

O sistema está preparado para receber um modelo de ML:

1. **Endpoint já estruturado:** `/dashboard/previsao-demanda`
2. **Widget IA:** `src/components/IAWidget.jsx` (placeholder)
3. **Dados históricos:** Tabela `historico` com metadata JSON
4. **Alertas preditivos:** Módulo `alertas.py` pronto para extensão

Exemplo de implementação futura:
```python
# Previsão de demanda usando Prophet/Scikit-Learn
@app.get("/dashboard/previsao-demanda")
def prever_demanda(db: Session = Depends(get_db)):
    dados = crud.get_historico_emprestimos_por_dia(db)
    modelo = carregar_modelo_ia()  # .pkl ou API externa
    previsao = modelo.predict(dados)
    return {"previsao": previsao, "confianca": 0.85}
```

---

## 📡 API Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/login` | Login JWT |
| GET | `/dashboard/stats` | Estatísticas do inventário |
| GET | `/dashboard/alerta-escassez` | Verificar alerta |
| GET | `/notebooks` | Listar notebooks |
| POST | `/emprestimos/rapido` | Empréstimo rápido |
| POST | `/emprestimos/{id}/devolver` | Registrar devolução |
| GET | `/historico` | Log de movimentações |
| WS | `/ws` | WebSocket tempo real |

---

Desenvolvido para o Projeto Renove (R9) - Senac

