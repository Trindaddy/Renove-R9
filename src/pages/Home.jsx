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
import { motion } from 'framer-motion';
import { ArrowRight, Laptop, Users, Warning, CheckCircle, Clock } from '@phosphor-icons/react';

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


  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-slate-400">Carregando usuário...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
  if (data?.atrasadosCount > 0) {
    alerts.push({
      type: 'danger',
      message: `Atenção: ${data.atrasadosCount} notebook(s) em atraso de devolução!`,
      link: '/emprestimos'
    });
  }
  if (data?.manutencaoHojeCount > 0) {
    alerts.push({
      type: 'warning',
      message: `Manutenção: ${data.manutencaoHojeCount} notebook(s) enviado(s) para manutenção hoje.`,
      link: '/equipamentos'
    });
  }
  if (data?.alerta_escassez) {
    alerts.push({
      type: 'danger',
      message: `Escassez Crítica: Estoque de notebooks disponíveis está abaixo de 20%!`,
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
                  al.type === 'danger'
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
      setSuccess('Empréstimo rápido registrado com sucesso!');
      setPatrimonio('');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao realizar empréstimo. Verifique o patrimônio.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Retirada Rápida de Notebook">
        <form onSubmit={handleQuickLoan} className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Digite o patrimônio do notebook que você está retirando para validar e registrar imediatamente.
          </p>
          <Input
            placeholder="Ex: 21491"
            value={patrimonio}
            onChange={(e) => setPatrimonio(e.target.value)}
            disabled={loading}
            required
          />
          {error && <p className="text-xs text-red-400 bg-red-950/20 border border-red-900 rounded p-2">{error}</p>}
          {success && <p className="text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-900 rounded p-2">{success}</p>}
          <Button type="submit" variant="cyan" className="w-full text-xs" disabled={loading}>
            {loading ? 'Validando...' : 'Confirmar Retirada'}
          </Button>
        </form>
      </Card>

      <Card title="Minha Solicitação">
        {data.reservaAtual ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-dark-600 bg-dark-800/50 px-3 py-2.5">
              <p className="text-sm text-slate-200 font-semibold">{data.reservaAtual.equipamento}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{data.reservaAtual.horario}</p>
            </div>
            <div className="flex items-center">
              <span className={`status-badge ${
                data.reservaAtual.status === 'Atrasado'
                  ? 'bg-red-500/10 text-red-450 border border-red-500/20 animate-pulse'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              }`}>
                {data.reservaAtual.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dark-600 bg-dark-800/40 px-3 py-4">
            <p className="text-sm text-slate-400">Você não possui nenhum notebook ativo no momento.</p>
          </div>
        )}
      </Card>

      <Card title="Próximas Aulas">
        <ul className="space-y-2">
          {Array.isArray(data.proximasAulas) &&
            data.proximasAulas.map((aula) => (
              <li
                key={aula.id}
                className="group rounded-xl border border-dark-600 bg-dark-700/30 px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">{aula.curso}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                      <Clock weight="fill" /> Turma: {aula.id} • {aula.data} • {aula.turno}
                    </p>
                  </div>
                  <ArrowRight weight="bold" className="text-slate-500 group-hover:text-primary transition-colors" />
                </div>
              </li>
            ))}
          {(!Array.isArray(data.proximasAulas) || data.proximasAulas.length === 0) && (
            <div className="py-6 text-center text-slate-500 text-xs">Nenhuma aula agendada para sua turma.</div>
          )}
        </ul>
      </Card>
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
          <QuickLink to="/solicitacoes" label="Solicitações" desc="Fila de alunos" />
          <QuickLink to="/historico" label="Histórico" desc="Log de operações" />
        </div>
      </Card>
    </div>
  );
}
