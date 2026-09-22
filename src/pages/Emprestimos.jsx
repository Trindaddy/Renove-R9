import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import DashboardCards from '../components/DashboardCards.jsx';
import IAWidget from '../components/IAWidget.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import {
  listarEmprestimos,
  devolverEmprestimo,
  cancelarEmprestimo,
  getDashboardStats,
  getAlertaEscassez
} from '../services/emprestimosService';
import { listarNotebooksManutencao } from '../services/equipamentosService';
import { useWebSocket } from '../hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Laptop, 
  WarningCircle, 
  CheckCircle, 
  ListBullets, 
  Swap, 
  Wrench, 
  ChartBar, 
  Clock, 
  TrendUp, 
  Lightning 
} from '@phosphor-icons/react';

export default function Emprestimos() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [alerta, setAlerta] = useState(null);
  const [emprestimos, setEmprestimos] = useState([]);
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingManutencoes, setLoadingManutencoes] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Ativo');
  
  const [confirmDevolucaoId, setConfirmDevolucaoId] = useState(null);
  const [confirmCancelarId, setConfirmCancelarId] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { lastMessage } = useWebSocket();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [s, a, e, m] = await Promise.all([
        getDashboardStats().catch(() => null),
        getAlertaEscassez().catch(() => null),
        listarEmprestimos(filtroStatus).catch(() => []),
        listarNotebooksManutencao().catch(() => [])
      ]);
      setStats(s);
      setAlerta(a);
      setEmprestimos(Array.isArray(e) ? e : []);
      setManutencoes(Array.isArray(m) ? m : []);
    } catch (err) {
      setError('Erro ao carregar dados do módulo de empréstimos.');
    } finally {
      setLoading(false);
    }
  }, [filtroStatus]);

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

  // Cálculos analíticos para tomada de decisão de TI e Docentes
  const analiseMetricas = useMemo(() => {
    const total = emprestimos.length;
    const noPrazo = emprestimos.filter(e => e.status === 'Ativo').length;
    const atrasados = emprestimos.filter(e => e.status === 'Atrasado').length;
    const reservados = emprestimos.filter(e => e.status === 'Reservado').length;
    const devolvidos = emprestimos.filter(e => e.status === 'Devolvido').length;

    const baseCalculo = total > 0 ? total : 1;
    const taxaPontualidade = total > 0 ? Math.round(((total - atrasados) / baseCalculo) * 100) : 100;
    const percNoPrazo = total > 0 ? Math.round((noPrazo / baseCalculo) * 100) : 0;
    const percAtrasados = total > 0 ? Math.round((atrasados / baseCalculo) * 100) : 0;
    const percReservados = total > 0 ? Math.round((reservados / baseCalculo) * 100) : 0;

    // Distribuição por turnos estimada por horário de retirada
    let matutino = 0;
    let vespertino = 0;
    let noturno = 0;

    emprestimos.forEach(e => {
      if (e.data_emprestimo) {
        const hora = new Date(e.data_emprestimo).getHours();
        if (hora >= 6 && hora < 12) matutino++;
        else if (hora >= 12 && hora < 18) vespertino++;
        else noturno++;
      }
    });

    let turnoMaiorDemanda = 'Equilibrado';
    if (matutino > vespertino && matutino > noturno) turnoMaiorDemanda = 'Matutino (Pico)';
    else if (vespertino > matutino && vespertino > noturno) turnoMaiorDemanda = 'Vespertino (Pico)';
    else if (noturno > matutino && noturno > vespertino) turnoMaiorDemanda = 'Noturno (Pico)';

    // Taxa de disponibilidade geral
    const totalFrota = stats ? stats.total : 0;
    const disponiveis = stats ? stats.disponiveis : 0;
    const taxaDisponibilidade = totalFrota > 0 ? Math.round((disponiveis / totalFrota) * 100) : 0;

    let recomendacao = 'Operação regular. Estoque disponível adequado para atender à demanda das próximas turmas.';
    if (atrasados > 3) {
      recomendacao = `Atenção: ${atrasados} computadores estão com devolução atrasada. Recomenda-se acionar docentes responsáveis antes de autorizar novos lotes.`;
    } else if (taxaDisponibilidade < 25) {
      recomendacao = `Estoque em nível de atenção (${taxaDisponibilidade}% disponível). Priorize devoluções imediatas para suportar os próximos turnos.`;
    } else if (taxaPontualidade >= 90) {
      recomendacao = `Excelente conformidade (${taxaPontualidade}% pontual). Janela favorável para liberação de empréstimos e alocações de turmas.`;
    }

    return {
      total,
      noPrazo,
      atrasados,
      reservados,
      devolvidos,
      taxaPontualidade,
      percNoPrazo,
      percAtrasados,
      percReservados,
      turnos: { matutino, vespertino, noturno },
      turnoMaiorDemanda,
      taxaDisponibilidade,
      recomendacao
    };
  }, [emprestimos, stats]);

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
            Acompanhamento em tempo real das movimentações, manutenções ativas e indicadores analíticos.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alerta?.ativo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Alerta de Estoque Crítico</span>
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Cards Estatísticos */}
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
        
        {/* Coluna Esquerda: Painel de Manutenções Ativas & IA */}
        <div className="xl:col-span-4 space-y-5">
          
          {/* Painel de Manutenções Ativas */}
          <div className="glass-card p-5 border border-amber-500/20 bg-dark-900/40">
            <div className="flex items-center justify-between pb-3 border-b border-dark-600/40 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Wrench size={18} weight="duotone" />
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-slate-100">
                    Manutenções Ativas
                  </h3>
                  <p className="text-[10px] text-slate-400">Equipamentos em triagem/reparo</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-mono font-bold text-xs">
                {manutencoes.length}
              </span>
            </div>

            {loadingManutencoes ? (
              <div className="py-6 text-center text-xs text-slate-500 flex justify-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse delay-75" />
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse delay-150" />
              </div>
            ) : manutencoes.length === 0 ? (
              <div className="py-6 px-3 text-center rounded-xl bg-dark-800/20 border border-dark-700/50">
                <CheckCircle className="text-emerald-400 text-2xl mx-auto mb-1.5" weight="duotone" />
                <p className="text-xs text-slate-300 font-medium">Nenhum notebook em manutenção</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Toda a frota está disponível ou alocada.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {manutencoes.map((nb) => (
                  <div key={nb.id} className="p-3 rounded-xl bg-dark-800/40 border border-dark-600/50 hover:border-amber-500/30 transition-all text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono font-black text-amber-400 text-xs">
                        {nb.patrimonio}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-dark-700 text-slate-300 border border-dark-600">
                        {nb.condicao || 'Regular'}
                      </span>
                    </div>
                    <p className="text-slate-200 font-semibold text-[11px] truncate">{nb.modelo}</p>
                    {nb.justificativa_manutencao && (
                      <p className="text-slate-400 text-[10px] italic mt-1 bg-dark-900/60 p-2 rounded border border-dark-700/40 leading-relaxed">
                        "{nb.justificativa_manutencao}"
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-dark-600/30 text-[10px] text-slate-400 font-mono">
                      <span className="truncate max-w-[130px]">{nb.autor_manutencao || 'TI Senac'}</span>
                      <Link to="/equipamentos" className="text-primary hover:underline font-sans font-bold text-[10px]">
                        Ver Inventário →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <IAWidget stats={stats} />
        </div>

        {/* Coluna Direita: Central Analítica + Tabela de Movimentações */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Nova Central Analítica de Empréstimos (Analytics & Decision Center) */}
          <div className="glass-card p-5 border border-primary/20 bg-dark-900/40 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-dark-600/40 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <ChartBar size={18} weight="duotone" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-wider uppercase text-slate-100 flex items-center gap-2">
                    Painel Analítico de Empréstimos
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      Decisão Estratégica
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-400">Indicadores consolidados para tomada de decisão ágil</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400 text-[11px]">Total Analisado:</span>
                <strong className="text-primary font-bold">{analiseMetricas.total} registro(s)</strong>
              </div>
            </div>

            {/* Grid Analítico de 3 Colunas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Taxa de Pontualidade */}
              <div className="p-3.5 rounded-xl bg-dark-800/30 border border-dark-600/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock size={13} className="text-emerald-400" /> Pontualidade
                    </span>
                    <span className="font-mono text-xs font-black text-emerald-400">
                      {analiseMetricas.taxaPontualidade}% no prazo
                    </span>
                  </div>
                  {/* Barra de distribuição segmentada */}
                  <div className="h-2 w-full rounded-full bg-dark-700 overflow-hidden flex my-2">
                    <div style={{ width: `${analiseMetricas.percNoPrazo}%` }} className="bg-emerald-500" title={`No Prazo: ${analiseMetricas.noPrazo}`} />
                    <div style={{ width: `${analiseMetricas.percReservados}%` }} className="bg-amber-400" title={`Reservados: ${analiseMetricas.reservados}`} />
                    <div style={{ width: `${analiseMetricas.percAtrasados}%` }} className="bg-red-500" title={`Atrasados: ${analiseMetricas.atrasados}`} />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                  <span className="text-emerald-400">✓ {analiseMetricas.noPrazo} no prazo</span>
                  <span className="text-amber-400">⏳ {analiseMetricas.reservados} res.</span>
                  <span className="text-red-400">⚠ {analiseMetricas.atrasados} atras.</span>
                </div>
              </div>

              {/* 2. Picos de Demanda por Turno */}
              <div className="p-3.5 rounded-xl bg-dark-800/30 border border-dark-600/40 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <TrendUp size={13} className="text-cyan" /> Picos por Turno
                  </span>
                  <span className="text-[10px] text-cyan font-mono font-bold">
                    {analiseMetricas.turnoMaiorDemanda}
                  </span>
                </div>
                <div className="space-y-1 my-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Matutino (Manhã)</span>
                    <span className="font-mono font-bold text-slate-200">{analiseMetricas.turnos.matutino}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Vespertino (Tarde)</span>
                    <span className="font-mono font-bold text-slate-200">{analiseMetricas.turnos.vespertino}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Noturno (Noite)</span>
                    <span className="font-mono font-bold text-slate-200">{analiseMetricas.turnos.noturno}</span>
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 border-t border-dark-600/30 pt-1">
                  Fluxo ideal para planejamento de empréstimos.
                </p>
              </div>

              {/* 3. Recomendações Acionáveis para Decisão */}
              <div className="p-3.5 rounded-xl bg-dark-800/30 border border-dark-600/40 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1.5">
                    <Lightning size={13} weight="fill" /> Insights de Decisão
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-dark-700 text-slate-300">
                    Sugestão
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 font-medium leading-relaxed my-1">
                  {analiseMetricas.recomendacao}
                </p>
                <div className="pt-1.5 border-t border-dark-600/30 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">Disponibilidade Geral:</span>
                  <strong className="text-primary font-mono">{analiseMetricas.taxaDisponibilidade}% livre</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Movimentações Ativas */}
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
                        <span className="font-mono text-xs text-primary/80 font-bold">{emp.notebook?.patrimonio}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{emp.notebook?.modelo}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-slate-200 font-semibold">{emp.usuario?.nome}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{emp.usuario?.email}</p>
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
                      <p className="text-slate-200 font-semibold">{emp.usuario?.nome} ({emp.usuario?.email})</p>
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
