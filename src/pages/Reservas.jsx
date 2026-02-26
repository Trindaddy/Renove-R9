import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarTurmas } from '../services/turmasService';
import { criarReserva, listarReservas } from '../services/reservasService';

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

  useEffect(() => {
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
      await criarReserva(form);
      setSuccess('Reserva criada com sucesso.');
      setForm({
        turmaId: '',
        data: '',
        turno: '',
        quantidade: 20
      });
      const data = await listarReservas();
      setReservas(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Não foi possível criar a reserva. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Reservas de Lotes</h1>
        <p className="text-sm text-slate-400">
          Crie reservas de notebooks por turma, data, turno e quantidade.
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
          className="bg-slate-900/70 border border-slate-800 rounded-lg p-4 space-y-3 lg:col-span-1"
        >
          <h2 className="text-sm font-semibold text-slate-200 mb-1">
            Nova reserva de lote
          </h2>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-xs text-slate-300">Turma</span>
            <select
              name="turmaId"
              value={form.turmaId}
              onChange={handleChange}
              className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange focus:border-senac-orange"
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
            />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-slate-300">Turno</span>
              <select
                name="turno"
                value={form.turno}
                onChange={handleChange}
                className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange focus:border-senac-orange"
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
          />

          <Button type="submit" className="w-full mt-1" disabled={loading}>
            {loading ? 'Criando...' : 'Criar reserva'}
          </Button>
        </form>

        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Reservas recentes
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
              <tr>
                <th className="text-left px-3 py-2">ID</th>
                <th className="text-left px-3 py-2">Turma</th>
                <th className="text-left px-3 py-2">Data</th>
                <th className="text-left px-3 py-2">Turno</th>
                <th className="text-left px-3 py-2">Qtd.</th>
                <th className="text-left px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingReservas && (
                <tr>
                  <td
                    colSpan={6}
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
                    className="border-t border-slate-800/80 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{reserva.id}</td>
                    <td className="px-3 py-2 text-xs">{reserva.turma}</td>
                    <td className="px-3 py-2 text-xs text-slate-300">{reserva.data}</td>
                    <td className="px-3 py-2 text-xs text-slate-300">
                      {reserva.turno}
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      {reserva.quantidade}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] ${
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
                  </tr>
                ))}

              {!loadingReservas && reservas.length === 0 && !error && (
                <tr>
                  <td
                    colSpan={6}
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
  );
}

