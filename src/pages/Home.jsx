import React, { useEffect, useState } from 'react';
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
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">
          Bem-vindo(a), {user.nome?.split(' ')[0] || ''}
        </h1>
        <p className="text-sm text-slate-400">
          Visão geral do ambiente • Perfil: <span className="font-semibold">{user.role}</span>
        </p>
      </header>

      {loading && (
        <p className="text-sm text-slate-400">Carregando informações do dashboard...</p>
      )}

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
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

function Card({ title, children }) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 shadow-sm">
      <h2 className="text-sm font-semibold mb-3 text-slate-200">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={`text-lg font-semibold ${accent || ''}`}>{value}</span>
    </div>
  );
}

function DashboardTI({ data }) {
  if (!data) {
    return (
      <p className="text-sm text-slate-400">
        Configure o endpoint de dashboard de TI para visualizar os dados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Inventário de Notebooks">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total" value={data.notebooksTotais} />
          <Stat
            label="Disponíveis"
            value={data.notebooksDisponiveis}
            accent="text-emerald-400"
          />
          <Stat
            label="Em uso"
            value={data.notebooksEmUso}
            accent="text-senac-orange"
          />
          <Stat
            label="Em manutenção"
            value={data.notebooksManutencao}
            accent="text-red-400"
          />
        </div>
      </Card>

      <Card title="Operação de hoje">
        <div className="flex flex-col gap-3">
          <Stat label="Reservas de lote" value={data.reservasHoje} />
          <Stat
            label="Solicitações pendentes"
            value={data.solicitacoesPendentes}
            accent="text-yellow-300"
          />
        </div>
      </Card>

      <Card title="Atalhos rápidos">
        <ul className="text-xs text-slate-300 space-y-2">
          <li>- Ver fila de solicitações</li>
          <li>- Ajustar inventário de notebooks</li>
          <li>- Consultar turmas com reservas hoje</li>
        </ul>
      </Card>
    </div>
  );
}

function DashboardAluno({ data }) {
  if (!data) {
    return (
      <p className="text-sm text-slate-400">
        Configure o endpoint de dashboard do aluno para visualizar as solicitações.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card title="Minha solicitação atual">
        {data.reservaAtual ? (
          <div className="space-y-1 text-sm">
            <p className="text-slate-300 font-medium">{data.reservaAtual.equipamento}</p>
            <p className="text-xs text-slate-400">{data.reservaAtual.horario}</p>
            <p className="text-xs mt-2">
              Status:{' '}
              <span className="text-yellow-300">{data.reservaAtual.status}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            Você ainda não possui solicitações ativas.
          </p>
        )}
      </Card>

      <Card title="Próximas aulas em laboratório">
        <ul className="text-xs text-slate-300 space-y-2">
          {Array.isArray(data.proximasAulas) &&
            data.proximasAulas.map((aula) => (
              <li
                key={aula.id}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded px-3 py-2"
              >
                <div>
                  <p className="font-medium">{aula.curso}</p>
                  <p className="text-[11px] text-slate-400">
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
      <p className="text-sm text-slate-400">
        Configure o endpoint de dashboard do professor para visualizar os dados.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card title="Resumo de hoje">
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Turmas" value={data.turmasHoje} />
          <Stat label="Reservas ativas" value={data.reservasAtivas} />
          <Stat
            label="Alunos aguardando"
            value={data.alunosAguardandoNotebook}
            accent="text-yellow-300"
          />
        </div>
      </Card>

      <Card title="Lotes de notebooks">
        <ul className="text-xs text-slate-300 space-y-2">
          {Array.isArray(data.lotes) &&
            data.lotes.map((lote) => (
              <li
                key={lote.id}
                className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded px-3 py-2"
              >
                <div>
                  <p className="font-medium">{lote.turma}</p>
                  <p className="text-[11px] text-slate-400">
                    {lote.data} • {lote.turno} • {lote.quantidade} notebooks
                  </p>
                </div>
                <span className="text-[11px] text-emerald-300">{lote.status}</span>
              </li>
            ))}
        </ul>
      </Card>

      <Card title="Ações rápidas">
        <ul className="text-xs text-slate-300 space-y-2">
          <li>- Criar nova reserva de lote</li>
          <li>- Ver fila de solicitações dos alunos</li>
          <li>- Consultar inventário disponível</li>
        </ul>
      </Card>
    </div>
  );
}

