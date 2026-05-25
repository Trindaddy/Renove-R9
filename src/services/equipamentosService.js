import api from './api';

export async function listarEquipamentos() {
  // Backend usa /notebooks para inventário de computadores.
  const response = await api.get('/notebooks');
  return response.data;
}


