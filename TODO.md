# TODO — Correções críticas (inventário + dashboard)

## Passo 1 — Corrigir Inventário/Equipamentos
- [x] Atualizar `src/services/equipamentosService.js` para chamar `GET /notebooks` (em vez de `/equipamentos`).
- [x] Compatibilizar `src/services/dashboardService.js` com as funções esperadas pelo Home (evitar crash de dashboard).
- [ ] Garantir que `src/pages/Equipamentos.jsx` renderiza `id`, `modelo`, `local`, `status` do `NotebookResponse`.


## Passo 2 — Corrigir Dashboard (evitar crash)
- [ ] Atualizar `src/services/dashboardService.js` para exportar `getDashboardTi`, `getDashboardProfessor`, `getDashboardAluno` conforme `Home.jsx` importa.
- [ ] Ajustar `Home.jsx` para usar `getDashboardStats` (alternativa), garantindo carga do dashboard.

## Passo 3 — Validar Auth (401)
- [ ] Após as mudanças, validar que o axios está enviando Bearer token e que as rotas exigidas respondem corretamente.

## Passo 4 — (Depois) Refatoração backend
- [ ] Propor estrutura de pastas e separar routers/services.

