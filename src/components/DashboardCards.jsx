import React from 'react';

export default function DashboardCards({ stats, alerta }) {
  if (!stats) return null;

  const cards = [
    {
      label: 'Total de Notebooks',
      value: stats.total,
      icon: '💻',
      color: 'text-slate-100',
      bg: 'bg-navy-700/50',
      border: 'border-navy-500/30',
      glow: ''
    },
    {
      label: 'Disponíveis Agora',
      value: stats.disponiveis,
      sub: `${stats.percentual_disponivel}% do total`,
      icon: '●',
      color: 'text-cyan',
      bg: 'bg-cyan-dim',
      border: 'border-cyan/20',
      glow: 'shadow-glow-cyan'
    },
    {
      label: 'Empréstimos Ativos',
      value: stats.emprestimos_ativos,
      icon: '🔄',
      color: 'text-slate-100',
      bg: 'bg-navy-700/50',
      border: 'border-navy-500/30',
      glow: ''
    },
    {
      label: 'Em Manutenção',
      value: stats.manutencao,
      icon: '🔧',
      color: 'text-alert',
      bg: 'bg-alert-dim',
      border: 'border-alert/20',
      glow: 'shadow-glow-alert'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Alerta de Escassez */}
      {alerta?.ativo && (
        <div className="glass-card-alert p-4 flex items-center gap-4 animate-pulse-slow">
          <div className="h-10 w-10 rounded-full bg-alert/20 flex items-center justify-center text-lg">
            ⚠️
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-alert tracking-wide uppercase">Alerta de Escassez</p>
            <p className="text-xs text-alert/80 mt-0.5">{alerta.mensagem}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-alert">{alerta.percentual_atual}%</p>
            <p className="text-[10px] text-alert/60 uppercase tracking-wider">disponível</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`${card.bg} border ${card.border} rounded-xl p-4 ${card.glow} transition-all duration-300 hover:border-opacity-50`}
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">{card.label}</p>
              <span className="text-lg opacity-50">{card.icon}</span>
            </div>
            <p className={`text-3xl font-black ${card.color} ${card.color === 'text-cyan' ? 'glow-text-cyan' : ''}`}>
              {card.value}
            </p>
            {card.sub && (
              <p className="text-[11px] text-cyan/60 mt-1">{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* Barra de disponibilidade */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${stats.percentual_disponivel < 10 ? 'bg-alert animate-pulse' : 'bg-cyan'}`} />
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Status do Estoque: {stats.percentual_disponivel < 10 ? 'Crítico' : stats.percentual_disponivel < 30 ? 'Atenção' : 'OK'}
            </span>
          </div>
          <span className={`text-sm font-bold ${stats.percentual_disponivel < 10 ? 'text-alert glow-text-alert' : 'text-cyan glow-text-cyan'}`}>
            {stats.percentual_disponivel}%
          </span>
        </div>
        <div className="w-full bg-navy-900/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
              stats.percentual_disponivel < 10
                ? 'bg-gradient-to-r from-alert to-alert/70'
                : stats.percentual_disponivel < 30
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400'
                : 'bg-gradient-to-r from-cyan to-cyan/70'
            }`}
            style={{ width: `${Math.min(stats.percentual_disponivel, 100)}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
}

