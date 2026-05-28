import api from './api';

export async function listarEmprestimos(status, usuarioId) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (usuarioId) params.append('usuario_id', usuarioId);
  const response = await api.get(`/emprestimos?${params.toString()}`);
  return response.data;
}

export async function getEmprestimo(id) {
  const response = await api.get(`/emprestimos/${id}`);
  return response.data;
}

export async function criarEmprestimo(payload) {
  const response = await api.post('/emprestimos', payload);
  return response.data;
}

export async function criarEmprestimoRapido(payload) {
  const response = await api.post('/emprestimos/rapido', payload);
  return response.data;
}

export async function devolverEmprestimo(id, payload = {}) {
  const response = await api.post(`/emprestimos/${id}/devolver`, payload);
  return response.data;
}

export async function cancelarEmprestimo(id) {
  const response = await api.post(`/emprestimos/${id}/cancelar`);
  return response.data;
}

export async function getDashboardStats() {
  const response = await api.get('/dashboard/stats');
  return response.data;
}

export async function getAlertaEscassez() {
  const response = await api.get('/dashboard/alerta-escassez');
  return response.data;
}

export async function getEmprestimosAtrasados() {
  const response = await api.get('/dashboard/emprestimos-atrasados');
  return response.data;
}

export async function getHistorico(notebookId, usuarioId) {
  const params = new URLSearchParams();
  if (notebookId) params.append('notebook_id', notebookId);
  if (usuarioId) params.append('usuario_id', usuarioId);
  const response = await api.get(`/historico?${params.toString()}`);
  return response.data;
}

export async function confirmarRetirada(id) {
  const response = await api.post(`/emprestimos/${id}/confirmar`);
  return response.data;
}

export async function processarEmprestimoLote(turmaId) {
  const response = await api.post(`/emprestimos/lote/${turmaId}`);
  return response.data;
}

export async function listarNotebooks(status) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const response = await api.get(`/notebooks?${params.toString()}`);
  return response.data;
}

