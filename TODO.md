# TODO: Módulo de Empréstimo de Notebooks (R9)

## Backend (Python/FastAPI)
- [x] Criar estrutura de pastas `backend/`
- [ ] Criar `backend/database.py` - Conexão SQLAlchemy
- [ ] Criar `backend/models.py` - Modelos: Usuario, Notebook, Emprestimo, Historico
- [ ] Criar `backend/schemas.py` - Schemas Pydantic
- [ ] Criar `backend/crud.py` - Operações CRUD + regras de negócio
- [ ] Criar `backend/websocket.py` - WebSocket para disponibilidade em tempo real
- [ ] Criar `backend/alertas.py` - Lógica de alerta de escassez (< 10%)
- [ ] Criar `backend/main.py` - Aplicação FastAPI com rotas
- [ ] Criar `backend/.env.example` - Configurações
- [ ] Criar `backend/requirements.txt` - Dependências Python
- [ ] Criar `backend/sql/ddl.sql` - Esquema SQL completo
- [ ] Criar `backend/seed.py` - Dados iniciais para teste

## Frontend (React)
- [ ] Criar `src/services/emprestimosService.js` - API client
- [ ] Criar `src/pages/Emprestimos.jsx` - Dashboard + Form rápido
- [ ] Criar `src/pages/Historico.jsx` - Log de histórico por equipamento
- [ ] Criar `src/components/EmprestimoForm.jsx` - Formulário rápido
- [ ] Criar `src/components/DashboardCards.jsx` - Cards de disponibilidade
- [ ] Criar `src/hooks/useWebSocket.js` - Hook para tempo real
- [ ] Atualizar `src/routes/routes.jsx` - Novas rotas
- [ ] Atualizar `src/pages/Home.jsx` - Integrar dashboard de notebooks

## Integração & Testes
- [ ] Atualizar `src/services/api.js` - Novos endpoints
- [ ] Testar `npm run dev` (frontend)
- [ ] Testar `uvicorn main:app --reload` (backend)

