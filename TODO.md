# R9 - Renove: Módulo de Empréstimo de Notebooks

## ✅ Concluído

### Backend (Python/FastAPI)
- [x] `backend/database.py` - Conexão SQLAlchemy com SQLite
- [x] `backend/models.py` - Modelos: Usuario, Notebook, Emprestimo, Historico, Configuracao
- [x] `backend/schemas.py` - Schemas Pydantic completos
- [x] `backend/crud.py` - Operações CRUD + regras de negócio + alerta de escassez
- [x] `backend/websocket.py` - WebSocket para atualizações em tempo real
- [x] `backend/alertas.py` - Lógica de alerta de escassez (< 10%) + monitor contínuo
- [x] `backend/main.py` - Aplicação FastAPI completa com JWT auth
- [x] `backend/.env.example` - Configurações
- [x] `backend/requirements.txt` - Dependências Python
- [x] `backend/sql/ddl.sql` - Esquema SQL completo (DDL + Views + Índices)
- [x] `backend/seed.py` - Dados iniciais para teste

### Frontend (React + Tailwind)
- [x] `tailwind.config.js` - Paleta Tech (Navy, Cyan #64ffda, Alert #ff9f43)
- [x] `src/styles/tailwind.css` - Glassmorphism + utilitários tech
- [x] `src/components/Button.jsx` - Variantes: primary, outline, ghost, danger, success, cyan
- [x] `src/components/Layout.jsx` - Header Tech com navegação por role
- [x] `src/components/DashboardCards.jsx` - KPIs com glow effects e barra de disponibilidade
- [x] `src/components/EmprestimoForm.jsx` - Formulário rápido com borda alert
- [x] `src/components/IAWidget.jsx` - Widget de previsão de demanda (placeholder para IA)
- [x] `src/pages/Emprestimos.jsx` - Dashboard completo com WebSocket
- [x] `src/pages/Historico.jsx` - Log de movimentações com filtros
- [x] `src/pages/Home.jsx` - Dashboard adaptativo por role (Tech design)
- [x] `src/pages/Login.jsx` - Tela de login Tech
- [x] `src/routes/routes.jsx` - Rotas com Empréstimos e Histórico
- [x] `src/services/emprestimosService.js` - API client
- [x] `src/hooks/useWebSocket.js` - Hook WebSocket com reconexão automática

### Limpeza
- [x] Removida pasta `app/Enums/` (arquivos PHP migrados para JS)

## 🚀 Como Executar

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python seed.py
uvicorn main:app --reload
```

### Frontend
```bash
npm install
npm run dev
```

## 📋 Credenciais de Teste
- **TI:** ti@senac.br / senha123
- **Professor:** professor@senac.br / senha123
- **Aluno:** aluno@senac.br / senha123

