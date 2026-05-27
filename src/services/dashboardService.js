import api from './api';

export async function getDashboardStats() {
  const response = await api.get('/dashboard/stats');
  return response.data;
}

export async function getAlertaEscassez() {
  const response = await api.get('/dashboard/alerta-escassez');
  return response.data;
}

export async function getDashboardTi() {
  const response = await api.get('/dashboard/ti');
  return response.data;
}

export async function getDashboardProfessor() {
  const response = await api.get('/dashboard/professor');
  return response.data;
}

export async function getDashboardAluno() {
  const response = await api.get('/dashboard/aluno');
  return response.data;
}
