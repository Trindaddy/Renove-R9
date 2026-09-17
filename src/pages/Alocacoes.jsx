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
  X
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Alocacoes() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const isTi = user?.role === 'ti';

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
                    <tr key={sol.id} className="tech-table-row">
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
                        <div className="inline-flex items-center gap-1.5">
                          {isTi && sol.status === 'Aberto' && (
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
        {avaliarModal && (
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
                    Motivo da Decisão do Administrador <span className="text-red-400">*</span>
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
    </div>
  );
}
