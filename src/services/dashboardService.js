import api from './api';

export async function getDashboardStats() {
  const response = await api.get('/dashboard/stats');
  return response.data;
}

export async function getAlertaEscassez() {
  const response = await api.get('/dashboard/alerta-escassez');
  return response.data;
}

// Home.jsx espera estas funções. Para manter compatibilidade,
// mapeamos tudo para o endpoint atual de stats.
function normalizeDashboardStats(stats) {
  // Home.jsx espera campos com nomes diferentes do DashboardStats do backend.
  // Mapeamos para manter compatibilidade sem quebrar a tela.
  return {
    // TI
    notebooksTotais: stats.total ?? 0,
    notebooksDisponiveis: stats.disponiveis ?? 0,
    notebooksEmUso: stats.emprestados ?? 0,
    notebooksManutencao: stats.manutencao ?? 0,
    reservasHoje: stats.reservados ?? 0,
    solicitacoesPendentes: stats.emprestimos_ativos ?? 0,

    // (opcional) campos extras podem ajudar outras seções
    percentualDisponivel: stats.percentual_disponivel ?? 0,
    alerta_escassez: stats.alerta_escassez ?? false,
  };
}

function normalizeDashboardWithAlerta() {
  return async function getDashboardForRole() {
    const stats = await getDashboardStats();
    const alerta = await getAlertaEscassez().catch(() => null);
    return {
      ...normalizeDashboardStats(stats),
      // Alguns componentes podem consumir um campo `alerta`.
      alerta,
    };
  };
}

export const getDashboardTi = normalizeDashboardWithAlerta();
export const getDashboardProfessor = normalizeDashboardWithAlerta();

export async function getDashboardAluno() {
  const response = await api.get('/dashboard/aluno');
  return response.data;
}


