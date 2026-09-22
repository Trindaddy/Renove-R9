import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { getHistorico, listarNotebooks } from '../services/emprestimosService';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { Funnel, X, ClockCounterClockwise, User, Laptop, Tag } from '@phosphor-icons/react';

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  
  // Filtros de Auditoria
  const [notebookSelecionado, setNotebookSelecionado] = useState('');
  const [tipoSelecionado, setTipoSelecionado] = useState('');
  const [autorSelecionado, setAutorSelecionado] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { lastMessage } = useWebSocket();

  // Carregar notebooks e usuários para os seletores de filtros
  useEffect(() => {
    async function loadAuxData() {
      try {
        const [nbData, usrData] = await Promise.all([
          listarNotebooks().catch(() => []),
          api.get('/usuarios').then(r => r.data).catch(() => [])
        ]);
        setNotebooks(Array.isArray(nbData) ? nbData : []);
        setUsuarios(Array.isArray(usrData) ? usrData : []);
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares para filtros:', err);
      }
    }
    loadAuxData();
  }, []);

  const loadHistorico = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const nbId = notebookSelecionado ? parseInt(notebookSelecionado) : undefined;
      const autId = autorSelecionado ? parseInt(autorSelecionado) : undefined;
      const tipo = tipoSelecionado || undefined;
      
      const data = await getHistorico(nbId, undefined, tipo, autId);
      setHistorico(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao carregar registros de auditoria do histórico.');
    } finally {
      setLoading(false);
    }
  }, [notebookSelecionado, tipoSelecionado, autorSelecionado]);

  useEffect(() => {
    loadHistorico();
  }, [loadHistorico]);

  useEffect(() => {
    if (lastMessage?.type === 'emprestimo_realizado' || lastMessage?.type === 'devolucao_realizada') {
      loadHistorico();
    }
  }, [lastMessage, loadHistorico]);

  function limparFiltros() {
    setNotebookSelecionado('');
    setTipoSelecionado('');
    setAutorSelecionado('');
  }

  const temFiltroAtivo = Boolean(notebookSelecionado || tipoSelecionado || autorSelecionado);

  const tiposAcaoDisponiveis = [
    { value: '', label: 'Todos os Tipos' },
    { value: 'EMPRESTIMO', label: 'Empréstimo' },
    { value: 'DEVOLUCAO', label: 'Devolução' },
    { value: 'MANUTENCAO_ENTRADA', label: 'Entrada em Manutenção' },
    { value: 'MANUTENCAO_SAIDA', label: 'Saída de Manutenção' },
    { value: 'DECISAO_ALOCACAO', label: 'Decisão de Alocação' },
    { value: 'RESERVA', label: 'Reserva' },
    { value: 'CANCELAMENTO', label: 'Cancelamento' },
    { value: 'LOGIN', label: 'Acesso / Login' },
    { value: 'CADASTRO', label: 'Cadastro' },
    { value: 'ATUALIZACAO', label: 'Atualização' },
    { value: 'ALERTA_ESCASSEZ', label: 'Alerta de Escassez' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="pb-4 border-b border-dark-600/50">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary/60 font-medium">Auditoria e Governança</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Histórico de <span className="text-primary glow-text-primary">Movimentações</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Log unificado de auditoria com rastreabilidade completa por equipamento, autor e tipo de ação.
        </p>
      </header>

      {/* Painel de Filtros Aprimorado */}
      <div className="glass-card p-4 border border-dark-600 bg-dark-900/40 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-dark-700/50">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
            <Funnel className="text-primary" size={16} weight="duotone" />
            <span>Filtros de Auditoria</span>
          </div>
          <div className="flex items-center gap-3">
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 transition-colors"
              >
                <X size={14} />
                <span>Limpar Filtros</span>
              </button>
            )}
            <span className="text-[11px] text-slate-400 font-mono">
              <strong>{historico.length}</strong> registro(s)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* 1. Filtro por Equipamento */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Laptop size={13} className="text-primary" /> Equipamento
            </label>
            <select
              value={notebookSelecionado}
              onChange={(e) => setNotebookSelecionado(e.target.value)}
              className="tech-select text-xs w-full"
            >
              <option value="">Todos os equipamentos</option>
              {notebooks.map((nb) => (
                <option key={nb.id} value={nb.id}>
                  {nb.patrimonio} — {nb.modelo}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filtro por Tipo de Ação */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <Tag size={13} className="text-cyan" /> Tipo de Ação
            </label>
            <select
              value={tipoSelecionado}
              onChange={(e) => setTipoSelecionado(e.target.value)}
              className="tech-select text-xs w-full"
            >
              {tiposAcaoDisponiveis.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Filtro por Autor da Ação */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              <User size={13} className="text-amber-400" /> Autor da Ação
            </label>
            <select
              value={autorSelecionado}
              onChange={(e) => setAutorSelecionado(e.target.value)}
              className="tech-select text-xs w-full"
            >
              <option value="">Todos os autores</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.role?.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>
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
                <th className="text-left px-5 py-3 font-mono">Data / Hora</th>
                <th className="text-left px-5 py-3">Notebook</th>
                <th className="text-left px-5 py-3">Tipo de Ação</th>
                <th className="text-left px-5 py-3">Transição</th>
                <th className="text-left px-5 py-3">Descrição Detalhada</th>
                <th className="text-left px-5 py-3">Autor / Executor</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                      <span className="text-xs text-slate-400 ml-2">Carregando trilha de auditoria...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && historico.map((h) => (
                <tr key={h.id} className="tech-table-row group">
                  <td className="px-5 py-3.5 text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(h.created_at).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-5 py-3.5">
                    {h.notebook?.patrimonio ? (
                      <div>
                        <span className="font-mono text-xs text-primary font-bold">{h.notebook.patrimonio}</span>
                        <p className="text-[10px] text-slate-500">{h.notebook.modelo}</p>
                      </div>
                    ) : (
                      <span className="text-slate-500 font-mono text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <TipoBadge tipo={h.tipo_movimentacao} />
                  </td>
                  <td className="px-5 py-3.5">
                    {h.status_anterior || h.status_novo ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">{h.status_anterior || '—'}</span>
                        <svg className="w-3 h-3 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-primary font-semibold">{h.status_novo || '—'}</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 font-mono text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-slate-200 font-medium max-w-md whitespace-pre-wrap leading-relaxed">
                    {h.descricao || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-xs">
                    <span className="font-semibold text-slate-200 block">
                      {h.responsavel?.nome || h.usuario?.nome || 'Sistema'}
                    </span>
                    {(h.responsavel?.role || h.usuario?.role) && (
                      <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                        {h.responsavel?.role || h.usuario?.role}
                      </span>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && historico.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <ClockCounterClockwise className="text-2xl text-slate-600" weight="duotone" />
                      <p className="text-xs text-slate-400">Nenhum registro encontrado para os filtros selecionados.</p>
                      {temFiltroAtivo && (
                        <button
                          onClick={limparFiltros}
                          className="mt-1 text-xs text-primary hover:underline font-semibold"
                        >
                          Limpar todos os filtros
                        </button>
                      )}
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
                <span className="text-slate-400 font-medium">Notebook</span>
                <span className="font-mono text-primary font-bold">{h.notebook?.patrimonio || (h.notebook_id ? `#${h.notebook_id}` : '—')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium">Transição</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">{h.status_anterior || '—'}</span>
                  <span className="text-primary/40">→</span>
                  <span className="text-primary font-semibold">{h.status_novo || '—'}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-dark-600/30 pt-3 text-xs space-y-1.5">
              <div>
                <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Descrição</span>
                <p className="text-slate-200 text-[12px] font-medium leading-relaxed mt-0.5">{h.descricao || '—'}</p>
              </div>
              <div className="pt-1.5 flex justify-between items-center">
                <span className="text-slate-500 uppercase tracking-wider text-[9px]">Autor</span>
                <span className="text-slate-300 font-bold">{h.responsavel?.nome || h.usuario?.nome || 'Sistema'}</span>
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
    'EMPRESTIMO': 'bg-cyan-500/10 text-cyan border-cyan/20',
    'DEVOLUCAO': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'MANUTENCAO_ENTRADA': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    'MANUTENCAO_SAIDA': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'DECISAO_ALOCACAO': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'RESERVA': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'CANCELAMENTO': 'bg-red-500/10 text-red-400 border-red-500/20',
    'LOGIN': 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    'CADASTRO': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'ATUALIZACAO': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    'ALERTA_ESCASSEZ': 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  };

  const labels = {
    'EMPRESTIMO': 'Empréstimo',
    'DEVOLUCAO': 'Devolução',
    'MANUTENCAO_ENTRADA': 'Manutenção',
    'MANUTENCAO_SAIDA': 'Saída Manutenção',
    'DECISAO_ALOCACAO': 'Alocação',
    'RESERVA': 'Reserva',
    'CANCELAMENTO': 'Cancelamento',
    'LOGIN': 'Login',
    'CADASTRO': 'Cadastro',
    'ATUALIZACAO': 'Atualização',
    'ALERTA_ESCASSEZ': 'Alerta Escassez'
  };

  return (
    <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${styles[tipo] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
      {labels[tipo] || tipo}
    </span>
  );
}
