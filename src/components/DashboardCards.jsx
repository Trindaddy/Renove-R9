import React from 'react';

export default function DashboardCards({ stats, alerta }) {
  if (!stats) return null;

  const cards = [
    {
      label: 'Total',
      value: stats.total,
      color: 'text-slate-200',
      bg: 'bg-slate-800/50',
      border: 'border-slate-700'
    },
    {
      label: 'Disponíveis',
      value: stats.disponiveis,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30'
    },
    {
      label: 'Emprestados',
      value: stats.emprestados,
      color: 'text-senac-orange',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30'
    },
    {
      label: 'Manutenção',
      value: stats.manutencao,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30'
    },
    {
      label: 'Reservados',
      value: stats.reservados,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30'
    },
    {
      label: 'Empréstimos Ativos',
      value: stats.emprestimos_ativos,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/30'
    }
  ];

  return (
    <div className="space-y-4">
      {alerta?.ativo && (
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-3 flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-300">Alerta de Escassez</p>
            <p className="text-xs text-red-200/80">{alerta.mensagem}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} border ${card.border} rounded-lg p-3 text-center`}
          >
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {stats.percentual_disponivel !== undefined && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">Disponibilidade</span>
            <span className={`text-sm font-semibold ${
              stats.percentual_disponivel < 10 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {stats.percentual_disponivel}%
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                stats.percentual_disponivel < 10
                  ? 'bg-red-500'
                  : stats.percentual_disponivel < 30
                  ? 'bg-yellow-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(stats.percentual_disponivel, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

