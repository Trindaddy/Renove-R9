import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getDashboardAluno,
  getDashboardProfessor,
  getDashboardTi
} from '../services/dashboardService';
import { useWebSocket } from '../hooks/useWebSocket';

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
    // Evita “tela em branco” caso AuthProvider ainda esteja inicializando ou token falhou.
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
        <>
          {/* Novo layout: 3 caixas principais no centro + área de transferência */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DashboardCTAEmprestimo />
                <DashboardCTATurma />
              </div>
            </div>

            <div className="lg:col-span-5">
              <SelectedNotebooksTray />
            </div>
          </div>

          {/* Mantém seções por role abaixo (apenas para compatibilidade com seus endpoints atuais) */}
          <div className="pt-2">
            {user.role === 'ti' && <DashboardTI data={data} />}
            {user.role === 'aluno' && <DashboardAluno data={data} />}
            {user.role === 'professor' && <DashboardProfessor data={data} />}
          </div>
        </>
      )}
    </div>
  );
}

function DashboardHeader({ user }) {
  const firstName = user?.nome?.split(' ')[0] || '';
  const roleMap = { ti: 'Administrador TI', professor: 'Professor', aluno: 'Aluno' };

  return (
    <header className="rounded-2xl border border-navy-500/20 bg-navy-800/20 backdrop-blur-xl p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px w-10 bg-gradient-to-r from-cyan/70 to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-cyan/70 font-semibold">
              Dashboard Central
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bem-vindo, <span className="text-cyan/90">{firstName}</span>
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
    </header>
  );
}

