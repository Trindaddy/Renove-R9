import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Button from '../components/Button.jsx';

export default function Alocacoes() {
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local format
  );
  const [alocacoes, setAlocacoes] = useState([]);
  const [selectedAloc, setSelectedAloc] = useState(null);
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
    setSelectedAloc(null);
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

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3">Número da Turma</th>
                <th className="text-left px-5 py-3">Professor Responsável</th>
                <th className="text-center px-5 py-3">Notebooks Solicitados</th>
                <th className="text-center px-5 py-3">Notebooks Utilizados</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
                      <span className="text-xs text-slate-500 ml-2 font-mono">Sincronizando alocações...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && alocacoes.map((aloc) => {
                const isSelected = selectedAloc?.turma === aloc.turma && selectedAloc?.turno === aloc.turno;
                return (
                  <tr
                    key={`${aloc.turma}-${aloc.turno}`}
                    onClick={() => setSelectedAloc(aloc)}
                    className={`tech-table-row cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs text-primary/80">
                      {aloc.turma} <span className="text-[10px] text-slate-500 font-sans ml-2">({aloc.turno})</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-200">{aloc.solicitante}</td>
                    <td className="px-5 py-3.5 text-xs text-center text-slate-400">{aloc.quantidade_solicitada}</td>
                    <td className="px-5 py-3.5 text-xs text-center text-slate-200 font-bold">{aloc.quantidade_retirada}</td>
                  </tr>
                );
              })}

              {!loading && alocacoes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-20">◈</span>
                      <p className="text-xs text-slate-500 font-mono">Nenhuma alocação ou reserva identificada para {dataSelecionada}.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sub-painel de Detalhes da Turma Selecionada */}
      {selectedAloc && (
        <div className="glass-card p-5 border border-primary/20 bg-dark-800/40 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex justify-between items-center border-b border-dark-600/50 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Detalhes da Turma: <span className="text-primary font-mono">{selectedAloc.turma}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Professor: {selectedAloc.solicitante} • Turno: {selectedAloc.turno}
              </p>
            </div>
            <button
              onClick={() => setSelectedAloc(null)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Fechar Detalhes
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-2">
                Patrimônios Ativos em Uso ({selectedAloc.patrimonios.length})
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedAloc.patrimonios.map((pat) => (
                  <span
                    key={pat}
                    className="px-3 py-1 rounded-lg text-xs font-mono bg-primary/10 text-primary border border-primary/20 animate-[fadeIn_0.2s_ease-out]"
                  >
                    {pat}
                  </span>
                ))}
                {selectedAloc.patrimonios.length === 0 && (
                  <p className="text-xs text-slate-550 italic">Nenhum notebook foi retirado por esta turma ainda.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
