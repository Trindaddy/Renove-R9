import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getDashboardAluno,
  getDashboardProfessor,
  getDashboardTi
} from '../services/dashboardService';

export default function Home() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        setLoading(true);
        setError('');

        if (user.role === 'ti') {
          const response = await getDashboardTi();
          setData(response);
        } else if (user.role === 'aluno') {
          const response = await getDashboardAluno();
          setData(response);
        } else if (user.role === 'professor') {
          const response = await getDashboardProfessor();
          setData(response);
        }
      } catch (err) {
        setError('Não foi possível carregar o dashboard. Verifique a API.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user]);

  if (!user) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="pb-4 border-b border-navy-500/20">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60">Dashboard Central</span>
        </div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Bem-vindo, <span className="text-cyan glow-text-cyan">{user.nome?.split(' ')[0] || ''}</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Visão geral do ambiente • Perfil: <span className="text-cyan/80 font-mono text-xs uppercase tracking-wider">{user.role}</span>
        </p>
      </header>

      {loading && (
        <div className="flex items-center gap-3 py-8">
          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
          <span className="text-sm text-slate-500 font-mono">Carregando dados do sistema...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-red-400">✕</span>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {user.role === 'ti' && <DashboardTI data={data} />}
          {user.role === 'aluno' && <DashboardAluno data={data} />}
          {user.role === 'professor' && <DashboardProfessor data={data} />}
        </>
      )}
    </div>
  );
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`glass-card p-5 ${className}`}>
      <h2 className="text-xs font-bold tracking-[0.15em] uppercase text-cyan/60 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-[0.15em] text-slate-500">{label}</span>
      <span className={`text-xl font-black ${accent || 'text-slate-100'}`}>{value ?? '--'}</span>
    </div>
  );
}

function QuickLink({ to, label, desc }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg bg-navy-600/20 border border-navy-500/20 hover:border-cyan/30 hover:bg-cyan-dim transition-all duration-300 group"
    >
      <div className="h-1.5 w-1.5 rounded-full bg-cyan/40 group-hover:bg-cyan transition-colors" />
      <div>
        <p className="text-xs text-slate-200 group-hover:text-cyan transition-colors">{label}</p>
        <p className="text-[10px] text-slate-500">{desc}</p>
      </div>
    </Link>
  );
}

function DashboardTI({ data }) {
  if (!data) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-sm text-slate-400">
          Configure o endpoint de dashboard de TI para visualizar os dados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Card title="Inventário de Notebooks">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Total" value={data.notebooksTotais} />
          <Stat label="Disponíveis" value={data.notebooksDisponiveis} accent="text-cyan glow-text-cyan" />
          <Stat label="Em uso" value={data.notebooksEmUso} accent="text-alert" />
          <Stat label="Manutenção" value={data.notebooksManutencao} accent="text-red-400" />
        </div>
      </Card>

      <Card title="Operação de Hoje">
        <div className="flex flex-col gap-4">
          <Stat label="Reservas de Lote" value={data.reservasHoje} />
          <Stat label="Solicitações Pendentes" value={data.solicitacoesPendentes} accent="text-alert glow-text-alert" />
        </div>
      </Card>

      <Card title="Navegação Rápida">
        <div className="space-y-2">
          <QuickLink to="/emprestimos" label="Empréstimos" desc="Gerenciar retiradas e devoluções" />
          <QuickLink to="/solicitacoes" label="Solicitações" desc="Fila de pedidos dos alunos" />
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
        <p className="text-sm text-slate-400">
          Configure o endpoint de dashboard do aluno para visualizar as solicitações.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Card title="Minha Solicitação Atual">
        {data.reservaAtual ? (
          <div className="space-y-2">
            <p className="text-sm text-slate-200 font-medium">{data.reservaAtual.equipamento}</p>
            <p className="text-xs text-slate-400 font-mono">{data.reservaAtual.horario}</p>
            <div className="mt-3">
              <span className="status-badge bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
                {data.reservaAtual.status}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Você ainda não possui solicitações ativas.
          </p>
        )}
      </Card>

      <Card title="Próximas Aulas em Laboratório">
        <ul className="space-y-2">
          {Array.isArray(data.proximasAulas) &&
            data.proximasAulas.map((aula) => (
              <li
                key={aula.id}
                className="flex items-center justify-between bg-navy-600/20 border border-navy-500/20 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-xs text-slate-200 font-medium">{aula.curso}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {aula.data} • {aula.turno}
                  </p>
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
        <p className="text-sm text-slate-400">
          Configure o endpoint de dashboard do professor para visualizar os dados.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card title="Resumo de Hoje">
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Turmas" value={data.turmasHoje} />
          <Stat label="Reservas Ativas" value={data.reservasAtivas} />
          <Stat label="Alunos Aguardando" value={data.alunosAguardandoNotebook} accent="text-alert glow-text-alert" />
        </div>
      </Card>

      <Card title="Lotes de Notebooks">
        <ul className="space-y-2">
          {Array.isArray(data.lotes) &&
            data.lotes.map((lote) => (
              <li
                key={lote.id}
                className="flex items-center justify-between bg-navy-600/20 border border-navy-500/20 rounded-lg px-3 py-2.5"
              >
                <div>
                  <p className="text-xs text-slate-200 font-medium">{lote.turma}</p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {lote.data} • {lote.turno} • {lote.quantidade} notebooks
                  </p>
                </div>
                <span className="status-badge bg-cyan-dim text-cyan border-cyan/20">{lote.status}</span>
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