function StatusPill({ label, variant = 'primary' }) {
  return (
    <div
      className={
        variant === 'primary'
          ? 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan/10 border border-cyan/20'
          : 'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-navy-600/30 border border-navy-500/20'
      }
    >
      <span
        className={
          variant === 'primary'
            ? 'h-1.5 w-1.5 rounded-full bg-cyan animate-pulse'
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
          <div className="h-3 w-1/2 bg-slate-700/60 rounded animate-pulse" />
          <div className="mt-5 space-y-3">
            <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
            <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
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
      <span className={`${cfg.dot} mt-0.5`}>✕</span>
      <div>
        {title && <p className={`text-sm font-semibold ${cfg.text}`}>{title}</p>}
        <p className={`text-sm ${cfg.text}/90`}>{children}</p>
      </div>
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <section className={`glass-card p-5 ${className}`}>
      <h2 className="text-xs font-bold tracking-[0.14em] uppercase text-cyan/70 mb-4">
        {title}
      </h2>
      {children}
    </section>
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
      className="group flex items-center justify-between gap-3 p-3 rounded-xl bg-navy-600/20 border border-navy-500/20 hover:border-cyan/30 hover:bg-cyan/5 transition-all duration-300"
    >
      <div className="flex items-center gap-3">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan/40 group-hover:bg-cyan transition-colors" />
        <div>
          <p className="text-sm text-slate-200/95 group-hover:text-cyan transition-colors font-semibold">{label}</p>
          <p className="text-[10px] text-slate-500">{desc}</p>
        </div>
      </div>
      <div className="text-slate-500 group-hover:text-cyan transition-colors">→</div>
    </Link>
  );
}

function DashboardCTAEmprestimo() {
  return (
    <div className="glass-card p-5 border border-cyan/20 bg-navy-800/20 hover:border-cyan/40 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-cyan/80 font-semibold">Ação principal</div>
          <h3 className="mt-2 text-lg font-black text-slate-100">Empréstimo de Notebooks</h3>
          <p className="mt-1 text-sm text-slate-400">Inicie um novo registro e gerencie retiradas/devoluções.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center">
          <span className="text-cyan">◈</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link
          to="/emprestimos"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan/10 border border-cyan/30 hover:border-cyan/50 hover:bg-cyan/15 transition-all duration-300 text-sm font-semibold text-cyan"
        >
          Abrir módulo
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}

function DashboardCTATurma() {
  return (
    <div className="glass-card p-5 border border-navy-500/20 bg-navy-800/20 hover:border-cyan/30 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Consulta rápida</div>
          <h3 className="mt-2 text-lg font-black text-slate-100">Verificar Turma</h3>
          <p className="mt-1 text-sm text-slate-400">Consulte rapidamente a alocação de equipamentos por sala/turma.</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-slate-100/5 border border-navy-500/20 flex items-center justify-center">
          <span className="text-slate-300">▤</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-3">
        <Link
          to="/turmas"
          className="group inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-navy-600/20 border border-navy-500/30 hover:border-cyan/40 hover:bg-cyan/5 transition-all duration-300 text-sm font-semibold text-slate-100"
        >
          Consultar
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}

function SelectedNotebooksTray() {
  // Carrinho visual (ainda sem integração com backend/seleção por notebook)
  const [selected, setSelected] = useState([]);
  const [pulse, setPulse] = useState(false);

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Área de transferência</div>
          <h3 className="mt-2 text-lg font-black text-slate-100">Computadores Selecionados</h3>
          <p className="mt-1 text-sm text-slate-400">Mostra em tempo real (placeholder) os notebooks selecionados.</p>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${selected.length ? 'border-cyan/30 bg-cyan/10 text-cyan' : 'border-navy-500/20 bg-navy-600/20 text-slate-300'} transition-all`}>
            <span className={`h-1.5 w-1.5 rounded-full ${selected.length ? 'bg-cyan animate-pulse' : 'bg-slate-500/80'}`} />
            <span className="text-xs font-bold">{selected.length} itens</span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-navy-500/20 bg-navy-800/20 p-3">
        {selected.length === 0 ? (
          <div className="py-6 text-center">
            <div className={`text-4xl opacity-20 ${pulse ? 'animate-pulse' : ''}`}>▣</div>
            <p className="mt-2 text-sm text-slate-500">Selecione notebooks em “Empréstimos” para preencher este carrinho.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selected.slice(0, 6).map((nb) => (
              <div key={nb.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-navy-600/20 border border-navy-500/15">
                <div>
                  <div className="text-sm font-semibold text-slate-100">{nb.patrimonio}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{nb.modelo}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((x) => x.id !== nb.id))}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15 transition-all"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => {
              // placeholder: preenche com 3 itens fictícios
              const fake = [
                { id: 1, patrimonio: '37600', modelo: 'Dell Latitude 3420' },
                { id: 2, patrimonio: '37601', modelo: 'Dell Latitude 3420' },
                { id: 3, patrimonio: '37602', modelo: 'Lenovo ThinkPad E14' },
              ];
              setSelected(fake);
              setPulse(true);
              setTimeout(() => setPulse(false), 650);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-cyan/10 border border-cyan/30 hover:border-cyan/50 hover:bg-cyan/15 transition-all duration-300 text-sm font-semibold text-cyan"
          >
            Preencher demo
          </button>
          <button
            type="button"
            onClick={() => setSelected([])}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-navy-600/20 border border-navy-500/30 hover:border-cyan/40 hover:bg-cyan/5 transition-all duration-300 text-sm font-semibold text-slate-100"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Inventário de Notebooks">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Total" value={data.notebooksTotais} />
          <Stat label="Disponíveis" value={data.notebooksDisponiveis} accent="text-cyan" />
          <Stat label="Em uso" value={data.notebooksEmUso} accent="text-alert" />
          <Stat label="Manutenção" value={data.notebooksManutencao} accent="text-red-300" />
        </div>
      </Card>

      <Card title="Operação de Hoje">
        <div className="flex flex-col gap-4">
          <Stat label="Reservas de Lote" value={data.reservasHoje} />
          <Stat label="Solicitações Pendentes" value={data.solicitacoesPendentes} accent="text-alert" />
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
  );
}

function DashboardAluno({ data }) {
  if (!data) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-slate-400">Configure o endpoint de dashboard do aluno para visualizar as solicitações.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Minha Solicitação">
        {data.reservaAtual ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-navy-500/20 bg-navy-800/30 px-3 py-2.5">
              <p className="text-sm text-slate-200 font-semibold">{data.reservaAtual.equipamento}</p>
              <p className="text-xs text-slate-400 font-mono mt-1">{data.reservaAtual.horario}</p>
            </div>

            <div className="flex items-center">
              <span className="status-badge bg-slate-100/5 text-slate-200 border border-slate-500/20">
                {data.reservaAtual.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-navy-500/20 bg-navy-800/20 px-3 py-4">
            <p className="text-sm text-slate-400">Você ainda não possui solicitações ativas.</p>
          </div>
        )}
      </Card>

      <Card title="Próximas Aulas">
        <ul className="space-y-2">
          {Array.isArray(data.proximasAulas) &&
            data.proximasAulas.map((aula) => (
              <li
                key={aula.id}
                className="group rounded-xl border border-navy-500/20 bg-navy-600/20 px-3 py-2.5 hover:border-cyan/30 hover:bg-cyan/5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">{aula.curso}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {aula.data} • {aula.turno}
                    </p>
                  </div>
                  <div className="text-slate-500 group-hover:text-cyan transition-colors">◈</div>
                </div>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function DashboardProfessor({ data }) {
  if (!data) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-slate-400">Configure o endpoint de dashboard do professor para visualizar os dados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Resumo de Hoje">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Turmas" value={data.turmasHoje} />
          <Stat label="Reservas Ativas" value={data.reservasAtivas} />
          <Stat label="Alunos Aguardando" value={data.alunosAguardandoNotebook} accent="text-alert" />
          <div />
        </div>
      </Card>

      <Card title="Lotes de Notebooks">
        <ul className="space-y-2">
          {Array.isArray(data.lotes) &&
            data.lotes.map((lote) => (
              <li
                key={lote.id}
                className="rounded-xl border border-navy-500/20 bg-navy-600/20 px-3 py-2.5 hover:border-cyan/30 hover:bg-cyan/5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">{lote.turma}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {lote.data} • {lote.turno} • {lote.quantidade} notebooks
                    </p>
                  </div>
                  <span className="status-badge bg-cyan-dim text-cyan border-cyan/20">{lote.status}</span>
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


