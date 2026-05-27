import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/Button.jsx';

export default function Alocacoes() {
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local format
  );
  const [alocacoes, setAlocacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function carregarAlocacoes() {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/alocacoes/diarias?data=${dataSelecionada}`);
      setAlocacoes(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError('Erro ao carregar alocações diárias.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarAlocacoes();
  }, [dataSelecionada]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-navy-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60 font-medium">Controle de TI</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Painel Geral de <span className="text-cyan glow-text-cyan">Alocações</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Acompanhe em tempo real a retirada de notebooks por turma e turno.
          </p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Selecionar Data</span>
          <input
            type="date"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
            className="tech-select text-xs w-full sm:w-60"
          />
        </div>
        <Button onClick={carregarAlocacoes} disabled={loading} className="text-xs py-2 w-full sm:w-auto">
          {loading ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {!loading && alocacoes.map((aloc) => {
          const percent = aloc.quantidade_solicitada > 0
            ? Math.round((aloc.quantidade_retirada / aloc.quantidade_solicitada) * 100)
            : 0;

          return (
            <div key={`${aloc.turma}-${aloc.turno}`} className="glass-card p-5 relative overflow-hidden flex flex-col justify-between group hover:border-cyan/30 transition-all duration-300">
              <div className="absolute top-0 right-0 h-24 w-24 bg-cyan/5 rounded-full blur-2xl -mr-6 -mt-6" />
              <div className="space-y-4 relative z-10">
                <div className="flex items-start justify-between border-b border-navy-500/20 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-100 font-mono tracking-tight">{aloc.turma}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Solicitante: <span className="text-slate-350 font-medium">{aloc.solicitante}</span></p>
                  </div>
                  <span className="px-2 py-1 rounded bg-navy-800 text-[10px] uppercase font-mono tracking-wider text-cyan border border-cyan/10">
                    {aloc.turno}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-500">Notebooks Retirados:</span>
                    <span className="text-slate-200 font-bold">
                      {aloc.quantidade_retirada} {aloc.quantidade_solicitada > 0 && `/ ${aloc.quantidade_solicitada}`}
                    </span>
                  </div>
                  
                  {aloc.quantidade_solicitada > 0 && (
                    <div className="w-full bg-navy-800/80 rounded-full h-1.5 overflow-hidden border border-navy-500/10">
                      <div
                        className="bg-cyan h-full transition-all duration-500"
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-1">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Patrimônios Alocados ({aloc.patrimonios.length})</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {aloc.patrimonios.map((pat) => (
                      <span key={pat} className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan/10 text-cyan border border-cyan/15">
                        {pat}
                      </span>
                    ))}
                    {aloc.patrimonios.length === 0 && (
                      <span className="text-xs text-slate-650 italic">Nenhum notebook retirado ainda</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && alocacoes.length === 0 && (
          <div className="col-span-full glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <span className="text-3xl opacity-20">◈</span>
            <p className="text-sm text-slate-500 font-mono">Nenhuma alocação ou reserva identificada para {dataSelecionada}.</p>
          </div>
        )}

        {loading && (
          <div className="col-span-full py-10 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
              <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
              <span className="text-xs text-slate-500 ml-2 font-mono">Sincronizando alocações...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
