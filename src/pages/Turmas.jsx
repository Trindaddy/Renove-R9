import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import {
  listarTurmas,
  cadastrarTurma,
  editarTurma,
  deletarTurma
} from '../services/turmasService';
import { WarningCircle, Plus, Trash, Users, X, Check } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Turmas() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState([]);
  const [professores, setProfessores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modais e Estados de Edição
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [editingTurmaId, setEditingTurmaId] = useState(null);
  const [newInstructorVal, setNewInstructorVal] = useState('');

  // Form de cadastro
  const [newTurma, setNewTurma] = useState({
    codigo_turma: '',
    nome_curso: '',
    instrutor: '',
    carga_horaria: '',
    turno: 'Matutino',
    regime_dias: ''
  });

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const data = await listarTurmas();
      setTurmas(Array.isArray(data) ? data : []);

      if (user?.role === 'ti') {
        const response = await api.get('/usuarios?role=professor');
        setProfessores(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError('Não foi possível carregar as turmas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setNewTurma(prev => ({ ...prev, [name]: value }));
  }

  async function handleCreateTurma(e) {
    e.preventDefault();
    if (!newTurma.codigo_turma || !newTurma.nome_curso || !newTurma.instrutor) {
      setError('Preencha os campos obrigatórios.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await cadastrarTurma(newTurma);
      setSuccess('Turma cadastrada com sucesso!');
      setShowAddModal(false);
      setNewTurma({
        codigo_turma: '',
        nome_curso: '',
        instrutor: '',
        carga_horaria: '',
        turno: 'Matutino',
        regime_dias: ''
      });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar turma.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateInstructor(codigoTurma, instrutorNome) {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await editarTurma(codigoTurma, { instrutor: instrutorNome });
      setSuccess('Professor responsável atualizado com sucesso!');
      setEditingTurmaId(null);
      await loadData();
    } catch (err) {
      setError('Não foi possível atualizar o instrutor.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTurma(codigoTurma) {
    if (!window.confirm(`Deseja realmente excluir a turma ${codigoTurma}? Isso removerá também todas as reservas ativas associadas.`)) {
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await deletarTurma(codigoTurma);
      setSuccess('Turma excluída com sucesso.');
      await loadData();
    } catch (err) {
      setError('Erro ao excluir turma.');
    } finally {
      setLoading(false);
    }
  }

  const isTi = user?.role === 'ti';

  // Filtragem de turmas para o Modal de Visão por Professor
  const profTurmas = selectedProfessor 
    ? turmas.filter(t => t.instrutor.toLowerCase() === selectedProfessor.toLowerCase())
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-dark-600/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-primary/60 font-medium">Gestão de TI</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Gestão de Turmas</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerenciamento e vínculo de instrutores às turmas operacionais do Senac Talal Abu Allan.
          </p>
        </div>
        {isTi && (
          <Button onClick={() => setShowAddModal(true)} variant="cyan" className="h-fit py-2 px-4 flex items-center gap-1.5 text-xs">
            <Plus size={16} weight="bold" />
            Nova Turma
          </Button>
        )}
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <WarningCircle className="w-5 h-5 text-red-400 shrink-0" weight="fill" />
            <p className="text-sm text-red-450">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <p className="text-sm text-emerald-350">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3">Código (Turma)</th>
                <th className="text-left px-5 py-3">Curso</th>
                <th className="text-left px-5 py-3">Professor Responsável</th>
                <th className="text-left px-5 py-3">Turno</th>
                <th className="text-left px-5 py-3">Regime</th>
                {isTi && <th className="text-right px-5 py-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading && turmas.length === 0 && (
                <tr>
                  <td colSpan={isTi ? 6 : 5} className="px-5 py-10 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                      <span className="text-xs text-slate-500 ml-2">Buscando turmas...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && turmas.map((turma) => (
                <tr key={turma.id} className="tech-table-row group">
                  <td className="px-5 py-3.5 font-mono text-xs text-primary/80">{turma.id}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-200">{turma.curso}</td>
                  <td className="px-5 py-3.5 text-xs">
                    {editingTurmaId === turma.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newInstructorVal}
                          onChange={(e) => setNewInstructorVal(e.target.value)}
                          className="tech-select text-[11px] py-1 px-2"
                        >
                          <option value="">Selecione o Professor</option>
                          {professores.map((p) => (
                            <option key={p.id} value={p.nome}>
                              {p.nome}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleUpdateInstructor(turma.id, newInstructorVal)}
                          className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25"
                          title="Confirmar alteração"
                        >
                          <Check size={12} weight="bold" />
                        </button>
                        <button
                          onClick={() => setEditingTurmaId(null)}
                          className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25"
                          title="Cancelar"
                        >
                          <X size={12} weight="bold" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProfessor(turma.instrutor)}
                          className="text-xs text-slate-300 font-semibold underline hover:text-primary transition-colors text-left"
                          title="Ver todas as turmas deste professor"
                        >
                          {turma.instrutor}
                        </button>
                        {isTi && (
                          <button
                            onClick={() => {
                              setEditingTurmaId(turma.id);
                              setNewInstructorVal(turma.instrutor);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-400 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                          >
                            Alterar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{turma.turno}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{turma.regime_dias}</td>
                  {isTi && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteTurma(turma.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15 text-red-450 transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir Turma"
                      >
                        <Trash size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              {!loading && turmas.length === 0 && (
                <tr>
                  <td colSpan={isTi ? 6 : 5} className="px-5 py-10 text-center text-xs text-slate-500 font-mono">
                    Nenhuma turma cadastrada no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Cadastrar Nova Turma */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <form onSubmit={handleCreateTurma} className="space-y-4">
              <header className="border-b border-dark-600/50 pb-3">
                <h3 className="text-base font-bold text-slate-100">Cadastrar Nova Turma</h3>
                <p className="text-xs text-slate-400 mt-1">Informe os dados da nova turma acadêmica.</p>
              </header>

              <Input
                label="Código da Turma"
                name="codigo_turma"
                placeholder="Ex: 2026.09.55"
                value={newTurma.codigo_turma}
                onChange={handleInputChange}
                required
              />

              <Input
                label="Nome do Curso"
                name="nome_curso"
                placeholder="Ex: Técnico em Desenvolvimento de Sistemas"
                value={newTurma.nome_curso}
                onChange={handleInputChange}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-350">Professor Responsável</span>
                  <select
                    name="instrutor"
                    value={newTurma.instrutor}
                    onChange={handleInputChange}
                    className="tech-select text-xs"
                    required
                  >
                    <option value="">Selecione</option>
                    {professores.map((p) => (
                      <option key={p.id} value={p.nome}>
                        {p.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label="Carga Horária (Horas)"
                  name="carga_horaria"
                  type="number"
                  placeholder="Ex: 1200"
                  value={newTurma.carga_horaria}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-350">Turno</span>
                  <select
                    name="turno"
                    value={newTurma.turno}
                    onChange={handleInputChange}
                    className="tech-select text-xs"
                    required
                  >
                    <option value="Matutino">Matutino</option>
                    <option value="Vespertino">Vespertino</option>
                    <option value="Noturno">Noturno</option>
                  </select>
                </label>

                <Input
                  label="Regime de Dias"
                  name="regime_dias"
                  placeholder="Ex: 2ª e 5ª Presencial"
                  value={newTurma.regime_dias}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="flex gap-2 pt-3 border-t border-dark-600/50">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs py-2 bg-dark-700 hover:bg-dark-600 text-slate-200"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="cyan"
                  className="flex-1 text-xs py-2"
                >
                  Salvar Turma
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Visão por Professor */}
      {selectedProfessor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-lg shadow-2xl relative mx-4">
            <button
              onClick={() => setSelectedProfessor(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <div className="space-y-4">
              <header className="border-b border-dark-600/50 pb-3">
                <div className="flex items-center gap-2 text-primary">
                  <Users size={20} weight="duotone" />
                  <h3 className="text-base font-bold text-slate-100">Turmas do Professor</h3>
                </div>
                <p className="text-sm text-slate-200 font-bold mt-1.5">{selectedProfessor}</p>
                <p className="text-xs text-slate-450 mt-0.5">Listagem das turmas vinculadas a este docente.</p>
              </header>

              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
                {profTurmas.map((t) => (
                  <div key={t.id} className="p-3 rounded-xl border border-dark-600 bg-dark-800/40 hover:border-primary/20 transition-all flex justify-between items-center">
                    <div>
                      <p className="text-xs font-mono text-primary/80">{t.id}</p>
                      <p className="text-sm font-bold text-slate-100">{t.curso}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-mono">{t.regime_dias}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-dark-700 border border-dark-600 text-slate-350">
                      {t.turno}
                    </span>
                  </div>
                ))}

                {profTurmas.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-4 text-center">Nenhuma turma vinculada a este professor.</p>
                )}
              </div>

              <div className="pt-3 border-t border-dark-600/50 flex justify-end">
                <Button
                  onClick={() => setSelectedProfessor(null)}
                  variant="outline"
                  className="text-xs py-2 px-4 bg-dark-700 hover:bg-dark-600 text-slate-200"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
