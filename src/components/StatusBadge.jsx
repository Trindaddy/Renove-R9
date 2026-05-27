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
    'Manutenção': 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const labels = {
    'Ativo': 'No Prazo',
    'Devolvido': 'Devolvido',
    'Atrasado': 'Atrasado',
    'Cancelado': 'Cancelado',
    'Disponível': 'Disponível',
    'Emprestado': 'Em uso',
    'Em uso': 'Em uso',
    'Manutenção': 'Manutenção'
  };

  // Se o status não for mapeado perfeitamente, cai no visual de cancelado (cinza neutro)
  return (
    <span className={`status-badge border ${styles[status] || styles['Cancelado']}`}>
      {labels[status] || status}
    </span>
  );
}
