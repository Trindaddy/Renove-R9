import api from './api';

export async function listarReservas() {
  const response = await api.get('/reservas');
  return response.data;
}

export async function criarReserva(payload) {
  const response = await api.post('/reservas', payload);
  return response.data;
}

