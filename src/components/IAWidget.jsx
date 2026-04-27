import React from 'react';

export default function IAWidget({ stats }) {
  // Lógica de previsão simples (preparada para futura integração com IA)
  const previsao = gerarPrevisao(stats);

  return (
    <div className="glass-card-cyan p-4 relative overflow-hidden group">
      {/* Efeito de scan */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent animate-scan" />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan/80 font-bold">
          Análise do Sistema (IA)
        </h3>
        <span className="ml-auto text-[10px] text-cyan/40 font-mono">v1.0-beta</span>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-lg opacity-60">📊</span>
          <div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {previsao.mensagem}
            </p>
            <p className="text-[10px] text-cyan/50 mt-1 font-mono">
              Confiança: {previsao.confianca}%
            </p>
          </div>
        </div>

        {previsao.sugestao && (
          <div className="bg-cyan-dim rounded-lg p-3 border border-cyan/10">
            <p className="text-[10px] uppercase tracking-wider text-cyan/60 mb-1">Sugestão</p>
            <p className="text-xs text-cyan">{previsao.sugestao}</p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-gradient-to-r from-cyan/20 to-transparent" />
          <span className="text-[9px] text-slate-600 font-mono">
            modelo: demand-predict-v1
          </span>
        </div>
      </div>
    </div>
  );
}

function gerarPrevisao(stats) {
  if (!stats) {
    return {
      mensagem: 'Carregando dados para análise preditiva...',
      confianca: 0,
      sugestao: null
    };
  }

  const diaSemana = new Date().getDay();
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const amanha = dias[(diaSemana + 1) % 7];

  // Lógica preditiva simples (placeholder para IA futura)
  if (stats.percentual_disponivel < 15) {
    return {
      mensagem: `Demanda crítica detectada. Amanhã (${amanha}): Estoque em níveis críticos previstos.`,
      confianca: 87,
      sugestao: 'Urgente: Liberar notebooks em manutenção ou reserva imediatamente.'
    };
  }

  if (stats.emprestimos_ativos > stats.total * 0.7) {
    return {
      mensagem: `Tendência de Demanda para Amanhã (${amanha}): Alta (IA). Picos históricos detectados.`,
      confianca: 78,
      sugestao: `Preparar ${Math.ceil(stats.total * 0.15)} unidades extra para atender demanda.`
    };
  }

  if (stats.disponiveis > stats.total * 0.4) {
    return {
      mensagem: `Tendência de Demanda para Amanhã (${amanha}): Normal. Estoque estável.`,
      confianca: 92,
      sugestao: 'Manter rotina de manutenção preventiva nos equipamentos ociosos.'
    };
  }

  return {
    mensagem: `Tendência de Demanda para Amanhã (${amanha}): Moderada. Monitorar picos de retirada.`,
    confianca: 72,
    sugestao: 'Agendar verificação de equipamentos próximos à devolução.'
  };
}

