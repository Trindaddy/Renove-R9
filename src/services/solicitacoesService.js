import api from './api';

export async function listarSolicitacoes() {
  const response = await api.get('/solicitacoes');
  return response.data;
}

export async function listarMaquinasDisponiveisAluno() {
  const response = await api.get('/solicitacoes/maquinas-disponiveis');
  return response.data;
}

export async function aprovarSolicitacao(id) {
  const response = await api.post(`/solicitacoes/${id}/aprovar`);
  return response.data;
}

export async function negarSolicitacao(id) {
  const response = await api.post(`/solicitacoes/${id}/negar`);
  return response.data;
}

export async function alterarEquipamentoSolicitacao(id, equipamentoId) {
  const response = await api.post(`/solicitacoes/${id}/alterar-equipamento`, {
    equipamentoId
  });
  return response.data;
}

