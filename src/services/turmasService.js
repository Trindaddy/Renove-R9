import api from './api';

export async function listarTurmas() {
  const response = await api.get('/turmas');
  return response.data;
}

export async function cadastrarTurma(turma) {
  const response = await api.post('/turmas', {
    codigo_turma: turma.codigo_turma,
    nome_curso: turma.nome_curso,
    instrutor: turma.instrutor,
    carga_horaria: parseInt(turma.carga_horaria),
    turno: turma.turno,
    regime_dias: turma.regime_dias
  });
  return response.data;
}

export async function editarTurma(codigoTurma, dados) {
  const payload = {};
  if (dados.nome_curso !== undefined) payload.nome_curso = dados.nome_curso;
  if (dados.instrutor !== undefined) payload.instrutor = dados.instrutor;
  if (dados.carga_horaria !== undefined) payload.carga_horaria = parseInt(dados.carga_horaria);
  if (dados.turno !== undefined) payload.turno = dados.turno;
  if (dados.regime_dias !== undefined) payload.regime_dias = dados.regime_dias;

  const response = await api.patch(`/turmas/${codigoTurma}`, payload);
  return response.data;
}

export async function deletarTurma(codigoTurma) {
  const response = await api.delete(`/turmas/${codigoTurma}`);
  return response.data;
}

