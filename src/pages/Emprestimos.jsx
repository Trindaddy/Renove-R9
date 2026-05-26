import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import EmprestimoForm from '../components/EmprestimoForm.jsx';
import DashboardCards from '../components/DashboardCards.jsx';
import IAWidget from '../components/IAWidget.jsx';
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
  
  // Custom styled dialog states
  const [confirmDevolucaoId, setConfirmDevolucaoId] = useState(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

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

  async function handleCancelar(id) {
    if (!window.confirm('Deseja cancelar este empréstimo?')) return;
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
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out] relative">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-navy-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60 font-medium">Módulo de Operações</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Empréstimo de <span className="text-cyan glow-text-cyan">Notebooks</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie empréstimos em tempo real com disponibilidade instantânea via WebSocket.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alerta?.ativo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-alert/10 border border-alert/20">
              <span className="h-1.5 w-1.5 rounded-full bg-alert animate-pulse" />
              <span className="text-[10px] font-bold text-alert uppercase tracking-wider">Alerta Ativo</span>
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-800/50 border border-navy-500/20">
            <span className={`h-1.5 w-1.5 rounded-full ${lastMessage ? 'bg-cyan animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {lastMessage ? 'Live' : 'Syncing'}
            </span>
          </div>
        </div>
      </header>

      {/* Dashboard Cards */}
      <DashboardCards stats={stats} alerta={alerta} />

      {/* Alerts */}
      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Form */}
        {isProfessorOuTi && (
          <div className="xl:col-span-3 space-y-4">
            <div className="glass-card-alert p-5 scan-line sticky top-24">
              <EmprestimoForm onSubmit={handleEmprestimoRapido} loading={loadingAction} />
            </div>
            <IAWidget stats={stats} />
          </div>
        )}

        {/* Right Column - Table */}
        <div className={`${isProfessorOuTi ? 'xl:col-span-9' : 'xl:col-span-12'}`}>
          <div className="glass-card overflow-hidden">
            {/* Table Header */}
            <div className="px-5 py-4 border-b border-navy-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                  <span className="text-cyan text-xs">◈</span>
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
                <option value="Atrasado">Atrasados</option>
                <option value="Devolvido">Devolvidos</option>
                <option value="Cancelado">Cancelados</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
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
                          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
                          <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
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
                        <span className="font-mono text-xs text-cyan/80">{emp.notebook?.patrimonio}</span>
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
                        {emp.status === 'Ativo' && isProfessorOuTi && (
                          <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="success"
                              className="px-2.5 py-1 text-[11px]"
                              onClick={() => setConfirmDevolucaoId(emp.id)}
                              disabled={loadingAction}
                            >
                              Devolver
                            </Button>
                            <Button
                              variant="danger"
                              className="px-2.5 py-1 text-[11px]"
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
                      <td colSpan={7} className="px-5 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl opacity-20">◈</span>
                          <p className="text-xs text-slate-500">Nenhum empréstimo encontrado para os filtros selecionados.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Styled confirm modal for notebook return */}
      {confirmDevolucaoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center">
            <div className="h-12 w-12 rounded-full bg-cyan/15 border border-cyan/30 flex items-center justify-center mx-auto mb-4 text-cyan text-xl">
              ◈
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
                className="flex-1 text-xs py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200"
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
          </div>
        </div>
      )}

      {/* Styled success modal for return completion */}
      {showSuccessToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-emerald-800/40 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center">
            <div className="h-12 w-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4 text-emerald-400 text-xl font-bold">
              ✓
            </div>
            <h3 className="text-base font-bold text-emerald-400 mb-2">
              Devolução Registrada!
            </h3>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              Sucesso! A devolução do notebook foi registrada. Obrigado por colaborar com a organização do inventário!
            </p>
            <Button
              variant="cyan"
              className="w-full text-xs py-2"
              onClick={() => setShowSuccessToast(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'Ativo': 'bg-cyan-dim text-cyan border-cyan/20',
    'Devolvido': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Atrasado': 'bg-alert-dim text-alert border-alert/20 glow-text-alert',
    'Cancelado': 'bg-slate-500/10 text-slate-400 border-slate-500/20'
  };

  const labels = {
    'Ativo': 'No Prazo',
    'Devolvido': 'Devolvido',
    'Atrasado': 'Atrasado',
    'Cancelado': 'Cancelado'
  };

  return (
    <span className={`status-badge border ${styles[status] || styles['Cancelado']}`}>
      {labels[status] || status}
    </span>
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
