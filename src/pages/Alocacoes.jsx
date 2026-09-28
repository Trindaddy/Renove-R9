import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  listarSolicitacoesAlocacao, 
  avaliarSolicitacaoAlocacao, 
  getAlocacoesDiarias 
} from '../services/alocacoesService';
import { 
  ChartBar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MagnifyingGlass, 
  Funnel, 
  Lightning, 
  Laptop, 
  User, 
  CalendarBlank, 
  ShieldCheck, 
  WarningCircle,
  Eye,
  Check,
  X,
  ClockCounterClockwise,
  GitCommit,
  FileText,
  Article,
  CaretRight,
  Info,
  ArrowsClockwise
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Alocacoes() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const isTi = user?.role === 'ti';
  const isProfessor = user?.role === 'professor';
  const canAvaliar = isTi;

  // Abas
  const [activeTab, setActiveTab] = useState('solicitacoes');

  // Aba 1: Painel Diário
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const [alocacoes, setAlocacoes] = useState([]);
  const [selectedAloc, setSelectedAloc] = useState(null);
  const [loadingDiarias, setLoadingDiarias] = useState(false);
  const [errorDiarias, setErrorDiarias] = useState('');

  // Aba 2: Solicitações de Alocação
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [errorSolicitacoes, setErrorSolicitacoes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroTecnico, setFiltroTecnico] = useState('');
  const [filtroSolicitante, setFiltroSolicitante] = useState('');
  const [filtroData, setFiltroData] = useState('');

  // Modais de Avaliação e Detalhes
  const [avaliarModal, setAvaliarModal] = useState(null);
  const [motivoDecisao, setMotivoDecisao] = useState('');
  const [submittingAvaliacao, setSubmittingAvaliacao] = useState(false);
  const [detalhesNotebooksModal, setDetalhesNotebooksModal] = useState(null);
  const [timelineModal, setTimelineModal] = useState(null);
  const [timelineTab, setTimelineTab] = useState('visual'); // 'visual' | 'auditoria'

  const parsedDetalhesTimeline = useMemo(() => {
    if (!timelineModal?.detalhes_alocacao) return null;
    try {
      return typeof timelineModal.detalhes_alocacao === 'string'
        ? JSON.parse(timelineModal.detalhes_alocacao)
        : timelineModal.detalhes_alocacao;
    } catch (e) {
      return null;
    }
  }, [timelineModal]);

  async function carregarAlocacoesDiarias() {
    try {
      setLoadingDiarias(true);
      setErrorDiarias('');
      const data = await getAlocacoesDiarias(dataSelecionada);
      setAlocacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorDiarias('Erro ao carregar alocações diárias.');
    } finally {
      setLoadingDiarias(false);
    }
  }

  async function carregarSolicitacoes() {
    try {
      setLoadingSolicitacoes(true);
      setErrorSolicitacoes('');
      const data = await listarSolicitacoesAlocacao({
        status: filtroStatus !== 'todos' ? filtroStatus : undefined,
        data_abertura: filtroData || undefined
      });
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorSolicitacoes('Erro ao carregar lista de solicitações.');
    } finally {
      setLoadingSolicitacoes(false);
    }
  }

  useEffect(() => {
    carregarAlocacoesDiarias();
    setSelectedAloc(null);
  }, [dataSelecionada]);

  useEffect(() => {
    carregarSolicitacoes();
  }, [filtroStatus, filtroData]);

  useEffect(() => {
    if (lastMessage?.type === 'solicitacao_alocacao_criada' || lastMessage?.type === 'solicitacao_alocacao_avaliada') {
      carregarSolicitacoes();
      carregarAlocacoesDiarias();
    }
  }, [lastMessage]);

  const solicitacoesFiltradas = useMemo(() => {
    return solicitacoes.filter(s => {
      if (filtroSolicitante.trim()) {
        const solNome = (s.solicitante_nome || '').toLowerCase();
        if (!solNome.includes(filtroSolicitante.toLowerCase())) return false;
      }
      if (filtroTecnico.trim()) {
        const tecNome = (s.responsavel_ti_nome || '').toLowerCase();
        if (!tecNome.includes(filtroTecnico.toLowerCase())) return false;
      }
      return true;
    });
  }, [solicitacoes, filtroSolicitante, filtroTecnico]);

  async function handleDecisao(decisao) {
    if (!isTi) {
      setErrorSolicitacoes('Apenas a equipe de TI possui permissão para aprovar ou reprovar solicitações.');
      return;
    }
    if (!motivoDecisao.trim() || !avaliarModal) return;
    try {
      setSubmittingAvaliacao(true);
      setErrorSolicitacoes('');
      setSuccessMsg('');
      const updatedSol = await avaliarSolicitacaoAlocacao(avaliarModal.id, decisao, motivoDecisao.trim());
      setSuccessMsg(`Solicitação #${avaliarModal.id} foi ${decisao.toLowerCase()} com sucesso!`);
      
      if (decisao === 'Aprovado' && updatedSol.detalhes_alocacao) {
        try {
          const parsed = JSON.parse(updatedSol.detalhes_alocacao);
          setDetalhesNotebooksModal({
            solicitacao: updatedSol,
            alocados: parsed.alocados || []
          });
        } catch (e) {}
      }

      setAvaliarModal(null);
      setMotivoDecisao('');
      await carregarSolicitacoes();
      await carregarAlocacoesDiarias();
    } catch (err) {
      setErrorSolicitacoes(err.response?.data?.detail || 'Erro ao processar decisão da solicitação.');
    } finally {
      setSubmittingAvaliacao(false);
    }
  }

  function handleVerNotebooks(sol) {
    if (!sol.detalhes_alocacao) return;
    try {
      const parsed = JSON.parse(sol.detalhes_alocacao);
      setDetalhesNotebooksModal({
        solicitacao: sol,
        alocados: parsed.alocados || []
      });
    } catch (e) {
      console.error(e);
    }
  }

  const abertasCount = solicitacoes.filter(s => s.status === 'Aberto').length;

  return (
    <div className="space-y-6 animate-[fadeIn_0.4s_ease-out]">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-dark-600/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary/70 font-bold">Gestão & Auditoria</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Controle Geral de <span className="text-primary glow-text-primary">Alocações</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerenciamento de solicitações de lotes com aprovação de TI e monitoramento diário de retiradas.
          </p>
        </div>
      </header>

      <div className="flex gap-2 border-b border-dark-600/50 pb-0">
        <button
          onClick={() => setActiveTab('solicitacoes')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
            activeTab === 'solicitacoes'
              ? 'text-primary border-primary bg-primary/10'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-dark-800/40'
          }`}
        >
          <Lightning size={16} weight="fill" />
          <span>Status de Solicitações</span>
          {abertasCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black animate-pulse">
              {abertasCount} pendente{abertasCount > 1 ? 's' : ''}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('diarias')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-t-xl transition-all border-b-2 ${
            activeTab === 'diarias'
              ? 'text-primary border-primary bg-primary/10'
              : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-dark-800/40'
          }`}
        >
          <ChartBar size={16} weight="duotone" />
          <span>Painel Diário de Retiradas</span>
        </button>
      </div>

      <AnimatePresence>
        {(errorSolicitacoes || errorDiarias) && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-red-950/30 border border-red-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <WarningCircle weight="fill" className="text-red-400 shrink-0 text-lg" />
            <p className="text-xs text-red-400">{errorSolicitacoes || errorDiarias}</p>
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle weight="fill" className="text-emerald-400 shrink-0 text-lg" />
            <p className="text-xs text-emerald-400 font-medium">{successMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'solicitacoes' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <div className="glass-card p-4 space-y-3 bg-dark-850/40 border border-dark-600/60 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider pb-2 border-b border-dark-600/40">
              <Funnel size={14} className="text-primary" />
              <span>Área de Busca e Filtros</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Status</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="tech-select text-xs w-full"
                >
                  <option value="todos">Todos os Estados</option>
                  <option value="Aberto">Aberto (Em Análise)</option>
                  <option value="Concluido">Concluído (Aprovado / Reprovado)</option>
                  <option value="Aprovado">Concluído — Aprovado</option>
                  <option value="Reprovado">Concluído — Reprovado</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Solicitante (Professor)</label>
                <div className="relative">
                  <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={filtroSolicitante}
                    onChange={(e) => setFiltroSolicitante(e.target.value)}
                    placeholder="Buscar solicitante..."
                    className="tech-input text-xs w-full pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Técnico / ADM Responsável</label>
                <div className="relative">
                  <ShieldCheck size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={filtroTecnico}
                    onChange={(e) => setFiltroTecnico(e.target.value)}
                    placeholder="Buscar técnico TI..."
                    className="tech-input text-xs w-full pl-8"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Dia de Abertura</label>
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    value={filtroData}
                    onChange={(e) => setFiltroData(e.target.value)}
                    className="tech-select text-xs flex-1"
                  />
                  {filtroData && (
                    <button
                      onClick={() => setFiltroData('')}
                      className="px-2 py-1 bg-dark-700 hover:bg-dark-600 rounded text-[10px] text-slate-400"
                      title="Limpar Data"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="tech-table-header">
                  <tr>
                    <th className="text-left px-4 py-3">ID / Turma</th>
                    <th className="text-left px-4 py-3">Solicitante</th>
                    <th className="text-left px-4 py-3">Data e Horário</th>
                    <th className="text-left px-4 py-3">Técnico Responsável</th>
                    <th className="text-left px-4 py-3 max-w-[200px]">Justificativa</th>
                    <th className="text-center px-4 py-3">Status</th>
                    <th className="text-center px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSolicitacoes && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500 font-mono">
                        Carregando solicitações de alocação...
                      </td>
                    </tr>
                  )}

                  {!loadingSolicitacoes && solicitacoesFiltradas.map((sol) => (
                    <tr
                      key={sol.id}
                      onClick={() => {
                        setTimelineModal(sol);
                        setTimelineTab('visual');
                      }}
                      className="tech-table-row cursor-pointer hover:bg-primary/5 transition-all group"
                      title="Clique em qualquer linha para abrir a Linha do Tempo e Histórico"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-primary font-bold">#{sol.id} • {sol.turma_id}</span>
                            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                              {sol.quantidade || 1} {sol.quantidade === 1 ? 'notebook' : 'notebooks'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 truncate max-w-[170px]">{sol.turma_curso}</span>
                          {(sol.local_uso || sol.data_necessidade) && (
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                              {sol.data_necessidade && <span>📅 {sol.data_necessidade}</span>}
                              {sol.periodo_letivo && <span>({sol.periodo_letivo})</span>}
                              {sol.local_uso && <span>📍 {sol.local_uso}</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-200 block">{sol.solicitante_nome}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{sol.solicitante_email}</span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-slate-300 text-xs">
                        {sol.created_at ? new Date(sol.created_at).toLocaleString('pt-BR') : 'N/A'}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className={`text-xs ${sol.responsavel_ti_nome ? 'text-slate-200 font-semibold' : 'text-slate-500 italic'}`}>
                          {sol.responsavel_ti_nome || 'Aguardando atribuição'}
                        </span>
                        {sol.data_decisao && (
                          <span className="block text-[9px] text-slate-500 font-mono">
                            Decidido em: {new Date(sol.data_decisao).toLocaleString('pt-BR')}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="text-slate-300 text-xs line-clamp-2" title={sol.motivo || sol.justificativa}>
                          {sol.motivo || sol.justificativa}
                        </p>
                        {sol.motivo_decisao && (
                          <p className="text-[10px] text-slate-500 truncate mt-1" title={`Motivo TI: ${sol.motivo_decisao}`}>
                            <strong className="text-slate-400">Motivo TI:</strong> {sol.motivo_decisao}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                          sol.status === 'Aberto'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : sol.status === 'Aprovado'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}>
                          {sol.status === 'Aberto' && <Clock size={11} weight="bold" />}
                          {sol.status === 'Aprovado' && <CheckCircle size={11} weight="fill" />}
                          {sol.status === 'Reprovado' && <XCircle size={11} weight="fill" />}
                          {sol.status === 'Aberto' ? 'Aberto' : `Concluído (${sol.status})`}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setTimelineModal(sol);
                              setTimelineTab('visual');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold text-[11px] transition-all flex items-center gap-1 shadow-sm"
                            title="Visualizar Linha do Tempo e Histórico"
                          >
                            <ClockCounterClockwise size={13} weight="bold" />
                            Linha do Tempo
                          </button>

                          {canAvaliar && sol.status === 'Aberto' && (
                            <button
                              onClick={() => {
                                setAvaliarModal(sol);
                                setMotivoDecisao('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary font-bold text-[11px] transition-all flex items-center gap-1"
                            >
                              <ShieldCheck size={13} weight="fill" />
                              Avaliar
                            </button>
                          )}

                          {sol.status === 'Aprovado' && sol.detalhes_alocacao && (
                            <button
                              onClick={() => handleVerNotebooks(sol)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold text-[11px] transition-all flex items-center gap-1"
                            >
                              <Laptop size={13} weight="fill" />
                              Notebooks
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!loadingSolicitacoes && solicitacoesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-slate-500 font-mono">
                        Nenhuma solicitação encontrada com os filtros selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-dark-600/50 text-[11px] text-slate-500 flex justify-between">
              <span>Exibindo {solicitacoesFiltradas.length} de {solicitacoes.length} solicitações</span>
              <span>{abertasCount} aberta(s) aguardando avaliação</span>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'diarias' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
            <Button onClick={carregarAlocacoesDiarias} disabled={loadingDiarias} className="text-xs py-2 w-full sm:w-auto">
              {loadingDiarias ? 'Atualizando...' : 'Atualizar'}
            </Button>
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
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
                  {loadingDiarias && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center font-mono text-xs text-slate-500">
                        Sincronizando alocações diárias...
                      </td>
                    </tr>
                  )}

                  {!loadingDiarias && alocacoes.map((aloc) => {
                    const isSelected = selectedAloc?.turma === aloc.turma && selectedAloc?.turno === aloc.turno;
                    return (
                      <tr
                        key={`${aloc.turma}-${aloc.turno}`}
                        onClick={() => setSelectedAloc(aloc)}
                        className={`tech-table-row cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 font-mono text-xs text-primary/80 font-bold">
                          {aloc.turma} <span className="text-[10px] text-slate-500 font-sans ml-2">({aloc.turno})</span>
                        </td>
                        <td className="px-5 py-3.5 text-xs text-slate-200">{aloc.solicitante}</td>
                        <td className="px-5 py-3.5 text-xs text-center text-slate-400">{aloc.quantidade_solicitada}</td>
                        <td className="px-5 py-3.5 text-xs text-center text-slate-200 font-bold">{aloc.quantidade_retirada}</td>
                      </tr>
                    );
                  })}

                  {!loadingDiarias && alocacoes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center font-mono text-xs text-slate-500">
                        Nenhuma alocação ou reserva identificada para {dataSelecionada}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selectedAloc && (
            <div className="glass-card p-5 border border-primary/20 bg-dark-800/40 rounded-2xl animate-[fadeIn_0.3s_ease-out]">
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
                        className="px-3 py-1 rounded-lg text-xs font-mono bg-primary/10 text-primary border border-primary/20"
                      >
                        {pat}
                      </span>
                    ))}
                    {selectedAloc.patrimonios.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Nenhum notebook foi retirado por esta turma ainda.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* MODAL: AVALIAÇÃO DE SOLICITAÇÃO (TI / ADM) */}
      <AnimatePresence>
        {isTi && avaliarModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="glass-card p-6 w-full max-w-lg shadow-2xl relative mx-4 text-slate-200 border border-primary/30 rounded-2xl">
              <button
                onClick={() => setAvaliarModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>

              <header className="border-b border-dark-600/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <ShieldCheck size={22} weight="fill" />
                  <h3 className="text-base font-black text-slate-100">Avaliar Solicitação de Alocação #{avaliarModal.id}</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Turma: <strong className="text-slate-200 font-mono">{avaliarModal.turma_id}</strong> — {avaliarModal.turma_curso}
                </p>
              </header>

              <div className="space-y-4">
                <div className="bg-dark-800/80 p-3.5 rounded-xl border border-dark-600/60 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Professor Solicitante:</span>
                    <strong className="text-slate-200">{avaliarModal.solicitante_nome}</strong>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Qtd. Solicitada</span>
                      <span className="font-mono text-primary font-bold text-sm">{avaliarModal.quantidade || 1} notebooks</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Data de Uso</span>
                      <span className="font-mono text-slate-200 text-xs">{avaliarModal.data_necessidade || 'Não especificada'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Local</span>
                      <span className="text-slate-200 text-xs">{avaliarModal.local_uso || 'Não especificado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block font-bold">Período</span>
                      <span className="text-slate-200 text-xs">{avaliarModal.periodo_letivo || avaliarModal.turma_turno || 'Não especificado'}</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data de Abertura:</span>
                    <span className="font-mono text-slate-300">{new Date(avaliarModal.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="pt-2 border-t border-dark-600/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Motivo / Justificativa do Pedido:</span>
                    <p className="text-slate-200 italic bg-dark-900/50 p-2.5 rounded-lg border border-dark-700 leading-relaxed text-xs">
                      "{avaliarModal.motivo || avaliarModal.justificativa}"
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1.5">
                    Motivo da Decisão <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={motivoDecisao}
                    onChange={(e) => setMotivoDecisao(e.target.value)}
                    rows={3}
                    placeholder="Informe detalhadamente o motivo para a aprovação ou reprovação deste pedido..."
                    className="tech-input w-full text-xs p-3 leading-relaxed"
                    required
                  />
                  <span className="text-[10px] text-slate-500 block mt-1">
                    * Campo de preenchimento obrigatório para qualquer decisão.
                  </span>
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-dark-600/50">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs py-2.5 px-4 bg-dark-700 hover:bg-dark-600 text-slate-200"
                    onClick={() => setAvaliarModal(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold"
                    disabled={!motivoDecisao.trim() || submittingAvaliacao}
                    onClick={() => handleDecisao('Reprovado')}
                  >
                    {submittingAvaliacao ? 'Processando...' : 'Reprovar Alocação'}
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                    disabled={!motivoDecisao.trim() || submittingAvaliacao}
                    onClick={() => handleDecisao('Aprovado')}
                  >
                    {submittingAvaliacao ? 'Processando...' : 'Aprovar Alocação'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: DETALHES DOS NOTEBOOKS LIBERADOS */}
      <AnimatePresence>
        {detalhesNotebooksModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
            <div className="glass-card p-6 w-full max-w-lg shadow-2xl relative mx-4 text-slate-200 border border-emerald-500/30 rounded-2xl">
              <button
                onClick={() => setDetalhesNotebooksModal(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>

              <header className="border-b border-dark-600/50 pb-3 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 mb-1">
                  <CheckCircle size={22} weight="fill" />
                  <h3 className="text-base font-black text-slate-100">Notebooks Disponibilizados</h3>
                </div>
                <p className="text-xs text-slate-400">
                  Solicitação #{detalhesNotebooksModal.solicitacao.id} — Turma: <strong className="font-mono text-slate-200">{detalhesNotebooksModal.solicitacao.turma_id}</strong>
                </p>
              </header>

              <div className="space-y-3">
                <div className="text-xs text-slate-300">
                  Total de unidades liberadas para a turma: <strong className="text-emerald-400">{detalhesNotebooksModal.alocados.length} notebook(s)</strong>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {detalhesNotebooksModal.alocados.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-dark-800/80 border border-dark-600/60 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono text-primary font-bold">{item.patrimonio}</span>
                        <span className="text-slate-400 ml-2">({item.modelo})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-slate-200">{item.aluno_nome}</span>
                        <span className="block text-[10px] text-slate-500 font-mono">{item.aluno_matricula}</span>
                      </div>
                    </div>
                  ))}
                  {detalhesNotebooksModal.alocados.length === 0 && (
                    <p className="text-xs text-slate-500 italic text-center py-4">Nenhum notebook específico listado.</p>
                  )}
                </div>

                <div className="pt-3 border-t border-dark-600/50 flex justify-end">
                  <Button
                    onClick={() => setDetalhesNotebooksModal(null)}
                    className="text-xs py-2 px-6 bg-emerald-600 hover:bg-emerald-500 font-bold text-white"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: LINHA DO TEMPO E HISTÓRICO DA SOLICITAÇÃO */}
      <AnimatePresence>
        {timelineModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
            <div className="glass-card w-full max-w-3xl shadow-2xl relative text-slate-200 border border-primary/40 rounded-2xl overflow-hidden my-6 flex flex-col bg-dark-900/95 max-h-[92vh]">
              {/* Header */}
              <div className="p-5 border-b border-dark-600/60 bg-dark-850/90 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-primary font-bold text-sm bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg">
                      Solicitação #{timelineModal.id}
                    </span>
                    <span className="font-mono text-cyan-300 font-bold text-xs bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                      Turma: {timelineModal.turma_id}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                      timelineModal.status === 'Aberto'
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : timelineModal.status === 'Aprovado'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-400 border border-red-500/30'
                    }`}>
                      {timelineModal.status === 'Aberto' && <Clock size={11} weight="bold" />}
                      {timelineModal.status === 'Aprovado' && <CheckCircle size={11} weight="fill" />}
                      {timelineModal.status === 'Reprovado' && <XCircle size={11} weight="fill" />}
                      {timelineModal.status === 'Aberto' ? 'Em Análise (Aberto)' : `Concluído — ${timelineModal.status}`}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <ClockCounterClockwise size={20} className="text-primary" weight="bold" />
                    Linha do Tempo & Histórico de Alterações
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {timelineModal.turma_curso || 'Curso não especificado'}
                  </p>
                </div>

                <button
                  onClick={() => setTimelineModal(null)}
                  className="text-slate-400 hover:text-slate-200 text-lg p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors"
                  title="Fechar"
                >
                  ✕
                </button>
              </div>

              {/* Sub-header Tabs */}
              <div className="flex border-b border-dark-600/50 bg-dark-900/60 px-5 pt-2 gap-2">
                <button
                  onClick={() => setTimelineTab('visual')}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
                    timelineTab === 'visual'
                      ? 'text-primary border-primary bg-primary/10'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <GitCommit size={15} weight="bold" />
                  Linha do Tempo Visual
                </button>
                <button
                  onClick={() => setTimelineTab('auditoria')}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-all border-b-2 ${
                    timelineTab === 'auditoria'
                      ? 'text-primary border-primary bg-primary/10'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Article size={15} weight="bold" />
                  Ficha Técnica de Auditoria
                </button>
              </div>

              {/* Content Area */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {timelineTab === 'visual' && (
                  <div className="space-y-6">
                    {/* Sumário Rápido */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-dark-850/60 border border-dark-700/60 p-3.5 rounded-xl text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Docente</span>
                        <strong className="text-slate-200 truncate block">{timelineModal.solicitante_nome}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Qtd. Equipamentos</span>
                        <strong className="text-primary font-mono">{timelineModal.quantidade || 1} un.</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Uso</span>
                        <strong className="text-slate-200 font-mono">{timelineModal.data_necessidade || 'Não informada'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Local Previsto</span>
                        <strong className="text-slate-200 truncate block">{timelineModal.local_uso || 'Não especificado'}</strong>
                      </div>
                    </div>

                    {/* Timeline Tracker */}
                    <div className="relative pl-6 space-y-6 border-l-2 border-dark-600/60 ml-3">
                      {/* ETAPA 1: SOLICITAÇÃO REGISTRADA */}
                      <div className="relative group">
                        <div className="absolute -left-[31px] top-0 p-1.5 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400">
                          <Check size={12} weight="bold" />
                        </div>
                        <div className="bg-dark-800/60 border border-dark-700/60 rounded-xl p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <FileText size={15} className="text-primary" />
                              1. Solicitação Registrada pelo Docente
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {timelineModal.created_at ? new Date(timelineModal.created_at).toLocaleString('pt-BR') : 'Data não informada'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            O professor <strong className="text-slate-100">{timelineModal.solicitante_nome}</strong> ({timelineModal.solicitante_email}) abriu o pedido de alocação de <strong className="text-primary">{timelineModal.quantidade || 1} notebooks</strong> para a turma <span className="font-mono text-cyan-300">{timelineModal.turma_id}</span> ({timelineModal.turma_curso}).
                          </p>
                          {(timelineModal.motivo || timelineModal.justificativa) && (
                            <div className="mt-2 p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/50 text-xs">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Justificativa Pedagógica:</span>
                              <p className="italic text-slate-300">"{timelineModal.motivo || timelineModal.justificativa}"</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ETAPA 2: TRIAGEM TÉCNICA TI */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border-2 ${
                          timelineModal.status === 'Aberto'
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse'
                            : 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        }`}>
                          {timelineModal.status === 'Aberto' ? <Clock size={12} weight="bold" /> : <Check size={12} weight="bold" />}
                        </div>
                        <div className="bg-dark-800/60 border border-dark-700/60 rounded-xl p-4 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Funnel size={15} className="text-amber-400" />
                              2. Fila de Triagem Técnica e Disponibilidade
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              timelineModal.status === 'Aberto' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300'
                            }`}>
                              {timelineModal.status === 'Aberto' ? 'Em Triagem TI' : 'Triagem Concluída'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {timelineModal.status === 'Aberto'
                              ? 'A demanda está na fila de atendimento da equipe de TI. Está sendo verificada a disponibilidade de equipamentos para a data e turno informados.'
                              : 'Verificação de viabilidade técnica e disponibilidade de parque realizada pela equipe de infraestrutura.'}
                          </p>
                        </div>
                      </div>

                      {/* ETAPA 3: PARECER TÉCNICO E DELIBERAÇÃO */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border-2 ${
                          timelineModal.status === 'Aberto'
                            ? 'bg-dark-700 border-dark-500 text-slate-400'
                            : timelineModal.status === 'Aprovado'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : 'bg-red-500/20 border-red-500 text-red-400'
                        }`}>
                          {timelineModal.status === 'Aberto' && <Clock size={12} weight="bold" />}
                          {timelineModal.status === 'Aprovado' && <Check size={12} weight="bold" />}
                          {timelineModal.status === 'Reprovado' && <X size={12} weight="bold" />}
                        </div>
                        <div className={`rounded-xl p-4 space-y-2 border ${
                          timelineModal.status === 'Aberto'
                            ? 'bg-dark-800/40 border-dark-700/60'
                            : timelineModal.status === 'Aprovado'
                            ? 'bg-emerald-950/20 border-emerald-800/40'
                            : 'bg-red-950/20 border-red-800/40'
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <ShieldCheck size={15} className={
                                timelineModal.status === 'Aprovado' ? 'text-emerald-400' : timelineModal.status === 'Reprovado' ? 'text-red-400' : 'text-slate-400'
                              } />
                              3. Parecer Técnico e Deliberação
                            </span>
                            {timelineModal.data_decisao && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {new Date(timelineModal.data_decisao).toLocaleString('pt-BR')}
                              </span>
                            )}
                          </div>

                          {timelineModal.status === 'Aberto' ? (
                            <div className="space-y-2 text-xs text-slate-400">
                              <p>Aguardando deliberação de um técnico responsável ou coordenador do Senac.</p>
                              {canAvaliar && (
                                <button
                                  onClick={() => {
                                    setAvaliarModal(timelineModal);
                                    setMotivoDecisao('');
                                    setTimelineModal(null);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-dark-900 font-bold text-xs inline-flex items-center gap-1.5 transition-all mt-1"
                                >
                                  <ShieldCheck size={14} weight="bold" />
                                  Emitir Parecer Técnico Agora
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">Status Deliberado:</span>
                                <span className={`font-black uppercase tracking-wider text-xs px-2 py-0.5 rounded ${
                                  timelineModal.status === 'Aprovado' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {timelineModal.status}
                                </span>
                                {timelineModal.responsavel_ti_nome && (
                                  <span className="text-slate-400">
                                    por <strong className="text-slate-200">{timelineModal.responsavel_ti_nome}</strong>
                                  </span>
                                )}
                              </div>
                              {timelineModal.motivo_decisao && (
                                <div className="p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60">
                                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Parecer e Motivo Registrado:</span>
                                  <p className="text-slate-200">{timelineModal.motivo_decisao}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ETAPA 4: EQUIPAMENTOS VINCULADOS */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border-2 ${
                          timelineModal.status === 'Aprovado'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : timelineModal.status === 'Reprovado'
                            ? 'bg-red-500/20 border-red-500 text-red-400'
                            : 'bg-dark-700 border-dark-500 text-slate-500'
                        }`}>
                          <Laptop size={12} weight="bold" />
                        </div>
                        <div className="bg-dark-800/60 border border-dark-700/60 rounded-xl p-4 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Laptop size={15} className="text-cyan-400" />
                              4. Computadores e Patrimônios Vinculados
                            </span>
                          </div>

                          {timelineModal.status === 'Aprovado' ? (
                            <div className="space-y-2 text-xs">
                              {parsedDetalhesTimeline?.alocados && parsedDetalhesTimeline.alocados.length > 0 ? (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                  {parsedDetalhesTimeline.alocados.map((item, idx) => (
                                    <div key={idx} className="p-2 rounded-lg bg-dark-900/70 border border-dark-700/70 flex items-center justify-between text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-primary font-bold">{item.patrimonio}</span>
                                        <span className="text-slate-400 text-[11px]">({item.modelo})</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-slate-200 font-medium">{item.aluno_nome}</span>
                                        <span className="block text-[10px] text-slate-500 font-mono">{item.aluno_matricula}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-slate-300">
                                  Lote de <strong className="text-primary font-mono">{timelineModal.quantidade || 1} notebooks</strong> reservado para retirada diária pela turma na bancada da TI.
                                </p>
                              )}
                            </div>
                          ) : timelineModal.status === 'Reprovado' ? (
                            <p className="text-xs text-slate-400 italic">
                              Nenhum notebook vinculado em virtude do indeferimento da solicitação.
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              A vinculação dos equipamentos ocorrerá após deferimento da TI.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* ETAPA 5: CIÊNCIA DOCENTE */}
                      <div className="relative group">
                        <div className={`absolute -left-[31px] top-0 p-1.5 rounded-full border-2 ${
                          timelineModal.visualizada_professor
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                            : timelineModal.status !== 'Aberto'
                            ? 'bg-sky-500/20 border-sky-500 text-sky-400'
                            : 'bg-dark-700 border-dark-500 text-slate-500'
                        }`}>
                          <Eye size={12} weight="bold" />
                        </div>
                        <div className="bg-dark-800/60 border border-dark-700/60 rounded-xl p-4 space-y-1.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                              <Eye size={15} className="text-emerald-400" />
                              5. Notificação e Ciência do Docente
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              timelineModal.visualizada_professor
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : timelineModal.status !== 'Aberto'
                                ? 'bg-sky-500/20 text-sky-300'
                                : 'bg-dark-700 text-slate-400'
                            }`}>
                              {timelineModal.visualizada_professor
                                ? 'Docente Ciente'
                                : timelineModal.status !== 'Aberto'
                                ? 'Notificação Emitida'
                                : 'Aguardando Parecer'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {timelineModal.visualizada_professor
                              ? 'O professor visualizou o desfecho desta solicitação em seu painel docente.'
                              : timelineModal.status !== 'Aberto'
                              ? 'A decisão foi despachada para a conta do professor e aguarda ciência.'
                              : 'O professor será notificado em tempo real assim que o parecer for concluído.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {timelineTab === 'auditoria' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Identificador Único (ID)</span>
                        <span className="font-mono text-slate-200 font-bold">#{timelineModal.id}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Estado Atual</span>
                        <span className="font-bold text-slate-200">{timelineModal.status}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Código da Turma</span>
                        <span className="font-mono text-cyan-300 font-bold">{timelineModal.turma_id}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Curso</span>
                        <span className="text-slate-200 truncate block">{timelineModal.turma_curso || 'N/A'}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Solicitante (Docente)</span>
                        <span className="text-slate-200 block">{timelineModal.solicitante_nome} (ID: {timelineModal.solicitante_id})</span>
                        <span className="text-slate-400 font-mono text-[10px]">{timelineModal.solicitante_email}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Avaliador (TI)</span>
                        <span className="text-slate-200 block">{timelineModal.responsavel_ti_nome || 'Nenhum'}</span>
                        <span className="text-slate-400 font-mono text-[10px]">ID: {timelineModal.responsavel_ti_id || 'N/A'}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Data de Abertura</span>
                        <span className="font-mono text-slate-300">{timelineModal.created_at || 'N/A'}</span>
                      </div>
                      <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Data da Decisão</span>
                        <span className="font-mono text-slate-300">{timelineModal.data_decisao || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="bg-dark-800/60 border border-dark-700/60 p-3 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Metadados de Detalhes da Alocação</span>
                      <pre className="bg-dark-950 p-3 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto border border-dark-800">
                        {timelineModal.detalhes_alocacao 
                          ? JSON.stringify(parsedDetalhesTimeline || timelineModal.detalhes_alocacao, null, 2)
                          : 'null'}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-dark-600/60 bg-dark-850/80 flex items-center justify-between gap-3">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-primary" />
                  <span>Registro auditado pelo Sistema Renove</span>
                </div>
                <div className="flex items-center gap-2">
                  {canAvaliar && timelineModal.status === 'Aberto' && (
                    <Button
                      onClick={() => {
                        setAvaliarModal(timelineModal);
                        setMotivoDecisao('');
                        setTimelineModal(null);
                      }}
                      className="text-xs py-2 px-4 bg-primary hover:bg-primary-hover text-dark-900 font-bold"
                    >
                      Avaliar Solicitação
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setTimelineModal(null)}
                    className="text-xs py-2 px-4 bg-dark-700 hover:bg-dark-600 text-slate-200"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
