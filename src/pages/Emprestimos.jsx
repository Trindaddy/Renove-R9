import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import EmprestimoForm from '../components/EmprestimoForm.jsx';
import DashboardCards from '../components/DashboardCards.jsx';
import IAWidget from '../components/IAWidget.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  listarEmprestimos,
  criarEmprestimoRapido,
  devolverEmprestimo,
  cancelarEmprestimo,
  getDashboardStats,
  getAlertaEscassez,
  processarEmprestimoLote
} from '../services/emprestimosService';
import { listarTurmas } from '../services/turmasService';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { Laptop, Warning, CheckCircle, WarningCircle, ListBullets, Swap, Lightning, Check } from '@phosphor-icons/react';

export default function Emprestimos() {
  const { user } = useAuth();
  const isProfessorOuTi = user?.role === 'professor' || user?.role === 'ti';

  const [stats, setStats] = useState(null);
  const [alerta, setAlerta] = useState(null);
  const [emprestimos, setEmprestimos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo');
  
  const [confirmDevolucaoId, setConfirmDevolucaoId] = useState(null);
  const [confirmCancelarId, setConfirmCancelarId] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [turmas, setTurmas] = useState([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const { lastMessage } = useWebSocket();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [s, a, e] = await Promise.all([
        getDashboardStats(),
        getAlertaEscassez(),
        listarEmprestimos(filtroStatus)
      ]);
      setStats(s);
      setAlerta(a);
      
      setEmprestimos(Array.isArray(e) ? e : []);
    } catch (err) {
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus, user]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (lastMessage?.type === 'disponibilidade_update') {
      setStats(lastMessage.data);
    }
    if (lastMessage?.type === 'emprestimo_realizado' || lastMessage?.type === 'devolucao_realizada') {
      carregarDados();
    }
  }, [lastMessage, carregarDados]);

  async function handleEmprestimoRapido(dados) {
    try {
      setLoadingAction(true);
      setError('');
      setSuccess('');
      await criarEmprestimoRapido(dados);
      setSuccess('Empréstimo realizado com sucesso!');
      await carregarDados();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar empréstimo');
    } finally {
      setLoadingAction(false);
    }
  }

  async function executeDevolucao() {
    const id = confirmDevolucaoId;
    setConfirmDevolucaoId(null);
    try {
      setLoadingAction(true);
      setError('');
      setSuccess('');
      await devolverEmprestimo(id);
      setShowSuccessToast(true);
      await carregarDados();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao registrar devolução');
    } finally {
      setLoadingAction(false);
    }
  }

  async function executeCancelar() {
    if (!confirmCancelarId) return;
    const id = confirmCancelarId;
    setConfirmCancelarId(null);
    try {
      setLoadingAction(true);
      setError('');
      setSuccess('');
      await cancelarEmprestimo(id);
      setSuccess('Empréstimo cancelado com sucesso!');
      await carregarDados();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cancelar empréstimo');
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6 relative"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-dark-600/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary/60 font-medium">Módulo de Operações</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Empréstimo de <span className="text-primary glow-text-primary">Notebooks</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie empréstimos em tempo real com disponibilidade instantânea via WebSocket.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isProfessorOuTi && (
            <Button
              variant="cyan"
              className="py-1.5 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"
              onClick={async () => {
                setShowBatchModal(true);
                try {
                  const data = await listarTurmas();
                  let list = Array.isArray(data) ? data : [];
                  if (user?.role === 'professor') {
                    list = list.filter(t => t.instrutor === user.nome);
                  }
                  setTurmas(list);
                } catch (err) {
                  setError('Erro ao carregar turmas.');
                }
              }}
            >
              <Lightning weight="fill" size={14} />
              Alocação em Lote
            </Button>
          )}
          {alerta?.ativo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Alerta Ativo</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-600/50">
            <span className={`h-1.5 w-1.5 rounded-full ${lastMessage ? 'bg-primary animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {lastMessage ? 'Live' : 'Syncing'}
            </span>
          </div>
        </div>
      </header>

      {/* Dashboard Cards */}
      {user?.role !== 'professor' && <DashboardCards stats={stats} alerta={alerta} />}

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <WarningCircle className="w-5 h-5 text-red-400 shrink-0" weight="fill" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" weight="fill" />
            <p className="text-sm text-emerald-400">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Form */}
        {user?.role === 'ti' && (
          <div className="xl:col-span-3 space-y-4">
            <div className="glass-card-primary p-5 scan-line sticky top-24">
              <EmprestimoForm onSubmit={handleEmprestimoRapido} loading={loadingAction} />
            </div>
            <IAWidget stats={stats} />
          </div>
        )}

        {/* Right Column - Table */}
        <div className={`${user?.role === 'ti' ? 'xl:col-span-9' : 'xl:col-span-12'}`}>
          <div className="glass-card overflow-hidden">
            {/* Table Header */}
            <div className="px-5 py-4 border-b border-dark-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-dark-900/30">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <ListBullets className="text-primary text-lg" weight="duotone" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">
                    Movimentações Ativas
                  </h2>
                  <p className="text-[10px] text-slate-500">{emprestimos.length} registro(s) encontrado(s)</p>
                </div>
              </div>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="tech-select text-xs w-full sm:w-auto"
              >
                <option value="">Todos os Status</option>
                <option value="Ativo">No Prazo</option>
                <option value="Reservado">Reservados</option>
                <option value="Atrasado">Atrasados</option>
                <option value="Devolvido">Devolvidos</option>
                <option value="Cancelado">Cancelados</option>
              </select>
            </div>

            {/* Layout para Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="tech-table-header">
                  <tr>
                    <th className="text-left px-5 py-3 font-mono">ID</th>
                    <th className="text-left px-5 py-3">Notebook</th>
                    <th className="text-left px-5 py-3">Usuário</th>
                    <th className="text-left px-5 py-3">Status</th>
                    <th className="text-left px-5 py-3 font-mono">Retirada</th>
                    <th className="text-left px-5 py-3 font-mono">Devolução Prevista</th>
                    <th className="text-right px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-5 py-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                          <span className="text-xs text-slate-500 ml-2">Sincronizando dados...</span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && emprestimos.map((emp) => (
                    <tr key={emp.id} className="tech-table-row group">
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        #{emp.id?.toString().padStart(4, '0')}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-primary/80">{emp.notebook?.patrimonio}</span>
                        <p className="text-[11px] text-slate-500 mt-0.5">{emp.notebook?.modelo}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-200">{emp.usuario?.nome}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{emp.usuario?.matricula}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={emp.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {formatDate(emp.data_emprestimo)}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {formatDate(emp.data_prevista_devolucao)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {(emp.status === 'Ativo' || emp.status === 'Atrasado') && (user?.role === 'ti' || user?.role === 'professor') && (
                          <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="success"
                              className="px-2.5 py-1 text-[11px]"
                              onClick={() => setConfirmDevolucaoId(emp.id)}
                              disabled={loadingAction}
                            >
                              Devolver
                            </Button>
                            {user?.role === 'ti' && (
                              <Button
                                variant="danger"
                                className="px-2.5 py-1 text-[11px]"
                                onClick={() => setConfirmCancelarId(emp.id)}
                                disabled={loadingAction}
                              >
                                Cancelar
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!loading && emprestimos.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-3xl opacity-20 text-slate-500"><Swap weight="duotone" /></span>
                          <p className="text-xs text-slate-500">Nenhum empréstimo encontrado para os filtros selecionados.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Layout para Mobile (Cards) */}
            <div className="block md:hidden">
              {loading && (
                <div className="flex items-center justify-center gap-2 py-8">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                </div>
              )}

              {!loading && emprestimos.map((emp) => (
                <div key={emp.id} className="bg-dark-700/30 border-b border-dark-600 p-4 flex flex-col gap-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <StatusBadge status={emp.status} />
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-dark-600/50 flex items-center justify-center shrink-0">
                      <Laptop className="text-primary text-xl" weight="duotone" />
                    </div>
                    <div>
                      <div className="font-mono text-xs text-primary/85 font-semibold">
                        #{emp.id?.toString().padStart(4, '0')} • {emp.notebook?.patrimonio}
                      </div>
                      <div className="text-sm font-bold text-slate-200">{emp.notebook?.modelo}</div>
                    </div>
                  </div>

                  <div className="border-t border-dark-600/30 pt-3 flex flex-col gap-1.5 text-xs">
                    <div>
                      <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Beneficiário</span>
                      <p className="text-slate-200 font-semibold">{emp.usuario?.nome} ({emp.usuario?.matricula})</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Retirada</span>
                        <p className="text-slate-350 font-mono text-[11px]">{formatDate(emp.data_emprestimo)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Devolução Prevista</span>
                        <p className="text-slate-350 font-mono text-[11px]">{formatDate(emp.data_prevista_devolucao)}</p>
                      </div>
                    </div>
                  </div>

                  {(emp.status === 'Ativo' || emp.status === 'Atrasado') && (user?.role === 'ti' || user?.role === 'professor') && (
                    <div className="mt-2 flex gap-2 w-full">
                      <Button
                        variant="success"
                        className="flex-1 text-xs py-3 font-bold uppercase tracking-wider"
                        onClick={() => setConfirmDevolucaoId(emp.id)}
                        disabled={loadingAction}
                      >
                        Devolver
                      </Button>
                      {user?.role === 'ti' && (
                        <Button
                          variant="danger"
                          className="px-4 py-3 text-xs font-bold uppercase bg-red-650/15 border border-red-500/20 text-red-400"
                          onClick={() => setConfirmCancelarId(emp.id)}
                          disabled={loadingAction}
                        >
                          Cancelar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {!loading && emprestimos.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10">
                  <span className="text-3xl opacity-20 text-slate-500"><Swap weight="duotone" /></span>
                  <p className="text-xs text-slate-500">Nenhum empréstimo encontrado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Styled confirm modal for notebook return */}
      <AnimatePresence>
        {confirmDevolucaoId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto mb-4 text-primary text-2xl">
                <Laptop weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Confirmar Devolução
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Confirmar devolução deste notebook ao inventário do Senac?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200"
                  onClick={() => setConfirmDevolucaoId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="success"
                  className="flex-1 text-xs py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500"
                  onClick={executeDevolucao}
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled confirm modal for notebook cancel */}
      <AnimatePresence>
        {confirmCancelarId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl animate-pulse">
                <WarningCircle weight="fill" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Cancelar Empréstimo
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Tem certeza que deseja cancelar este empréstimo? Esta ação é irreversível e o notebook retornará ao inventário.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200"
                  onClick={() => setConfirmCancelarId(null)}
                >
                  Voltar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500"
                  onClick={executeCancelar}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styled success modal for return completion */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-emerald-800/40 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-2xl font-bold">
                <CheckCircle weight="fill" />
              </div>
              <h3 className="text-base font-bold text-emerald-400 mb-2">
                Devolução Registrada!
              </h3>
              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Sucesso! A devolução do notebook foi registrada. Obrigado por colaborar com a organização do inventário!
              </p>
              <Button
                variant="primary"
                className="w-full text-xs py-2"
                onClick={() => setShowSuccessToast(false)}
              >
                Entendido
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Seleção de Turma para Lote */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowBatchModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-md shadow-2xl relative text-slate-200"
            >
              <button
                onClick={() => setShowBatchModal(false)}
                className="absolute top-4 right-4 text-slate-455 hover:text-slate-200 text-sm font-mono"
              >
                ✕
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-405">
                  <Lightning weight="fill" size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">Alocação Automática em Lote</h3>
                  <p className="text-xs text-slate-400">Distribua notebooks para os alunos de uma turma</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-400">Selecione a Turma *</span>
                  <select
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="tech-select text-xs w-full"
                    required
                  >
                    <option value="">Selecione...</option>
                    {turmas.map((t) => (
                      <option key={t.id || t.codigo_turma} value={t.id || t.codigo_turma}>
                        {t.id || t.codigo_turma} — {t.curso}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="cyan"
                    className="flex-1 text-xs py-2.5"
                    disabled={!selectedTurma || batchLoading}
                    onClick={async () => {
                      try {
                        setBatchLoading(true);
                        setError('');
                        const res = await processarEmprestimoLote(selectedTurma);
                        setBatchResult(res);
                        setShowBatchModal(false);
                        setSelectedTurma('');
                        await carregarDados();
                      } catch (err) {
                        setError(err.response?.data?.detail || 'Erro ao processar lote.');
                        setShowBatchModal(false);
                      } finally {
                        setBatchLoading(false);
                      }
                    }}
                  >
                    {batchLoading ? 'Processando...' : 'Iniciar Alocação em Lote'}
                  </Button>
                  <Button
                    variant="outline"
                    className="px-5 py-2.5 bg-dark-700/50 text-slate-300 border border-dark-600"
                    onClick={() => setShowBatchModal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SUB-MODAL: Resultado do Empréstimo em Lote */}
      <AnimatePresence>
        {batchResult && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-xl shadow-2xl relative mx-4 text-slate-200">
              <button
                onClick={() => setBatchResult(null)}
                className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 text-lg"
              >
                ✕
              </button>
              <div className="space-y-4">
                <header className="border-b border-dark-600/50 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check size={20} weight="bold" />
                    <h3 className="text-base font-bold text-slate-100">Resultado da Alocação</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    {batchResult.message}
                  </p>
                </header>

                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                  {/* ALOCADOS */}
                  {batchResult.alocados && batchResult.alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-emerald-405 uppercase tracking-wider">
                        Contemplados ({batchResult.alocados.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {batchResult.alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-xs flex justify-between">
                            <span className="text-slate-300 font-semibold">{item.nome}</span>
                            <span className="font-mono text-emerald-400 font-bold">{item.notebook_patrimonio}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JÁ POSSUÍAM */}
                  {batchResult.ja_alocados && batchResult.ja_alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Já com Notebook ({batchResult.ja_alocados.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {batchResult.ja_alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2 rounded bg-dark-800 border border-dark-600 text-xs flex justify-between">
                            <span className="text-slate-450">{item.nome}</span>
                            <span className="font-mono text-slate-450">{item.notebook_patrimonio}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NÃO ALOCADOS */}
                  {batchResult.nao_alocados && batchResult.nao_alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-red-405 uppercase tracking-wider">
                        Não Alocados (Sem Estoque) ({batchResult.nao_alocados.length})
                      </h4>
                      <div className="space-y-2">
                        {batchResult.nao_alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2.5 rounded bg-red-500/5 border border-red-500/10 text-xs space-y-1">
                            <div className="flex justify-between font-semibold text-slate-300">
                              <span>{item.nome}</span>
                              <span className="text-red-450">{item.motivo}</span>
                            </div>
                            {item.historico && item.historico.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-red-500/10">
                                <span className="text-[10px] text-slate-505">Histórico de Uso Recente:</span>
                                <div className="space-y-1 mt-1 font-mono">
                                  {item.historico.map((h, i) => (
                                    <div key={i} className="text-[10px] text-slate-450 flex justify-between">
                                      <span>{h.modelo} ({h.patrimonio})</span>
                                      <span>{h.data}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-dark-600/50 flex justify-end">
                  <Button
                    onClick={() => setBatchResult(null)}
                    variant="cyan"
                    className="text-xs py-2 px-4"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function formatDate(dateString) {
  if (!dateString) return '--/-- --:--';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
