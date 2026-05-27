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



