import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import EmprestimoForm from '../components/EmprestimoForm.jsx';
import DashboardCards from '../components/DashboardCards.jsx';
import {
  listarEmprestimos,
  criarEmprestimoRapido,
  devolverEmprestimo,
  cancelarEmprestimo,
  getDashboardStats,
  getAlertaEscassez
} from '../services/emprestimosService';
import { useWebSocket } from '../hooks/useWebSocket';

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

  const { lastMessage } = useWebSocket();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
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
  }, [filtroStatus]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Escutar atualizações via WebSocket
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

  async function handleDevolver(id) {
    if (!window.confirm('Confirmar devolução deste notebook?')) return;
    try {
      setLoadingAction(true);
      await devolverEmprestimo(id);
      setSuccess('Devolução registrada com sucesso!');
      await carregarDados();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao registrar devolução');
    } finally {
      setLoadingAction(false);
    }
  }

  async function handleCancelar(id) {
    if (!window.confirm('Deseja cancelar este empréstimo?')) return;
    try {
      setLoadingAction(true);
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
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Empréstimo de Notebooks</h1>
        <p className="text-sm text-slate-400">
          Gerencie empréstimos em tempo real com disponibilidade instantânea.
        </p>
      </header>

      <DashboardCards stats={stats} alerta={alerta} />

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded px-3 py-2">
          {success}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {isProfessorOuTi && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 lg:col-span-1">
            <EmprestimoForm onSubmit={handleEmprestimoRapido} loading={loadingAction} />
          </div>
        )}

        <div className={`lg:col-span-${isProfessorOuTi ? '2' : '3'} bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden`}>
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Empréstimos
            </h2>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs"
            >
              <option value="">Todos</option>
              <option value="Ativo">Ativos</option>
              <option value="Devolvido">Devolvidos</option>
              <option value="Atrasado">Atrasados</option>
              <option value="Cancelado">Cancelados</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Notebook</th>
                  <th className="text-left px-3 py-2">Usuário</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Saída</th>
                  <th className="text-left px-3 py-2">Previsto</th>
                  <th className="text-right px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                      Carregando...
                    </td>
                  </tr>
                )}

                {!loading && emprestimos.map((emp) => (
                  <tr key={emp.id} className="border-t border-slate-800/80 hover:bg-slate-800/40">
                    <td className="px-3 py-2 font-mono text-xs">{emp.id}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="font-mono">{emp.notebook?.patrimonio}</span>
                      <p className="text-slate-500">{emp.notebook?.modelo}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {emp.usuario?.nome}
                      <p className="text-slate-500">{emp.usuario?.matricula}</p>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {formatDate(emp.data_emprestimo)}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {formatDate(emp.data_prevista_devolucao)}
                    </td>
                    <td className="px-3 py-2 text-xs text-right">
                      {emp.status === 'Ativo' && isProfessorOuTi && (
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-[11px] text-emerald-400"
                            onClick={() => handleDevolver(emp.id)}
                            disabled={loadingAction}
                          >
                            Devolver
                          </Button>
                          <Button
                            variant="ghost"
                            className="px-2 py-1 text-[11px] text-red-400"
                            onClick={() => handleCancelar(emp.id)}
                            disabled={loadingAction}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {!loading && emprestimos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                      Nenhum empréstimo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Ativo': 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40',
    'Devolvido': 'bg-blue-500/10 text-blue-300 border border-blue-500/40',
    'Atrasado': 'bg-red-500/10 text-red-300 border border-red-500/40',
    'Cancelado': 'bg-slate-500/10 text-slate-300 border border-slate-500/40'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[11px] ${styles[status] || styles['Cancelado']}`}>
      {status}
    </span>
  );
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

