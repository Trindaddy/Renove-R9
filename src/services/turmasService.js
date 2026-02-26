import api from './api';

export async function listarTurmas() {
  const response = await api.get('/turmas');
  return response.data;
}

