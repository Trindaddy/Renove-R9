import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarTurmas } from '../services/turmasService';
import {
  criarReserva,
  listarReservas,
  atualizarReserva,
  deletarReserva
} from '../services/reservasService';

export default function Reservas() {
  const [form, setForm] = useState({
    turmaId: '',
    data: '',
    turno: '',
    quantidade: 20
  });

  const [turmas, setTurmas] = useState([]);
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingReservas, setLoadingReservas] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [selectedReserva, setSelectedReserva] = useState(null);

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
  }, []);

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

  async function handleDelete(id) {
    if (!window.confirm('Deseja realmente excluir esta reserva?')) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await deletarReserva(id);
      setSuccess('Reserva excluída com sucesso.');
      setSelectedReserva(null);
      await loadReservas();
    } catch (err) {
      setError('Não foi possível excluir a reserva. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Reservas de Lotes</h1>
        <p className="text-sm text-slate-400">
          Crie e gerencie reservas de notebooks por turma, data, turno e quantidade.
        </p>
      </header>

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
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3 lg:col-span-1 h-fit"
        >
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            {editingId ? `Editar reserva #${editingId}` : 'Nova reserva de lote'}
          </h2>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-slate-300">Turma</span>
            <select
              name="turmaId"
              value={form.turmaId}
              onChange={handleChange}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange focus:border-senac-orange text-slate-200"
              required
            >
              <option value="">Selecione uma turma</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.id} - {turma.nome || turma.curso}
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
              <span className="text-xs text-slate-300">Turno</span>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange focus:border-senac-orange text-slate-200"
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

          <div className="flex gap-2 mt-1">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Processando...' : editingId ? 'Salvar' : 'Criar reserva'}
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancelEdit}
                className="border border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancelar
              </Button>
            )}
          </div>
        </form>

        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Reservas recentes
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
                <tr>
                  <th className="text-left px-3 py-2">ID</th>
                  <th className="text-left px-3 py-2">Turma</th>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Turno</th>
                  <th className="text-left px-3 py-2">Qtd.</th>
                  <th className="text-left px-3 py-2">Solicitante</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loadingReservas && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-xs text-slate-400"
                    >
                      Carregando reservas...
                    </td>
                  </tr>
                )}

                {!loadingReservas &&
                  reservas.map((reserva) => (
                    <tr
                      key={reserva.id}
                      className="border-t border-slate-800/80 hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => {
                        if (reserva.status === 'Pendente') {
                          setSelectedReserva(reserva);
                        }
                      }}
                    >
                      <td className="px-3 py-2 font-mono text-xs">{reserva.id}</td>
                      <td className="px-3 py-2 text-xs">{reserva.turma}</td>
                      <td className="px-3 py-2 text-xs text-slate-300">{reserva.data}</td>
                      <td className="px-3 py-2 text-xs text-slate-300">
                        {reserva.turno}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {reserva.quantidade}
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-300">
                        {reserva.usuario?.nome || '-'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium ${
                            reserva.status === 'Aprovada'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                              : reserva.status === 'Pendente'
                              ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                              : 'bg-slate-500/10 text-slate-300 border border-slate-500/40'
                          }`}
                        >
                          {reserva.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => handleEditClick(reserva)}
                            className="px-2.5 py-1 text-[11px] rounded bg-cyan-dim text-cyan border border-cyan/20 hover:bg-cyan/20 transition-all font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(reserva.id)}
                            className="px-2.5 py-1 text-[11px] rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                {!loadingReservas && reservas.length === 0 && !error && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-3 py-4 text-center text-xs text-slate-400"
                    >
                      Nenhuma reserva encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

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
                  Empréstimo Pendente
                </span>
                <h3 className="text-base font-black text-slate-100 mt-2">
                  Detalhes da Reserva #{selectedReserva.id}
                </h3>
              </header>

              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Turma:</span>
                  <span className="font-mono text-slate-200">{selectedReserva.turma}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Data agendada:</span>
                  <span className="text-slate-200">{selectedReserva.data}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Turno:</span>
                  <span className="text-slate-200">{selectedReserva.turno}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Quantidade Lote:</span>
                  <span className="font-semibold text-slate-200">{selectedReserva.quantidade} notebooks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Solicitante:</span>
                  <span className="text-slate-200 font-medium">{selectedReserva.usuario?.nome || 'Administrador'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-3 border-t border-slate-800">
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
                  onClick={() => handleDelete(selectedReserva.id)}
                >
                  Excluir Empréstimo
                </Button>
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
