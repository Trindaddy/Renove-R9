export const SolicitacaoStatus = Object.freeze({
  Pendente: 'pendente',
  Ativo: 'ativo',
  Cancelado: 'cancelado'
});

export const SolicitacaoStatusLabel = Object.freeze({
  [SolicitacaoStatus.Pendente]: 'Pendente',
  [SolicitacaoStatus.Ativo]: 'Aprovada',
  [SolicitacaoStatus.Cancelado]: 'Negada'
});

