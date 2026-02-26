import api from './api';

export async function listarEquipamentos() {
  const response = await api.get('/equipamentos');
  return response.data;
}

