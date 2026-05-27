import React, { useEffect, useState, useCallback } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { getDashboardStats } from '../services/emprestimosService';
import { listarTurmas } from '../services/turmasService';
import {
  criarReserva,
  listarReservas,
  atualizarReserva,
  deletarReserva
} from '../services/reservasService';

export default function Reservas() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();

  const [form, setForm] = useState({
    turmaId: '',
    data: '',
    turno: '',
    quantidade: 20
  });

  const [stats, setStats] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);
  const [confirmDelecaoId, setConfirmDelecaoId] = useState(null);

  const carregarStats = useCallback(async () => {
    try {
      const s = await getDashboardStats();
      setStats(s);
    } catch (err) {
      console.error('Erro ao carregar disponibilidade:', err);
    }
  }, []);

  async function loadTurmas() {
    try {
      const data = await listarTurmas();
      setTurmas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Não foi possível carregar as turmas. Verifique a API.');
    }
  }

  async function loadReservas() {
    try {
      setLoadingReservas(true);
      const data = await listarReservas();
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Não foi possível carregar as reservas. Verifique a API.');
    } finally {
      setLoadingReservas(false);
    }
  }

  useEffect(() => {
    loadTurmas();
    loadReservas();
    carregarStats();
  }, [carregarStats]);

  useEffect(() => {
    if (lastMessage?.type === 'disponibilidade_update') {
      setStats(lastMessage.data);
    }
  }, [lastMessage]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      if (editingId) {
        await atualizarReserva(editingId, form);
        setSuccess('Reserva atualizada com sucesso.');
      } else {
        await criarReserva(form);
        setSuccess('Reserva criada com sucesso.');
      }
      setForm({
        turmaId: '',
        data: '',
        turno: '',
        quantidade: 20
      });
      setEditingId(null);
      await loadReservas();
      await carregarStats();
    } catch (err) {
      setError(`Não foi possível ${editingId ? 'atualizar' : 'criar'} a reserva. Verifique a API.`);
    } finally {
      setLoading(false);
    }
  }

  function handleEditClick(reserva) {
    setForm({
      turmaId: reserva.turma,
      data: reserva.data,
      turno: reserva.turno,
      quantidade: reserva.quantidade
    });
    setEditingId(reserva.id);
    setSelectedReserva(null);
  }

  function handleCancelEdit() {
    setForm({
      turmaId: '',
      data: '',
      turno: '',
      quantidade: 20
    });
    setEditingId(null);
  }

  async function executeDelecao() {
    const id = confirmDelecaoId;
    setConfirmDelecaoId(null);
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await deletarReserva(id);
      setSuccess('Reserva excluída com sucesso.');
      setSelectedReserva(null);
      await loadReservas();
      await carregarStats();
    } catch (err) {
      setError('Não foi possível excluir a reserva. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-navy-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60 font-medium">Módulo de Reservas</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Reservas de <span className="text-cyan glow-text-cyan">Lotes</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Crie e gerencie reservas de notebooks por turma, data, turno e quantidade.
          </p>
        </div>
      </header>

      {/* Real-time Availability Stats Panel */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-[fadeIn_0.3s_ease-out]">
          <div className="glass-card p-5 flex items-center justify-between border-l-4 border-cyan relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan/5 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Disponibilidade Geral</p>
              <h3 className="text-3xl font-black text-slate-100 mt-2">
                {stats.percentual_disponivel ?? stats.percentualDisponivel ?? 0}%
              </h3>
              <p className="text-[11px] text-cyan mt-1 font-mono">Notebooks livres para reserva/uso</p>
            </div>
            <div className="h-14 w-14 rounded-xl border border-cyan/20 bg-cyan/10 flex items-center justify-center text-cyan font-black text-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] relative z-10">
              {stats.percentual_disponivel ?? stats.percentualDisponivel ?? 0}%
            </div>
          </div>
          <div className="glass-card p-5 flex items-center justify-between border-l-4 border-senac-orange relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 bg-senac-orange/5 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Notebooks Disponíveis</p>
              <h3 className="text-3xl font-black text-slate-100 mt-2">
                {stats.disponiveis ?? stats.notebooksDisponiveis ?? 0}
                <span className="text-sm font-normal text-slate-500 font-mono"> / {stats.total ?? stats.notebooksTotais ?? 0}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">Quantidade física exata no armário</p>
            </div>
            <div className="h-14 w-14 rounded-xl border border-senac-orange/20 bg-senac-orange/10 flex items-center justify-center text-senac-orange text-xl shadow-[0_0_15px_rgba(249,115,22,0.15)] relative z-10 font-bold">
              ◈
            </div>
          </div>
        </div>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSubmit}
          className="glass-card-alert p-5 scan-line space-y-4 lg:col-span-1 h-fit"
        >
          <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-2">
            {editingId ? `Editar reserva #${editingId}` : 'Nova reserva de lote'}
          </h2>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-slate-300">Turma</span>
            <select
              name="turmaId"
              value={form.turmaId}
              onChange={handleChange}
              className="tech-select text-xs"
              required
            >
              <option value="">Selecione uma turma</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.id} - {turma.curso} ({turma.turno})
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data"
              name="data"
              type="date"
              value={form.data}
              onChange={handleChange}
              required
            />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-slate-350">Turno</span>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className="tech-select text-xs"
                required
              >
                <option value="">Selecione</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Noite">Noite</option>
              </select>
            </label>
          </div>

          <Input
            label="Quantidade de notebooks"
            name="quantidade"
            type="number"
            min={1}
            value={form.quantidade}
            onChange={handleChange}
            required
          />

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Processando...' : editingId ? 'Salvar' : 'Criar reserva'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                className="border border-slate-700 text-slate-350 hover:bg-slate-800"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-navy-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
                <span className="text-cyan text-xs">📅</span>
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase">
                  Reservas Recentes
                </h2>
                <p className="text-[10px] text-slate-500">{reservas.length} registro(s) encontrado(s)</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tech-table-header">
                <tr>
                  <th className="text-left px-5 py-3 font-mono">ID</th>
                  <th className="text-left px-5 py-3">Turma</th>
                  <th className="text-left px-5 py-3 font-mono">Data</th>
                  <th className="text-left px-5 py-3">Turno</th>
                  <th className="text-left px-5 py-3">Qtd.</th>
                  <th className="text-left px-5 py-3">Solicitante</th>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-right px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingReservas && (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-cyan animate-pulse" />
                        <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-75" />
                        <div className="h-2 w-2 rounded-full bg-cyan animate-pulse delay-150" />
                        <span className="text-xs text-slate-500 ml-2">Carregando reservas...</span>
                      </div>
                    </td>
                  </tr>
                )}

                {!loadingReservas &&
                  reservas.map((reserva) => (
                    <tr
                      key={reserva.id}
                      className="tech-table-row group cursor-pointer"
                      onClick={() => {
                        if (reserva.status === 'Pendente') {
                          setSelectedReserva(reserva);
                        }
                      }}
                    >
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-400">
                        #{reserva.id?.toString().padStart(4, '0')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-200 font-bold">
                        {reserva.turma}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">
                        {reserva.data}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-350">
                        {reserva.turno}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-cyan/95 font-mono font-bold">
                        {reserva.quantidade}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-350">
                        {reserva.usuario?.nome || '-'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`status-badge border ${
                            reserva.status === 'Aprovada'
                              ? 'bg-emerald-500/10 text-emerald-450 border-emerald-500/25'
                              : reserva.status === 'Pendente'
                              ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/25'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                          }`}
                        >
                          {reserva.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        {user?.role === 'ti' && (
                          <div className="inline-flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditClick(reserva)}
                              className="px-2.5 py-1 text-[11px] rounded bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 transition-all font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => setConfirmDelecaoId(reserva.id)}
                              className="px-2.5 py-1 text-[11px] rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                        {user?.role !== 'ti' && (
                          <span className="text-[10px] text-slate-600 italic">TI apenas</span>
                        )}
                      </td>
                    </tr>
                  ))}

                {!loadingReservas && reservas.length === 0 && !error && (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-2xl opacity-20">◈</span>
                        <p className="text-xs text-slate-500 font-mono">Nenhuma reserva encontrada.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modern confirm modal for Reservation deletion */}
      {confirmDelecaoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center">
            <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-450 text-xl font-bold">
              !
            </div>
            <h3 className="text-base font-bold text-slate-100 mb-2">
              Excluir Reserva
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Tem certeza que deseja excluir esta reserva permanentemente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200"
                onClick={() => setConfirmDelecaoId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500"
                onClick={executeDelecao}
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal for Pending Reservations */}
      {selectedReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => setSelectedReserva(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg transition-colors"
            >
              ✕
            </button>
            <div className="space-y-4">
              <header className="border-b border-slate-800 pb-3">
                <span className="text-[10px] uppercase tracking-wider text-yellow-450 font-bold bg-yellow-500/10 border border-yellow-500/25 px-2.5 py-1 rounded-full">
                  Reserva Pendente
                </span>
                <h3 className="text-base font-black text-slate-100 mt-2">
                  Detalhes da Reserva #{selectedReserva.id}
                </h3>
              </header>

              <div className="space-y-2.5 text-xs text-slate-350">
                <div className="flex justify-between">
                  <span className="text-slate-500">Turma:</span>
                  <span className="font-mono text-slate-200 font-bold">{selectedReserva.turma}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data agendada:</span>
                  <span className="text-slate-200 font-mono">{selectedReserva.data}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turno:</span>
                  <span className="text-slate-200">{selectedReserva.turno}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantidade Lote:</span>
                  <span className="font-bold text-cyan">{selectedReserva.quantidade} notebooks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitante:</span>
                  <span className="text-slate-200 font-medium">{selectedReserva.usuario?.nome || 'Administrador'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
                {user?.role === 'ti' ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-xs py-2 bg-slate-800 hover:bg-slate-700 text-slate-200"
                      onClick={() => handleEditClick(selectedReserva)}
                    >
                      Alterar Empréstimo
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full text-xs py-2"
                      onClick={() => {
                        setConfirmDelecaoId(selectedReserva.id);
                        setSelectedReserva(null);
                      }}
                    >
                      Excluir Empréstimo
                    </Button>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center italic bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
                    Apenas usuários com perfil de TI podem alterar ou excluir reservas.
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-xs py-2 text-slate-400 hover:text-slate-200 border border-transparent"
                  onClick={() => setSelectedReserva(null)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
