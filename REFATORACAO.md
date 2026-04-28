# Plano de Refatoração — Análise Completa do Código R9

## Problemas Identificados

### 1. Services com Endpoints Inexistentes
**Arquivo:** `src/services/dashboardService.js`
- Endpoints `/dashboard/ti`, `/dashboard/aluno`, `/dashboard/professor` **não existem** no backend
- Backend só tem `/dashboard/stats` e `/dashboard/alerta-escassez`
- **Impacto:** Erros 404 quando Home.jsx chama esses endpoints

### 2. Funções Utilitárias Espalhadas
**Arquivos:** `src/pages/Emprestimos.jsx`, `src/pages/Historico.jsx`
- `StatusBadge`, `formatDate` definidos localmente em cada página
- **Impacto:** Código duplicado, difícil manter consistência

### 3. Bug no Hook useWebSocket
**Arquivo:** `src/hooks/useWebSocket.js`
- `clearInterval(ws.current?._pingInterval)` pode falhar se `ws.current` for null
- Cleanup no `onclose` acessa `ws.current` após setar para null potencialmente
- **Impacto:** Possíveis memory leaks ou erros de runtime

### 4. AuthContext — Fluxo de Erro Incompleto
**Arquivo:** `src/context/AuthContext.jsx`
- Se `getMeRequest()` falhar no init, `setLoading(false)` pode não ser chamado
- **Impacto:** Tela de loading infinito

### 5. Login.jsx — Tratamento Assíncrono Incorreto
**Arquivo:** `src/pages/Login.jsx`
- `login()` retorna Promise mas é tratado como síncrono (`if (!result.ok)`)
- **Impacto:** Login sempre parece falhar ou comportamento inconsistente

### 6. Páginas Antigas com Strings Hardcoded
**Arquivos:** `src/pages/Reservas.jsx`, `src/pages/Solicitacoes.jsx`, `src/pages/Equipamentos.jsx`
- Ainda usam strings literais para status/turno ao invés dos enums criados
- **Impacto:** Inconsistência, risco de typos

### 7. Tailwind — Classes Customizadas Não Definidas
**Arquivo:** `src/styles/tailwind.css`
- Classes como `glass-card`, `tech-select`, `glow-text-cyan` são usadas mas não definidas no CSS
- **Impacto:** Estilos quebrados ou não aplicados

### 8. Layout.jsx — Reconstrução Desnecessária
**Arquivo:** `src/components/Layout.jsx`
- `navItems` é reconstruído a cada render
- **Impacto:** Performance desnecessária (embora pequena)

### 9. Emprestimos.jsx — Chamadas Duplicadas
**Arquivo:** `src/pages/Emprestimos.jsx`
- `carregarDados` chamado no useEffect inicial E quando `lastMessage` muda
- WebSocket já dispara atualização, causando double-fetch
- **Impacto:** Requisições HTTP desnecessárias

---

## Plano de Correção

### Fase 1: Correções Críticas (Bugfixes)
1. ✅ Corrigir `dashboardService.js` — remover endpoints inexistentes
2. ✅ Corrigir `Login.jsx` — adicionar `await` no login
3. ✅ Corrigir `useWebSocket.js` — fixar cleanup e null checks
4. ✅ Corrigir `AuthContext.jsx` — garantir setLoading(false) em todos os caminhos

### Fase 2: Extração de Utilitários
5. ✅ Criar `src/utils/formatters.js` — formatDate, StatusBadge
6. ✅ Criar `src/utils/constants.js` — status labels, colors

### Fase 3: Aplicação de Enums
7. ✅ Atualizar `Reservas.jsx` — usar enums Turno
8. ✅ Atualizar `Solicitacoes.jsx` — usar enums SolicitacaoStatus
9. ✅ Atualizar `Equipamentos.jsx` — usar enums EquipmentStatus

### Fase 4: CSS e Estilos
10. ✅ Adicionar classes customizadas faltantes no `tailwind.css`
11. ✅ Remover classes não utilizadas

### Fase 5: Otimizações
12. ✅ Memoizar `navItems` no `Layout.jsx`
13. ✅ Evitar double-fetch no `Emprestimos.jsx`
