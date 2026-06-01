import api from './api';

export async function listarEquipamentos() {
  // Backend usa /notebooks para inventário de computadores.
  const response = await api.get('/notebooks?limit=1000');
  return response.data;
}

export async function atualizarEquipamento(id, payload) {
  const response = await api.patch(`/notebooks/${id}`, payload);
  return response.data;
}

export async function cadastrarEquipamento(payload) {
  const response = await api.post('/notebooks', payload);
  return response.data;
}

export async function forcarDevolucaoEquipamento(id) {
  const response = await api.post(`/notebooks/${id}/forcar-devolucao`);
  return response.data;
}

export async function excluirEquipamento(id) {
  const response = await api.delete(`/notebooks/${id}`);
  return response.data;
}

