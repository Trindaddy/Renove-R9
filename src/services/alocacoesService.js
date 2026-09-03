import api from './api';

export async function solicitarAlocacaoEmLote(turmaId, justificativa) {
  const response = await api.post('/alocacoes/solicitar', {
    turma_id: turmaId,
    justificativa
  });
  return response.data;
}

export async function listarSolicitacoesAlocacao(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.responsavel_ti_id) queryParams.append('responsavel_ti_id', params.responsavel_ti_id);
  if (params.solicitante_id) queryParams.append('solicitante_id', params.solicitante_id);
  if (params.data_abertura) queryParams.append('data_abertura', params.data_abertura);
  if (params.termo_busca) queryParams.append('termo_busca', params.termo_busca);
  if (params.turma_id) queryParams.append('turma_id', params.turma_id);

  const url = `/alocacoes/solicitacoes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await api.get(url);
  return response.data;
}

export async function avaliarSolicitacaoAlocacao(solicitacaoId, decisao, motivo) {
  const response = await api.post(`/alocacoes/solicitacoes/${solicitacaoId}/avaliar`, {
    decisao,
    motivo
  });
  return response.data;
}

export async function visualizarSolicitacaoAlocacao(solicitacaoId) {
  const response = await api.patch(`/alocacoes/solicitacoes/${solicitacaoId}/visualizar`);
  return response.data;
}

export async function getNotificacoesPendentesProfessor() {
  const response = await api.get('/alocacoes/notificacoes-pendentes');
  return response.data;
}

export async function getAlocacoesDiarias(data) {
  const response = await api.get(`/alocacoes/diarias?data=${data}`);
  return response.data;
}
