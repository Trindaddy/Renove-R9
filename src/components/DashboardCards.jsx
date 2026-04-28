import React from 'react';

export default function DashboardCards({ stats, alerta }) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card p-5 h-28 shimmer" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total de Notebooks',
      value: stats.total || 0,
      icon: '▣',
      color: 'text-slate-100',
      accent: 'border-cyan/20',
      bg: 'bg-cyan/5',
      desc: 'Unidades cadastradas'
    },
    {
      label: 'Disponíveis',
      value: stats.disponiveis || 0,
      icon: '◉',
      color: 'text-cyan',
      accent: 'border-cyan/30',
      bg: 'bg-cyan/10',
      desc: 'Prontos para uso',
      glow: true
    },
    {
      label: 'Em Uso',
      value: stats.emprestados || 0,
      icon: '◈',
      color: 'text-alert',
      accent: 'border-alert/30',
      bg: 'bg-alert/10',
      desc: 'Empréstimos ativos'
    },
    {
      label: 'Manutenção',
      value: stats.manutencao || 0,
      icon: '◐',
      color: 'text-slate-400',
      accent: 'border-slate-500/30',
      bg: 'bg-slate-500/10',
      desc: 'Indisponíveis'
    }
  ];

  const percentual = stats.percentual_disponivel || 0;
  const barColor = percentual < 10 ? 'bg-alert' : percentual < 30 ? 'bg-yellow-400' : 'bg-cyan';
  const barGlow = percentual < 10 ? 'shadow-glow-alert' : 'shadow-glow-cyan';

  return (
    <div className="space-y-4">
      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`glass-card p-5 relative overflow-hidden group hover:border-opacity-40 transition-all duration-500 ${card.accent}`}
          >
            {/* Background Glow */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full ${card.bg} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity`} />

            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-lg ${card.color} ${card.glow ? 'glow-text-cyan' : ''}`}>{card.icon}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{card.desc}</span>
              </div>
              <p className={`text-3xl font-black tracking-tight ${card.color} ${card.glow ? 'glow-text-cyan' : ''}`}>
                {card.value}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Availability Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-medium">Disponibilidade do Parque</span>
            {alerta?.alerta_ativo && (
              <span className="px-2 py-0.5 rounded-full bg-alert/10 border border-alert/30 text-alert text-[10px] font-bold uppercase tracking-wider animate-pulse">
                Alerta de Escassez
              </span>
            )}
          </div>
          <span className={`text-sm font-black font-mono ${percentual < 10 ? 'text-alert glow-text-alert' : 'text-cyan'}`}>
            {percentual.toFixed(1)}%
          </span>
        </div>
        <div className="h-2 bg-navy-900/80 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor} ${barGlow}`}
            style={{ width: `${Math.max(percentual, 3)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-slate-600">0%</span>
          <span className="text-[10px] text-slate-600">50%</span>
          <span className="text-[10px] text-slate-600">100%</span>
        </div>
      </div>
    </div>
  );
}

