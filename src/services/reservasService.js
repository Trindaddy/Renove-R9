import api from './api';

export async function listarReservas() {
  const response = await api.get('/reservas');
  return response.data;
}

export async function criarReserva(payload) {
  const response = await api.post('/reservas', payload);
  return response.data;
}

export async function atualizarReserva(id, payload) {
  const response = await api.patch(`/reservas/${id}`, payload);
  return response.data;
}

export async function deletarReserva(id) {
  const response = await api.delete(`/reservas/${id}`);
  return response.data;
}


