import React, { useEffect, useState, useCallback } from 'react';
import { getHistorico, listarNotebooks } from '../services/emprestimosService';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notebookSelecionado, setNotebookSelecionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    async function loadNotebooks() {
      try {
        const data = await listarNotebooks();
        setNotebooks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar notebooks:', err);
      }
    }
    loadNotebooks();
  }, []);

  const loadHistorico = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const id = notebookSelecionado ? parseInt(notebookSelecionado) : undefined;
      const data = await getHistorico(id);
      setHistorico(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  }, [notebookSelecionado]);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  useEffect(() => {
    if (lastMessage?.type === 'emprestimo_realizado' || lastMessage?.type === 'devolucao_realizada') {
      loadHistorico();
    }
  }, [lastMessage, loadHistorico]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pb-4 border-b border-navy-500/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60 font-medium">Auditoria</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Histórico de <span className="text-cyan glow-text-cyan">Movimentações</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Log completo de todas as operações realizadas no sistema.
        </p>
      </header>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-medium">Filtrar por Equipamento</span>
        </div>
        <select
          value={notebookSelecionado}
          onChange={(e) => setNotebookSelecionado(e.target.value)}
          className="tech-select text-sm w-full sm:w-80"
        >
          <option value="">Todos os notebooks</option>
          {notebooks.map((nb) => (
            <option key={nb.id} value={nb.id}>
              {nb.patrimonio} — {nb.modelo}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-600 font-mono ml-auto">
          {historico.length} registro(s)
        </span>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Layout para Desktop */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3 font-mono">Data/Hora</th>
                <th className="text-left px-5 py-3">Notebook</th>
                <th className="text-left px-5 py-3">Tipo</th>
                <th className="text-left px-5 py-3">Transição</th>
                <th className="text-left px-5 py-3">Descrição</th>
                <th className="text-left px-5 py-3">Responsável</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
                      <span className="text-xs text-slate-500 ml-2">Carregando registros...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && historico.map((h) => (
                <tr key={h.id} className="tech-table-row group">
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-mono text-xs text-cyan/80">{h.notebook?.patrimonio || `#${h.notebook_id}`}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <TipoBadge tipo={h.tipo_movimentacao} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500">{h.status_anterior || '—'}</span>
                      <svg className="w-3 h-3 text-cyan/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-cyan/80">{h.status_novo || '—'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-300 max-w-xs truncate" title={h.descricao}>
                    {h.descricao || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">
                    {h.usuario?.nome || 'Sistema'}
                  </td>
                </tr>
              ))}

              {!loading && historico.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl opacity-20">◉</span>
                      <p className="text-xs text-slate-500">Nenhum registro encontrado no histórico.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layout para Mobile (Cards) */}
      <div className="block md:hidden glass-card overflow-hidden">
        {loading && (
          <div className="px-5 py-8 text-center text-xs text-slate-500">Carregando registros...</div>
        )}
        {!loading && historico.map((h) => (
          <div key={h.id} className="bg-dark-700/30 border-b border-dark-600 p-4 flex flex-col gap-3 relative overflow-hidden">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[10px] text-slate-400 font-mono">
                {new Date(h.created_at).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              <TipoBadge tipo={h.tipo_movimentacao} />
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-550 font-medium">Notebook</span>
                <span className="font-mono text-cyan/85 font-bold">{h.notebook?.patrimonio || `#${h.notebook_id}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-550 font-medium">Transição</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">{h.status_anterior || '—'}</span>
                  <span className="text-cyan/40">→</span>
                  <span className="text-cyan/80 font-semibold">{h.status_novo || '—'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-600/30 pt-3 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Descrição</span>
                <p className="text-slate-300 leading-relaxed">{h.descricao || '—'}</p>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wider text-[9px]">Responsável</span>
                <span className="text-slate-400 font-semibold">{h.usuario?.nome || 'Sistema'}</span>
              </div>
            </div>
          </div>
        ))}
        {!loading && historico.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-slate-500">Nenhum registro encontrado.</div>
        )}
      </div>
    </div>
  );
}

function TipoBadge({ tipo }) {
  const styles = {
    'EMPRESTIMO': 'bg-cyan-dim text-cyan border-cyan/20',
    'DEVOLUCAO': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'MANUTENCAO_ENTRADA': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'MANUTENCAO_SAIDA': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'RESERVA': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'CANCELAMENTO': 'bg-red-500/10 text-red-400 border-red-500/20',
    'CADASTRO': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'ATUALIZACAO': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'ALERTA_ESCASSEZ': 'bg-alert-dim text-alert border-alert/20 glow-text-alert'
  };

  const labels = {
    'EMPRESTIMO': 'Empréstimo',
    'DEVOLUCAO': 'Devolução',
    'MANUTENCAO_ENTRADA': 'Manutenção',
    'MANUTENCAO_SAIDA': 'Manutenção (Saída)',
    'RESERVA': 'Reserva',
    'CANCELAMENTO': 'Cancelamento',
    'CADASTRO': 'Cadastro',
    'ATUALIZACAO': 'Atualização',
    'ALERTA_ESCASSEZ': 'Alerta Escassez'
  };

  return (
    <span className={`status-badge border ${styles[tipo] || styles['CADASTRO']}`}>
      {labels[tipo] || tipo}
    </span>
  );
}

