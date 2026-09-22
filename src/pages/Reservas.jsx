import React, { useEffect, useState, useMemo } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarTurmas } from '../services/turmasService';
import {
  criarReserva,
  listarReservas,
  atualizarReserva,
  deletarReserva
} from '../services/reservasService';
import { getDashboardStats } from '../services/emprestimosService';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { Laptop, WarningCircle, Trash, Sun, Moon, CalendarCheck, SquaresFour } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [stats, setStats] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [blockingAlert, setBlockingAlert] = useState(null);
  const [sameDayBlockedAlert, setSameDayBlockedAlert] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('gerenciamento');

  const { user } = useAuth();
  const { lastMessage } = useWebSocket();

  const turmasMap = useMemo(() => new Map(turmas.map(t => [t.id, t])), [turmas]);

  const turnosReservas = useMemo(() => {
    const matutino = [];
    const vespertino = [];
    const noturno = [];

    reservas.forEach(r => {
      const t = (r.turno || '').toLowerCase();
      if (t.includes('matutino') || t.includes('manh')) {
        matutino.push(r);
      } else if (t.includes('vespertino') || t.includes('tarde')) {
        vespertino.push(r);
      } else if (t.includes('noturno') || t.includes('noite')) {
        noturno.push(r);
      } else {
        matutino.push(r);
      }
    });

    return { matutino, vespertino, noturno };
  }, [reservas]);

  useEffect(() => {
    if (lastMessage) {
      // Atualiza automaticamente qualquer mudança de disponibilidade, reservas ou empréstimos
      loadReservas();
    }
  }, [lastMessage]);

  async function loadTurmas() {
    try {
      const data = await listarTurmas();
      let list = Array.isArray(data) ? data : [];
      if (user?.role === 'professor') {
        list = list.filter(t => t.instrutor === user.nome);
      }
      setTurmas(list);
    } catch (err) {
      setError('Não foi possível carregar as turmas. Verifique a API.');
    }
  }

  async function loadReservas() {
    try {
      setLoadingReservas(true);
      const data = await listarReservas();
      setReservas(Array.isArray(data) ? data : []);
      const s = await getDashboardStats();
      setStats(s);
    } catch (err) {
      setError('Não foi possível carregar as reservas ou estatísticas. Verifique a API.');
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
    
    // Validar data no passado
    const hojeLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local format
    if (form.data < hojeLocal) {
      setError('Não é possível criar ou editar reservas em datas passadas.');
      return;
    }

    // Restrição: Professores não podem reservar para o mesmo dia
    if (user?.role === 'professor' && form.data === hojeLocal) {
      setSameDayBlockedAlert(true);
      return;
    }

    // Validar limite de quantidade com base no número de alunos ativos da turma
    const selectedTurmaObj = turmas.find(t => t.id === form.turmaId);
    if (selectedTurmaObj) {
      const maxAlunos = selectedTurmaObj.alunos_count ?? 0;
      if (form.quantidade > maxAlunos) {
        setBlockingAlert({
          requested: form.quantidade,
          max: maxAlunos
        });
        return;
      }
    }
    
    const restantes = stats ? stats.disponiveis : 0;
    // Só validar estoque se for reserva para hoje
    if (form.data === hojeLocal && form.quantidade > restantes && !editingId) {
      setError(`Quantidade indisponível. Restam apenas ${restantes} notebooks para reservas de hoje.`);
      return;
    }

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
      const apiErrorMsg = err.response?.data?.detail;
      if (apiErrorMsg && apiErrorMsg.includes("Faça os empréstimos com antecedência")) {
        setSameDayBlockedAlert(true);
      } else if (apiErrorMsg && apiErrorMsg.includes("excede o número de alunos")) {
        setBlockingAlert({
          requested: form.quantidade,
          max: selectedTurmaObj ? (selectedTurmaObj.alunos_count ?? 0) : 0
        });
      } else {
        setError(apiErrorMsg || `Não foi possível ${editingId ? 'atualizar' : 'criar'} a reserva. Verifique a API.`);
      }
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

  async function confirmDelete(id) {
    setConfirmDeleteId(id);
  }

  async function executeDelete() {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
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

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total no Sistema</p>
              <p className="text-2xl font-black text-slate-200">{stats.total}</p>
            </div>
            <Laptop className="text-3xl text-slate-600" weight="duotone" />
          </div>
          <div className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Notebooks Reservados</p>
              <p className="text-2xl font-black text-senac-blue">{stats.reservados}</p>
            </div>
            <WarningCircle className="text-3xl text-senac-blue/50" weight="duotone" />
          </div>
          <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-primary uppercase tracking-wider font-semibold">Disponíveis p/ Reserva</p>
              <p className="text-2xl font-black text-primary">{stats.disponiveis}</p>
            </div>
            <Laptop className="text-3xl text-primary" weight="fill" />
          </div>
        </div>
      )}

      {/* Seleção de Abas: Gerenciamento vs Panorama de Turnos */}
      <div className="flex border-b border-dark-600/60 gap-4 mb-4">
        <button
          onClick={() => setAbaAtiva('gerenciamento')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            abaAtiva === 'gerenciamento'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarCheck size={16} weight="duotone" />
          <span>Gerenciamento de Reservas</span>
        </button>
        <button
          onClick={() => setAbaAtiva('panorama')}
          className={`pb-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            abaAtiva === 'panorama'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <SquaresFour size={16} weight="duotone" />
          <span>Panorama por Turnos</span>
          <span className="px-1.5 py-0.2 rounded-full bg-primary/20 text-primary text-[10px] font-mono">
            {reservas.length}
          </span>
        </button>
      </div>

      {/* 1. ABA: GERENCIAMENTO DE RESERVAS */}
      {abaAtiva === 'gerenciamento' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {(user?.role === 'ti' || user?.role === 'professor') && (
          <form
            onSubmit={handleSubmit}
            className="glass-card p-4 space-y-3 lg:col-span-1 h-fit"
          >
            <h2 className="text-sm font-semibold text-slate-205 mb-1">
              {editingId ? `Editar reserva #${editingId}` : 'Nova reserva de lote'}
            </h2>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-xs text-slate-300">Turma</span>
              <select
                name="turmaId"
                value={form.turmaId}
                onChange={handleChange}
                className="tech-select w-full"
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
                  className="tech-select w-full"
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
                  className="border border-dark-600 text-slate-300 hover:bg-dark-700/50"
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        )}

        <div className={`${(user?.role === 'ti' || user?.role === 'professor') ? 'lg:col-span-2' : 'lg:col-span-3'} glass-card overflow-hidden`}>
          <div className="px-4 py-3 border-b border-dark-600/50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Reservas recentes
            </h2>
          </div>

          {/* Layout para Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="tech-table-header">
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
                      className="tech-table-row cursor-pointer transition-colors"
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
                        {user?.role === 'ti' && (
                          <div className="inline-flex gap-1">
                            <button
                              onClick={() => handleEditClick(reserva)}
                              className="px-2.5 py-1 text-[11px] rounded bg-cyan-dim text-cyan border border-cyan/20 hover:bg-cyan/20 transition-all font-semibold"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => confirmDelete(reserva.id)}
                              className="px-2.5 py-1 text-[11px] rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
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

          {/* Layout para Mobile (Cards) */}
          <div className="block md:hidden">
            {loadingReservas && (
              <div className="px-4 py-8 text-center text-xs text-slate-400">Carregando reservas...</div>
            )}

            {!loadingReservas &&
              reservas.map((reserva) => (
                <div 
                  key={reserva.id} 
                  className="bg-dark-700/30 border-b border-dark-600 p-4 flex flex-col gap-3 relative overflow-hidden"
                  onClick={() => {
                    if (reserva.status === 'Pendente') {
                      setSelectedReserva(reserva);
                    }
                  }}
                >
                  <div className="absolute top-0 right-0 p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        reserva.status === 'Aprovada'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                          : reserva.status === 'Pendente'
                          ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                          : 'bg-slate-500/10 text-slate-300 border border-slate-500/40'
                      }`}
                    >
                      {reserva.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-dark-600/50 flex items-center justify-center font-mono text-xs text-primary font-bold border border-dark-650 shrink-0">
                      #{reserva.id}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-200 truncate">{reserva.turma}</div>
                      <div className="text-xs text-slate-400">
                        Qtd: <span className="font-semibold text-slate-200">{reserva.quantidade} un.</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-dark-600/30 pt-3 flex flex-col gap-1.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Data</span>
                        <p className="text-slate-300 font-medium">{reserva.data}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Turno</span>
                        <p className="text-slate-300 font-medium">{reserva.turno}</p>
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Solicitante</span>
                      <p className="text-slate-350">{reserva.usuario?.nome || '-'}</p>
                    </div>
                  </div>

                  {user?.role === 'ti' && (
                    <div className="mt-2 flex gap-2 w-full">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEditClick(reserva); }}
                        className="flex-1 px-3 py-3 text-xs rounded bg-cyan-dim text-cyan border border-cyan/20 hover:bg-cyan/20 transition-all font-semibold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); confirmDelete(reserva.id); }}
                        className="px-4 py-3 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {!loadingReservas && reservas.length === 0 && !error && (
                <div className="px-4 py-8 text-center text-xs text-slate-400">Nenhuma reserva encontrada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA: PANORAMA POR TURNOS */}
      {abaAtiva === 'panorama' && (
        <div className="space-y-6">
          <div className="glass-card p-4 border border-dark-600 bg-dark-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <span>Panorama Consolidado por Turnos</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {reservas.length} reserva(s)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribuição de lotes de equipamentos por turno e turmas cadastradas.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">Total Reservado:</span>
              <strong className="text-primary font-bold text-sm">
                {reservas.reduce((acc, r) => acc + (r.quantidade || 0), 0)} notebooks
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bloco 1: Turno Matutino */}
            <TurnoColuna
              titulo="Turno Matutino"
              horario="08:00 — 12:00"
              icone={<Sun size={18} className="text-amber-400" weight="duotone" />}
              reservas={turnosReservas.matutino}
              turmasMap={turmasMap}
              onCardClick={(reserva) => {
                if (reserva.status === 'Pendente') setSelectedReserva(reserva);
              }}
            />

            {/* Bloco 2: Turno Vespertino */}
            <TurnoColuna
              titulo="Turno Vespertino"
              horario="14:00 — 18:00"
              icone={<Sun size={18} className="text-orange-400" weight="fill" />}
              reservas={turnosReservas.vespertino}
              turmasMap={turmasMap}
              onCardClick={(reserva) => {
                if (reserva.status === 'Pendente') setSelectedReserva(reserva);
              }}
            />

            {/* Bloco 3: Turno Noturno */}
            <TurnoColuna
              titulo="Turno Noturno"
              horario="19:00 — 22:30"
              icone={<Moon size={18} className="text-indigo-400" weight="duotone" />}
              reservas={turnosReservas.noturno}
              turmasMap={turmasMap}
              onCardClick={(reserva) => {
                if (reserva.status === 'Pendente') setSelectedReserva(reserva);
              }}
            />
          </div>
        </div>
      )}

      {/* Details modal for Pending Reservations */}
      {selectedReserva && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => setSelectedReserva(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-200 text-lg transition-colors"
            >
              ✕
            </button>
            <div className="space-y-4">
              <header className="border-b border-dark-600/50 pb-3">
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

              <div className="flex flex-col gap-2 pt-3 border-t border-dark-600/50">
                {user?.role === 'ti' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full text-xs py-2 bg-dark-700 hover:bg-dark-600 text-slate-200"
                      onClick={() => handleEditClick(selectedReserva)}
                    >
                      Alterar Empréstimo
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full text-xs py-2"
                      onClick={() => confirmDelete(selectedReserva.id)}
                    >
                      Excluir Empréstimo
                    </Button>
                  </>
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

      {/* Styled confirm modal for reservation deletion */}
      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl">
                <Trash weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Excluir Reserva
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Tem certeza que deseja excluir esta reserva? Esta ação não pode ser desfeita e os notebooks retornarão para o estoque disponível.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500"
                  onClick={executeDelete}
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {sameDayBlockedAlert && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-primary/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative mx-4 text-center text-slate-200"
            >
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-4 text-primary text-3xl">
                <WarningCircle weight="duotone" />
              </div>
              <h3 className="text-lg font-black text-slate-100 mb-2">
                Antecedência Obrigatória
              </h3>
              <p className="text-xs text-slate-300 mb-6 leading-relaxed font-medium bg-dark-800/60 p-4 rounded-xl border border-dark-600/60 text-justify">
                Faça os empréstimos com antecedência! Não é permitido fazer empréstimos no mesmo dia escolhido para uso. Tente a alocação em lote para avaliação da Equipe de TI.
              </p>

              <div className="flex w-full">
                <Button
                  className="w-full text-xs py-3 font-bold bg-primary text-white hover:bg-primary-dark"
                  onClick={() => setSameDayBlockedAlert(false)}
                >
                  Entendi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {blockingAlert && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-red-500/30 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl animate-bounce">
                <WarningCircle weight="fill" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Bloqueio de Empréstimo
              </h3>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed font-medium">
                Não é possível realizar este empréstimo: a quantidade de notebooks solicitada excede o número de alunos da turma.
              </p>
              
              <div className="bg-dark-950/60 p-3 rounded-lg border border-dark-600/50 mb-5 text-[11px] font-mono text-red-400">
                Notebooks solicitados: {blockingAlert.requested} | Alunos na turma: {blockingAlert.max}
              </div>

              <div className="flex w-full">
                <Button
                  variant="danger"
                  className="w-full text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500 font-bold"
                  onClick={() => setBlockingAlert(null)}
                >
                  Entendi
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TurnoColuna({ titulo, horario, icone, reservas, turmasMap, onCardClick }) {
  const totalEquipamentos = reservas.reduce((acc, r) => acc + (r.quantidade || 0), 0);

  return (
    <div className="space-y-4">
      {/* Cabeçalho do Turno */}
      <div className="glass-card p-3.5 border border-dark-600/70 bg-dark-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-dark-800 border border-dark-600/50">
            {icone}
          </div>
          <div>
            <h3 className="text-xs font-black tracking-wider uppercase text-slate-100">{titulo}</h3>
            <span className="text-[10px] text-slate-400 font-mono">{horario}</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-black text-primary block">{totalEquipamentos} un.</span>
          <span className="text-[9px] text-slate-400 font-mono">{reservas.length} reserva(s)</span>
        </div>
      </div>

      {/* Lista de Cards de Alocação Padronizados */}
      <div className="space-y-3">
        {reservas.length === 0 ? (
          <div className="py-8 px-4 text-center rounded-xl bg-dark-800/20 border border-dark-700/50 text-slate-400 text-xs">
            <p>Nenhuma reserva para este turno.</p>
          </div>
        ) : (
          reservas.map((reserva) => {
            const turmaObj = turmasMap.get(reserva.turma);
            const nomeProfessor = reserva.usuario?.nome || turmaObj?.instrutor || 'Docente Responsável';
            const nomeTurma = turmaObj?.curso || turmaObj?.nome_curso || `Turma ${reserva.turma}`;
            const codigoTurma = reserva.turma;
            const qtdEquipamentos = reserva.quantidade;

            return (
              <div
                key={reserva.id}
                onClick={() => onCardClick(reserva)}
                className="glass-card p-4 border border-dark-600/60 hover:border-primary/40 transition-all rounded-xl cursor-pointer group bg-dark-850/50 hover:bg-dark-800/60 relative overflow-hidden"
              >
                {/* Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-dark-700/40">
                  <span className="text-[10px] font-mono text-slate-400">
                    Reserva #{reserva.id} • {reserva.data}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      reserva.status === 'Aprovada'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                        : reserva.status === 'Pendente'
                        ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                        : 'bg-slate-500/10 text-slate-300 border border-slate-500/40'
                    }`}
                  >
                    {reserva.status}
                  </span>
                </div>

                {/* 1. Nome da Turma */}
                <div className="mb-2">
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                    Nome da Turma
                  </span>
                  <h4 className="text-sm font-bold text-slate-100 group-hover:text-primary transition-colors leading-snug">
                    {nomeTurma}
                  </h4>
                </div>

                {/* 2. Código da Turma e Quantidade */}
                <div className="grid grid-cols-2 gap-2 my-2 py-2 bg-dark-900/50 rounded-lg px-2.5 border border-dark-700/40">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Código da Turma
                    </span>
                    <span className="text-xs font-mono font-bold text-primary">
                      {codigoTurma}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Equipamentos
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {qtdEquipamentos} notebooks
                    </span>
                  </div>
                </div>

                {/* 3. Nome do Professor */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                      Nome do Professor
                    </span>
                    <span className="font-semibold text-slate-200">
                      {nomeProfessor}
                    </span>
                  </div>
                  <Laptop size={18} className="text-slate-500 group-hover:text-primary transition-colors" weight="duotone" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
