import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getDashboardAluno,
  getDashboardProfessor,
  getDashboardTi
} from '../services/dashboardService';
import { useWebSocket } from '../hooks/useWebSocket';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import IAWidget from '../components/IAWidget.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Laptop, Users, Warning, CheckCircle, Clock, Check, X } from '@phosphor-icons/react';

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { lastMessage } = useWebSocket();

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError('');

      if (user.role === 'ti') setData(await getDashboardTi());
      else if (user.role === 'aluno') setData(await getDashboardAluno());
      else if (user.role === 'professor') setData(await getDashboardProfessor());
    } catch {
      setError('Não foi possível carregar o dashboard. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    if (
      lastMessage?.type === 'disponibilidade_update' ||
      lastMessage?.type === 'emprestimo_realizado' ||
      lastMessage?.type === 'devolucao_realizada'
    ) {
      load();
    }
  }, [lastMessage, user, load]);

  useEffect(() => {
    if (user?.role === 'ti' && data) {
      const total = data.notebooksTotais ?? 0;
      const emUso = data.notebooksEmUso ?? 0;
      const percentualUso = total > 0 ? (emUso / total) * 100 : 0;

      if (total > 0 && percentualUso >= 50.0) {
        window.showToast?.({
          title: 'ALERTA DE ALTA DEMANDA',
          message: `Atenção! Metade do inventário do Renove (R9) já está em campo (${emUso}/${total} notebooks). Monitore os fluxos de devolução!`,
          type: 'warning'
        });
      }

      if (data.notebooksDisponiveis === 0) {
        window.showToast?.({
          title: 'ESTOQUE ESGOTADO',
          message: 'Não há notebooks disponíveis em estoque no momento. Operações de alocação de novos lotes estão suspensas.',
          type: 'danger'
        });
      } else if (data.alerta_escassez) {
        window.showToast?.({
          title: 'ESTOQUE CRÍTICO',
          message: `Atenção! Disponibilidade de estoque abaixo de 20% (${data.notebooksDisponiveis} unidades restantes).`,
          type: 'danger'
        });
      }
    }
  }, [data, user]);


  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-400">Carregando usuário...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modal de bloqueio caso o professor não tenha turmas alocadas */}
      <AnimatePresence>
        {user.role === 'professor' && data && data.has_turmas === false && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-dark-950/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative w-full max-w-lg rounded-2xl border border-red-500/30 bg-dark-850 p-6 shadow-2xl overflow-hidden z-10 text-slate-200"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <Warning weight="fill" className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 tracking-tight">Acesso Restrito</h3>
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">
                    Prezado(a) Instrutor(a), não foram identificadas turmas alocadas para a realização de empréstimos. Notifique a Equipe de TI para a resolução do problema.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DashboardHeader user={user} />

      {loading && <DashboardSkeleton />}

      {error && (
        <AlertBanner tone="danger" title="Erro ao carregar">
          {error}
        </AlertBanner>
      )}

      {!loading && !error && (
        <motion.div 
          initial="hidden" animate="visible"
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
        >
          {/* Main Layout Area */}
          {user.role !== 'aluno' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mb-5">
              <div className="lg:col-span-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <DashboardCTAEmprestimo />
                  <DashboardCTATurma />
                </div>
              </div>

              <div className="lg:col-span-5">
                <AlertsAndShortcutsTray user={user} data={data} />
              </div>
            </div>
          )}

          {/* Role specific areas */}
          <div className="pt-2">
            {user.role === 'ti' && <DashboardTI data={data} />}
            {user.role === 'aluno' && <DashboardAluno data={data} user={user} onRefresh={load} />}
            {user.role === 'professor' && <DashboardProfessor data={data} />}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DashboardHeader({ user }) {
  const firstName = user?.nome?.split(' ')[0] || '';
  const roleMap = { ti: 'Administrador TI', professor: 'Professor', aluno: 'Aluno' };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-dark-600 bg-dark-800/40 backdrop-blur-xl p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-10 bg-gradient-to-r from-primary/70 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-primary/70 font-semibold">
              Dashboard Central
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bem-vindo, <span className="text-primary/90 glow-text-primary">{firstName}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Visão geral • Perfil:{' '}
            <span className="text-slate-200/90 font-mono text-xs uppercase tracking-wider">
              {roleMap[user.role] || user.role}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill label="Tempo Real" />
          <StatusPill
            label={user.role === 'ti' ? 'Gestão' : user.role === 'professor' ? 'Coordenação' : 'Aluno'}
            variant="muted"
          />
        </div>
      </div>
    </motion.header>
  );
}

function StatusPill({ label, variant = 'primary' }) {
  return (
    <div
      className={
        variant === 'primary'
          ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20'
          : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-dark-600/30 border border-dark-500/20'
      }
    >
      <span
        className={
          variant === 'primary'
            ? 'h-1.5 w-1.5 rounded-full bg-primary animate-pulse'
            : 'h-1.5 w-1.5 rounded-full bg-slate-500/80'
        }
      />
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200/90">{label}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="glass-card p-5">
          <div className="h-3 w-1/2 bg-dark-600/60 rounded animate-pulse" />
          <div className="mt-5 space-y-3">
            <div className="h-6 bg-dark-600/50 rounded animate-pulse" />
            <div className="h-6 bg-dark-600/50 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertBanner({ tone = 'danger', title, children }) {
  const map = {
    danger: {
      wrap: 'bg-red-950/30 border border-red-800/30',
      dot: 'text-red-400',
      text: 'text-red-400'
    }
  };

  const cfg = map[tone] || map.danger;

  return (
    <div className={`${cfg.wrap} rounded-xl px-4 py-3 flex items-start gap-3`}>
      <span className={`${cfg.dot} mt-0.5`}><Warning weight="fill" /></span>
      <div>
        {title && <p className={`text-sm font-semibold ${cfg.text}`}>{title}</p>}
        <p className={`text-sm ${cfg.text}/90`}>{children}</p>
      </div>
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <motion.section 
      variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
      className={`glass-card p-5 ${className}`}
    >
      <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-primary/70 mb-4">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}

function Stat({ label, value, accent = '' }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <span className={`text-xl font-black ${accent || 'text-slate-100'}`}>{value ?? '--'}</span>
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-dark-700/20 border border-dark-600/50 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
        <div>
          <p className="text-sm text-slate-200/95 group-hover:text-primary transition-colors font-semibold">{label}</p>
          <p className="text-[10px] text-slate-500">{desc}</p>
        </div>
      </div>
      <ArrowRight className="text-slate-500 group-hover:text-primary transition-colors" weight="bold" />
    </Link>
  );
}

function DashboardCTAEmprestimo() {
  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="glass-card p-5 border border-primary/20 bg-dark-800/40 hover:border-primary/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">Ação principal</div>
          <h3 className="mt-2 text-lg font-black text-slate-100">Empréstimo Rápido</h3>
          <p className="mt-1 text-sm text-slate-400">Inicie um novo registro e gerencie retiradas.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Laptop weight="duotone" className="text-primary text-xl" />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link
          to="/emprestimos"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 hover:border-primary/50 hover:bg-primary/15 transition-all duration-300 text-sm font-semibold text-primary"
        >
          Abrir módulo
          <ArrowRight className="transition-transform group-hover:translate-x-1" weight="bold" />
        </Link>
      </div>
    </motion.div>
  );
}

function DashboardCTATurma() {
  return (
    <motion.div variants={{ hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1 } }} className="glass-card p-5 border border-dark-600 bg-dark-800/40 hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Consulta rápida</div>
          <h3 className="mt-2 text-lg font-black text-slate-100">Verificar Turma</h3>
          <p className="mt-1 text-sm text-slate-400">Consulte alocação de equipamentos por sala.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-100/5 border border-dark-600 flex items-center justify-center">
          <Users weight="duotone" className="text-slate-300 text-xl" />
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link
          to="/turmas"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-dark-700/40 border border-dark-500/30 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300 text-sm font-semibold text-slate-100"
        >
          Consultar
          <ArrowRight className="transition-transform group-hover:translate-x-1" weight="bold" />
        </Link>
      </div>
    </motion.div>
  );
}

function AlertsAndShortcutsTray({ user, data }) {
  if (user?.role !== 'ti') {
    return (
      <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="glass-card p-5 h-full">
        <h3 className="text-sm font-bold text-slate-100 mb-3">Atalhos Rápidos</h3>
        <div className="grid grid-cols-1 gap-2">
          <QuickLink to="/emprestimos" label="Registros de Empréstimo" desc="Acompanhe as retiradas ativas" />
          <QuickLink to="/historico" label="Histórico Geral" desc="Consulte movimentações passadas" />
        </div>
      </motion.div>
    );
  }

  // TI Role
  const alerts = [];
  
  // 1. Atrasados
  if (data?.atrasadosCount > 0) {
    alerts.push({
      type: 'danger',
      message: `Atenção: ${data.atrasadosCount} notebook(s) em atraso de devolução!`,
      link: '/emprestimos'
    });
  }
  
  // 2. Manutenções
  if (data?.manutencaoHojeCount > 0) {
    alerts.push({
      type: 'warning',
      message: `Manutenção: ${data.manutencaoHojeCount} notebook(s) enviado(s) para manutenção hoje.`,
      link: '/equipamentos'
    });
  }
  
  // 3. Alta Demanda (>=50% em uso)
  const total = data?.notebooksTotais ?? 0;
  const emUso = data?.notebooksEmUso ?? 0;
  const percentualUso = total > 0 ? (emUso / total) * 100 : 0;
  if (total > 0 && percentualUso >= 50.0) {
    alerts.push({
      type: 'warning',
      message: `Atenção! Metade do inventário do Renove (R9) já está em campo. Monitore os fluxos de devolução! (${emUso}/${total} em uso)`,
      link: '/emprestimos'
    });
  }

  // 4. Estoque Crítico ou Esgotado
  if (data?.notebooksDisponiveis === 0) {
    alerts.push({
      type: 'danger',
      message: `Estoque Esgotado: Não há notebooks disponíveis em estoque no momento.`,
      link: '/equipamentos',
      pulse: true
    });
  } else if (data?.alerta_escassez) {
    alerts.push({
      type: 'danger',
      message: `Escassez Crítica: Estoque de notebooks disponíveis está abaixo de 20%! (${data.notebooksDisponiveis} restantes)`,
      link: '/equipamentos'
    });
  }

  return (
    <motion.div variants={{ hidden: { opacity: 0, x: 20 }, visible: { opacity: 1, x: 0 } }} className="glass-card p-5 h-full flex flex-col justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-2">Painel Operacional</div>
        <h3 className="text-lg font-black text-slate-100">Alertas & Atalhos</h3>
        
        {/* Alertas Críticos */}
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="p-3 rounded-xl border border-dark-600 bg-emerald-950/10 text-emerald-400 text-xs flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Nenhum alerta crítico ativo. Sistema operando normalmente!
            </div>
          ) : (
            alerts.map((al, idx) => (
              <Link
                key={idx}
                to={al.link}
                className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.01] duration-200 ${
                  al.pulse
                    ? 'bg-red-950/40 border-red-500 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : al.type === 'danger'
                    ? 'bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-950/30'
                    : 'bg-amber-950/20 border-amber-900/40 text-amber-400 hover:bg-amber-950/30'
                }`}
              >
                <span className="mt-0.5">⚠️</span>
                <span>{al.message}</span>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Atalhos Rápidos */}
      <div className="mt-4 pt-4 border-t border-dark-600/50 space-y-2">
        <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Acesso Direto TI</div>
        <div className="grid grid-cols-2 gap-2">
          <Link
            to="/alocacoes"
            className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-primary/40 hover:bg-primary/5 text-center transition-all group"
          >
            <span className="text-lg font-black text-primary group-hover:scale-110 transition-transform">
              {data?.alocacoesHoje ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Alocações Hoje</span>
          </Link>
          <Link
            to="/usuarios"
            className="flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg bg-dark-700/50 border border-dark-600 hover:border-primary/40 hover:bg-primary/5 text-center transition-all group"
          >
            <span className="text-lg font-black text-slate-100 group-hover:scale-110 transition-transform">
              {data?.totalUsuarios ?? '—'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Contas de Usuários</span>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardTI({ data }) {
  if (!data) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-slate-400">Configure o endpoint de dashboard de TI para visualizar os dados.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Inventário de Notebooks">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Total" value={data.notebooksTotais} />
            <Stat label="Disponíveis" value={data.notebooksDisponiveis} accent="text-primary glow-text-primary" />
            <Stat label="Em uso" value={data.notebooksEmUso} accent="text-accent glow-text-accent" />
            <Stat label="Manutenção" value={data.notebooksManutencao} accent="text-red-400" />
          </div>
        </Card>

        <Card title="Operação de Hoje">
          <div className="flex flex-col gap-4">
            <Stat label="Reservas de Lote" value={data.reservasHoje} />
            <Stat label="Solicitações Pendentes" value={data.solicitacoesPendentes} accent="text-accent" />
          </div>
        </Card>

        <Card title="Acesso Rápido">
          <div className="space-y-2">
            <QuickLink to="/emprestimos" label="Empréstimos" desc="Retiradas e devoluções" />
            <QuickLink to="/solicitacoes" label="Solicitações" desc="Fila de pedidos" />
            <QuickLink to="/equipamentos" label="Inventário" desc="Controle de notebooks" />
            <QuickLink to="/historico" label="Histórico" desc="Log de movimentações" />
          </div>
        </Card>
      </div>

      {/* IA Preditiva */}
      <div className="mt-5">
        <IAWidget />
      </div>
    </>
  );
}

function DashboardAluno({ data, user, onRefresh }) {
  const [patrimonio, setPatrimonio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [confirmSuccess, setConfirmSuccess] = useState('');

  const [showNoDispoModal, setShowNoDispoModal] = useState(false);

  useEffect(() => {
    if (data && data.semDisponibilidadeHoje) {
      setShowNoDispoModal(true);
    } else {
      setShowNoDispoModal(false);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-slate-400">Carregando dados do aluno...</p>
      </div>
    );
  }

  async function handleQuickLoan(e) {
    e.preventDefault();
    if (!patrimonio || !patrimonio.trim()) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const { criarEmprestimoRapido } = await import('../services/emprestimosService');
      await criarEmprestimoRapido({
        notebook_patrimonio: patrimonio.trim(),
        usuario_matricula: user.matricula,
        motivo: 'Retirada Individual Aluno',
        horas_previstas: 4
      });
      setSuccess('Retirada rápida registrada! Confirme a retirada física abaixo.');
      setPatrimonio('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar empréstimo. Verifique o patrimônio.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmRetirada() {
    if (!data.reservaAtual?.id) return;
    try {
      setConfirmLoading(true);
      setConfirmError('');
      setConfirmSuccess('');
      const { confirmarRetirada } = await import('../services/emprestimosService');
      await confirmarRetirada(data.reservaAtual.id);
      
      if (window.showToast) {
        window.showToast({
          title: 'Retirada Confirmada',
          message: 'Retirada física confirmada com sucesso! Bom uso do equipamento.',
          type: 'success'
        });
      }
      
      setConfirmSuccess('Retirada física confirmada com sucesso! Bom uso do equipamento.');
      setTimeout(() => setConfirmSuccess(''), 6000);
      if (onRefresh) onRefresh();
    } catch (err) {
      setConfirmError(err.response?.data?.detail || 'Erro ao confirmar a retirada física.');
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Grid Layout Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo/Central - Informações do Notebook (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-dark-600 bg-dark-800/40 backdrop-blur-xl p-5">
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider mb-2 font-mono">Notebook Vinculado</h2>
            <p className="text-xs text-slate-405 font-medium">Verifique os detalhes e confirme a retirada de seu equipamento acadêmico.</p>
          </div>

          {data.reservaAtual ? (
            data.reservaAtual.confirmacaoPendente ? (
              /* ESTADO A: Pendente de Confirmação (Aguardando Retirada) */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-dark-800/80 to-dark-800/90 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                
                {/* Mensagem de Disponibilização (Destaque) */}
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-3 animate-pulse">
                  <Warning weight="fill" className="text-xl shrink-0" />
                  <div>
                    <span className="font-black uppercase tracking-wider block text-[10px] text-amber-400 font-mono">Notificação de Retirada</span>
                    Você tem um dispositivo aguardando a sua retirada no balcão de atendimento!
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                      <Laptop weight="duotone" className="text-3xl" />
                    </div>
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider text-amber-405 font-mono">
                        {data.reservaAtual.status || "Notebook Disponível"}
                      </span>
                      <h2 className="text-lg font-black text-slate-100">{data.reservaAtual.modelo}</h2>
                      <p className="text-sm text-slate-400">
                        Confirme o recebimento do notebook ao retirar o equipamento fisicamente.
                      </p>
                    </div>
                  </div>

                  {/* Barcode / Tech Chip */}
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-dark-900/60 border border-dark-600/50 min-w-[200px] shrink-0">
                    <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 font-bold font-mono">Patrimônio</div>
                    
                    <div className="flex items-center justify-center gap-3 px-4 py-2 rounded-lg bg-amber-500/5 border border-amber-500/30 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <span className="text-2xl font-mono font-black text-amber-400 tracking-widest uppercase">
                        {data.reservaAtual.patrimonio}
                      </span>
                    </div>
                    
                    <div className="flex gap-[2px] h-6 items-end opacity-60 mt-1 select-none pointer-events-none">
                      <div className="w-[1px] h-full bg-slate-400" />
                      <div className="w-[3px] h-full bg-slate-400" />
                      <div className="w-[1px] h-4 bg-slate-400" />
                      <div className="w-[2px] h-full bg-slate-400" />
                      <div className="w-[1px] h-full bg-slate-400" />
                      <div className="w-[4px] h-full bg-slate-400" />
                      <div className="w-[1px] h-3 bg-slate-400" />
                      <div className="w-[2px] h-full bg-slate-400" />
                      <div className="w-[1px] h-full bg-slate-400" />
                      <div className="w-[3px] h-4 bg-slate-400" />
                    </div>
                  </div>

                  {/* Confirm Action Button */}
                  <div className="w-full lg:w-auto shrink-0 flex flex-col gap-2">
                    <button 
                      onClick={handleConfirmRetirada} 
                      disabled={confirmLoading}
                      className="w-full lg:w-auto px-8 py-4 font-black text-sm tracking-wider uppercase rounded-xl bg-gradient-to-r from-cyan-500 via-primary to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.35)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 group"
                    >
                      {confirmLoading ? (
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle weight="bold" size={18} className="group-hover:scale-110 transition-transform" />
                          Confirmar Retirada
                        </>
                      )}
                    </button>
                    {confirmError && (
                      <p className="text-xs text-red-400 text-center bg-red-950/20 border border-red-900/40 rounded p-1.5 max-w-[240px] mx-auto">
                        {confirmError}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* ESTADO B: Ativo e Confirmado (Mensagem de Bom Uso) */
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-dark-800/80 to-dark-800/90 backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                      <CheckCircle weight="fill" className="text-4xl text-emerald-400" />
                    </div>
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider text-emerald-405 font-mono">
                        Ativo / Em Uso
                      </span>
                      <h2 className="text-lg font-black text-slate-100">{data.reservaAtual.modelo}</h2>
                      <p className="text-xs text-slate-400 font-mono mt-1">{data.reservaAtual.horario}</p>
                    </div>
                  </div>

                  {/* Patrimonio Display */}
                  <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-dark-900/60 border border-dark-600/50 min-w-[150px] shrink-0">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold font-mono">Patrimônio Ativo</span>
                    <span className="text-xl font-mono font-black text-emerald-450 tracking-wider font-semibold">
                      {data.reservaAtual.patrimonio}
                    </span>
                    <span className="text-[10px] text-slate-450 capitalize font-medium">Condição: {data.reservaAtual.condicao}</span>
                  </div>
                </div>

                {/* Mensagem de Bom Uso com design premium */}
                <div className="mt-6 p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-xs text-emerald-300 leading-relaxed shadow-inner">
                  <p className="font-bold text-emerald-400 mb-2 flex items-center gap-1.5 text-xs font-mono">
                    <span>💡</span> Dica de Bom Uso:
                  </p>
                  Aproveite o seu notebook para as atividades acadêmicas! Zelar pelo patrimônio público garante que todos os alunos tenham acesso a equipamentos de qualidade. Lembre-se de devolvê-lo ao final da aula.
                </div>
              </motion.div>
            )
          ) : (
            /* ESTADO C: Nenhum Notebook Alocado (Com Formulário de Retirada Rápida) */
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-dark-600 bg-dark-800/40 backdrop-blur-xl p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-405">
                  <Warning weight="fill" className="text-xl" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-red-400">Sem empréstimos disponíveis</h2>
                  <p className="text-xs text-slate-450 font-semibold">Nenhum notebook foi pré-alocado ou liberado para você hoje.</p>
                </div>
              </div>

              <div className="border-t border-dark-600/50 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 font-mono">Retirada Rápida de Notebook</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                  Caso o instrutor solicite a retirada individual, insira o número de patrimônio do notebook abaixo para alocá-lo à sua conta.
                </p>

                <form onSubmit={handleQuickLoan} className="space-y-3 max-w-md">
                  <Input
                    placeholder="Ex: 21491"
                    value={patrimonio}
                    onChange={(e) => setPatrimonio(e.target.value)}
                    disabled={loading}
                    required
                  />
                  {error && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded p-2">{error}</p>}
                  {success && <p className="text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-900 rounded p-2">{success}</p>}
                  <Button 
                    type="submit" 
                    variant="cyan" 
                    className="w-full text-xs py-2.5 uppercase font-bold tracking-wider font-mono" 
                    disabled={loading}
                  >
                    {loading ? 'Validando...' : 'Iniciar Retirada'}
                  </Button>
                </form>
              </div>
            </motion.div>
          )}
        </div>

        {/* Lado Direito - Timeline de Histórico & Agenda (1/3) */}
        <div className="space-y-6">
          {/* Histórico Completo em Timeline */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-dark-600/50 pb-2 flex items-center gap-2">
              <Clock size={16} className="text-primary" />
              Histórico de Retiradas
            </h3>
            
            <div className="relative pl-5 border-l border-dark-600/70 space-y-5 max-h-[300px] overflow-y-auto pr-1">
              {Array.isArray(data.historicoAnterior) && data.historicoAnterior.length > 0 ? (
                data.historicoAnterior.map((item, idx) => (
                  <div key={item.id || idx} className="relative group">
                    {/* Node dot */}
                    <div className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500/80 border border-emerald-400 group-hover:scale-125 transition-transform" />
                    
                    {/* Content */}
                    <div className="space-y-0.5">
                      <span className="block text-[10px] font-mono text-slate-500">{item.data}</span>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-200">{item.modelo}</span>
                        <span className="font-mono text-[10px] text-primary/80 font-bold bg-primary/5 px-1.5 py-0.5 rounded border border-primary/15">{item.patrimonio}</span>
                      </div>
                      <span className="inline-flex items-center text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.25 rounded-full uppercase tracking-wider font-mono">
                        Devolvido
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 italic">
                  Nenhuma movimentação anterior registrada.
                </div>
              )}
            </div>
          </div>

          {/* Agenda de Aulas */}
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase font-mono border-b border-dark-600/50 pb-2 flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Agenda de Aulas
            </h3>
            <ul className="space-y-3 max-h-[250px] overflow-y-auto pr-1">
              {Array.isArray(data.proximasAulas) &&
                data.proximasAulas.map((aula) => (
                  <li
                    key={aula.id}
                    className="group rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-200 font-semibold">{aula.curso}</p>
                        <p className="text-[9px] text-slate-550 font-mono mt-1 flex items-center gap-1">
                          <Clock weight="fill" /> Turma: {aula.id} • {aula.data} • {aula.turno}
                        </p>
                      </div>
                      <ArrowRight weight="bold" size={12} className="text-slate-505 group-hover:text-primary transition-colors" />
                    </div>
                  </li>
                ))}
              {(!Array.isArray(data.proximasAulas) || data.proximasAulas.length === 0) && (
                <div className="py-4 text-center text-slate-500 text-xs">Nenhuma aula agendada para sua turma.</div>
              )}
            </ul>
          </div>
        </div>

      </div>

      {/* Lack of Availability Modal */}
      <AnimatePresence>
        {showNoDispoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNoDispoModal(false)}
              className="absolute inset-0 bg-dark-950/80 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl rounded-2xl border border-red-500/30 bg-dark-850 p-6 shadow-2xl overflow-hidden z-10 text-slate-200"
            >
              {/* Alert Ribbon */}
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />
              
              <div className="flex items-start gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                  <Warning weight="fill" className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-100 tracking-tight">
                    {user.nome}, sem empréstimo disponível hoje.
                  </h3>
                  <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                    Não há notebooks disponíveis em estoque no momento para a sua turma. Entre em contato com a equipe de TI ou o seu instrutor para mais informações.
                  </p>
                </div>
              </div>

              {/* History Table */}
              <div className="space-y-3 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-455 flex items-center gap-1.5">
                  Histórico de Empréstimos Recentes
                </h4>
                
                <div className="border border-dark-600 rounded-xl overflow-hidden bg-dark-900/30 max-h-60 overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-dark-600 bg-dark-800/50 text-[10px] uppercase font-bold tracking-wider text-slate-405">
                        <th className="px-4 py-3">Patrimônio</th>
                        <th className="px-4 py-3">Modelo</th>
                        <th className="px-4 py-3">Data de Retirada</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs text-slate-300 divide-y divide-dark-600/50">
                      {Array.isArray(data.historicoAnterior) && data.historicoAnterior.length > 0 ? (
                        data.historicoAnterior.map((item) => (
                          <tr key={item.id} className="hover:bg-dark-700/20 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-primary">{item.patrimonio}</td>
                            <td className="px-4 py-3">{item.modelo}</td>
                            <td className="px-4 py-3 text-slate-400 font-mono">{item.data}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="3" className="px-4 py-6 text-center text-slate-500 italic">
                            Nenhum empréstimo anterior encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end border-t border-dark-600/50 pt-4">
                <Button 
                  onClick={() => setShowNoDispoModal(false)} 
                  className="px-6 py-2 text-xs font-bold uppercase tracking-wider bg-dark-700 hover:bg-dark-600 text-slate-350 border border-dark-600"
                >
                  OK
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardProfessor({ data }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Resumo de Hoje">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Turmas" value={data.turmasHoje} />
          <Stat label="Reservas Ativas" value={data.reservasAtivas} />
          <Stat label="Alunos Aguardando" value={data.alunosAguardandoNotebook} accent="text-accent" />
          <div />
        </div>
      </Card>

      <Card title="Lotes de Notebooks">
        <ul className="space-y-2">
          {Array.isArray(data.lotes) &&
            data.lotes.map((lote) => (
              <li
                key={lote.id}
                className="rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">{lote.turma}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {lote.data} • {lote.turno} • {lote.quantidade} notebooks
                    </p>
                  </div>
                  <span className="status-badge bg-primary/10 text-primary border border-primary/20">{lote.status}</span>
                </div>
              </li>
            ))}
        </ul>
      </Card>

      <Card title="Ações Rápidas">
        <div className="space-y-2">
          <QuickLink to="/reservas" label="Nova Reserva" desc="Criar reserva de lote" />
          <QuickLink to="/emprestimos" label="Empréstimos" desc="Gerenciar retiradas" />
          <QuickLink to="/historico" label="Histórico" desc="Log de operações" />
        </div>
      </Card>
    </div>
  );
}
