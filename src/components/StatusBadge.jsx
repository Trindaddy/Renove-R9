import React from 'react';

export default function StatusBadge({ status }) {
  const styles = {
    'Ativo': 'bg-primary/10 text-primary border-primary/20',
    'Devolvido': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Atrasado': 'bg-accent/10 text-accent border-accent/20 glow-text-accent',
    'Cancelado': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'Disponível': 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    'Emprestado': 'bg-primary/10 text-primary border-primary/20',
    'Em uso': 'bg-accent/10 text-accent border-accent/20',
    'Manutenção': 'bg-red-500/10 text-red-400 border-red-500/20',
    'Reservado': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Reservado (Em Lote)': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Pendente': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Alocado / Pronto para Retirada': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'Alocado': 'bg-amber-500/10 text-amber-400 border-amber-500/20'
  };

  const labels = {
    'Ativo': 'No Prazo',
    'Devolvido': 'Devolvido',
    'Atrasado': 'Atrasado',
    'Cancelado': 'Cancelado',
    'Disponível': 'Disponível',
    'Emprestado': 'Em uso',
    'Em uso': 'Em uso',
    'Manutenção': 'Manutenção',
    'Reservado': 'Reservado',
    'Reservado (Em Lote)': 'Reservado (Lote)',
    'Pendente': 'Pendente',
    'Alocado / Pronto para Retirada': 'Alocado',
    'Alocado': 'Alocado'
  };

  // Se o status não for mapeado perfeitamente, cai no visual de cancelado (cinza neutro)
  const isClasseS = status && status.startsWith('Classe S');
  const badgeClass = isClasseS ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : (styles[status] || styles['Cancelado']);
  
  return (
    <span className={`status-badge border ${badgeClass}`}>
      {labels[status] || status}
    </span>
  );
}
