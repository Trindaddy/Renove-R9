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
import { getHistorico, processarEmprestimoLote } from '../services/emprestimosService';
import { WarningCircle, Plus, Trash, Users, X, Check, PencilSimple, ClockCounterClockwise, UserMinus, Lightning } from '@phosphor-icons/react';
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

  // Estados de alunos por turma
  const [selectedTurmaForAlunos, setSelectedTurmaForAlunos] = useState(null);
  const [turmaAlunos, setTurmaAlunos] = useState([]);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [alunosError, setAlunosError] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({ nome: '', email: '', matricula: '' });
  const [studentHistory, setStudentHistory] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [batchResult, setBatchResult] = useState(null);

  const [accessRestricted, setAccessRestricted] = useState(false);

  // Handlers para alunos da turma
  async function handleOpenAlunosPanel(turma) {
    setSelectedTurmaForAlunos(turma);
    const isInstructor = user?.role === 'ti' || turma.instrutor === user?.nome;
    if (!isInstructor) {
      setAccessRestricted(true);
      setTurmaAlunos([]);
      return;
    }
    setAccessRestricted(false);
    setLoadingAlunos(true);
    setAlunosError('');
    try {
      const response = await api.get(`/usuarios?turma=${turma.id}`);
      setTurmaAlunos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setAlunosError('Erro ao carregar lista de alunos.');
    } finally {
      setLoadingAlunos(false);
    }
  }

  const [confirmRemoveStudent, setConfirmRemoveStudent] = useState(null);
  const [confirmBatchLoanTurmaId, setConfirmBatchLoanTurmaId] = useState(null);
  const [confirmDeleteTurmaId, setConfirmDeleteTurmaId] = useState(null);

  function handleRemoveStudentClick(student) {
    setConfirmRemoveStudent(student);
  }

  async function executeRemoveStudent() {
    if (!confirmRemoveStudent) return;
    const studentId = confirmRemoveStudent.id;
    setConfirmRemoveStudent(null);
    try {
      setLoadingAlunos(true);
      setAlunosError('');
      await api.patch(`/usuarios/${studentId}/remover-turma`);
      setSuccess('Aluno removido da turma com sucesso.');
      // Atualiza lista
      const response = await api.get(`/usuarios?turma=${selectedTurmaForAlunos.id}`);
      setTurmaAlunos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setAlunosError(err.response?.data?.detail || 'Erro ao remover aluno da turma.');
    } finally {
      setLoadingAlunos(false);
    }
  }

  function handleEditStudent(student) {
    setEditingStudent(student);
    setEditForm({
      nome: student.nome || '',
      email: student.email || '',
      matricula: student.matricula || ''
    });
  }

  async function handleSaveEditStudent(e) {
    e.preventDefault();
    if (!editForm.email.toLowerCase().endsWith('@edu.df.senac.br')) {
      setAlunosError('Usuários com perfil de Aluno devem utilizar um e-mail do domínio @edu.df.senac.br');
      return;
    }
    try {
      setLoadingAlunos(true);
      setAlunosError('');
      await api.patch(`/usuarios/${editingStudent.id}`, editForm);
      setSuccess('Dados do aluno atualizados com sucesso!');
      setEditingStudent(null);
      // Atualiza lista
      const response = await api.get(`/usuarios?turma=${selectedTurmaForAlunos.id}`);
      setTurmaAlunos(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setAlunosError(err.response?.data?.detail || 'Erro ao atualizar dados do aluno.');
    } finally {
      setLoadingAlunos(false);
    }
  }

  async function handleViewHistory(student) {
    setStudentHistory(student);
    setLoadingHistory(true);
    try {
      const logs = await getHistorico(null, student.id);
      setHistoryLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error(err);
      setAlunosError('Erro ao carregar histórico do aluno.');
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleBatchLoanClick(turmaId) {
    setConfirmBatchLoanTurmaId(turmaId);
  }

  async function executeBatchLoan() {
    if (!confirmBatchLoanTurmaId) return;
    const turmaId = confirmBatchLoanTurmaId;
    setConfirmBatchLoanTurmaId(null);
    try {
      setLoadingAlunos(true);
      setAlunosError('');
      const response = await processarEmprestimoLote(turmaId);
      setBatchResult(response);
      // Atualiza lista
      const listResponse = await api.get(`/usuarios?turma=${turmaId}`);
      setTurmaAlunos(Array.isArray(listResponse.data) ? listResponse.data : []);
    } catch (err) {
      setAlunosError(err.response?.data?.detail || 'Erro ao realizar empréstimo em lote.');
    } finally {
      setLoadingAlunos(false);
    }
  }

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

  function handleDeleteTurmaClick(codigoTurma) {
    setConfirmDeleteTurmaId(codigoTurma);
  }

  async function executeDeleteTurma() {
    if (!confirmDeleteTurmaId) return;
    const codigoTurma = confirmDeleteTurmaId;
    setConfirmDeleteTurmaId(null);
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

      {/* Layout para Desktop */}
      <div className="hidden md:block glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3">Código (Turma)</th>
                <th className="text-left px-5 py-3">Curso</th>
                <th className="text-left px-5 py-3">Professor Responsável</th>
                <th className="text-left px-5 py-3">Turno</th>
                <th className="text-left px-5 py-3">Regime</th>
                <th className="text-left px-5 py-3">Alunos</th>
                {isTi && <th className="text-right px-5 py-3">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {loading && turmas.length === 0 && (
                <tr>
                  <td colSpan={isTi ? 7 : 6} className="px-5 py-10 text-center">
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
                            className="text-[10px] px-1.5 py-0.5 rounded bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-400 hover:text-primary transition-all"
                          >
                            Alterar
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400">{turma.turno}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 font-mono">{turma.regime_dias}</td>
                  <td className="px-5 py-3.5 text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenAlunosPanel(turma)}
                      className="flex items-center gap-1.5 text-xs text-primary hover:text-cyan-400 font-semibold transition-colors"
                      title="Gerenciar alunos matriculados"
                    >
                      <Users size={16} />
                      <span>Ver Alunos</span>
                    </button>
                  </td>
                  {isTi && (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteTurmaClick(turma.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 hover:bg-red-500/15 text-red-455 transition-all opacity-0 group-hover:opacity-100"
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
                  <td colSpan={isTi ? 7 : 6} className="px-5 py-10 text-center text-xs text-slate-500 font-mono">
                    Nenhuma turma cadastrada no sistema.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layout para Mobile (Cards) */}
      <div className="block md:hidden">
        {loading && turmas.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-slate-500">Buscando turmas...</div>
        )}
        {!loading && turmas.map((turma) => (
          <div key={turma.id} className="bg-dark-700/30 border-b border-dark-600 p-4 flex flex-col gap-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-dark-800 border border-dark-600 text-slate-350">
                {turma.turno}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-dark-600/50 flex items-center justify-center shrink-0">
                <Users className="text-primary text-lg" weight="duotone" />
              </div>
              <div className="min-w-0 pr-16">
                <div className="font-mono text-xs text-primary/85 font-semibold">{turma.id}</div>
                <div className="text-sm font-bold text-slate-200 truncate">{turma.curso}</div>
              </div>
            </div>

            <div className="border-t border-dark-600/30 pt-3 flex flex-col gap-1.5 text-xs">
              <div>
                <span className="text-slate-555 uppercase tracking-wider text-[9px] block">Professor Responsável</span>
                {editingTurmaId === turma.id ? (
                  <div className="flex items-center gap-2 mt-1">
                    <select
                      value={newInstructorVal}
                      onChange={(e) => setNewInstructorVal(e.target.value)}
                      className="tech-select text-[11px] py-1.5 px-2 flex-1"
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
                      className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 shrink-0"
                      title="Confirmar alteração"
                    >
                      <Check size={12} weight="bold" />
                    </button>
                    <button
                      onClick={() => setEditingTurmaId(null)}
                      className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 shrink-0"
                      title="Cancelar"
                    >
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedProfessor(turma.instrutor)}
                      className="text-xs text-slate-350 font-bold underline hover:text-primary transition-colors text-left"
                    >
                      {turma.instrutor}
                    </button>
                    {isTi && (
                      <button
                        onClick={() => {
                          setEditingTurmaId(turma.id);
                          setNewInstructorVal(turma.instrutor);
                        }}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-400 hover:text-primary transition-all"
                      >
                        Alterar
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-1 flex justify-between items-center">
                <span className="text-slate-555 uppercase tracking-wider text-[9px]">Regime de Dias</span>
                <span className="text-slate-350 font-mono font-medium">{turma.regime_dias}</span>
              </div>
            </div>

            <div className="mt-2 flex gap-2 w-full">
              <button
                type="button"
                onClick={() => handleOpenAlunosPanel(turma)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-3 rounded-lg text-xs text-primary border border-primary/20 bg-primary/5 hover:bg-primary/15 font-bold transition-colors"
              >
                <Users size={16} />
                <span>Ver Alunos</span>
              </button>
              {isTi && (
                <button
                  onClick={() => handleDeleteTurmaClick(turma.id)}
                  className="px-3.5 py-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center shrink-0"
                >
                  <Trash size={16} />
                </button>
              )}
            </div>
          </div>
        ))}
        {!loading && turmas.length === 0 && (
          <div className="px-5 py-10 text-center text-xs text-slate-500">Nenhuma turma cadastrada.</div>
        )}
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

      {/* DRAWER: Gestão de Alunos da Turma */}
      <AnimatePresence>
        {selectedTurmaForAlunos && (
          <div className="fixed inset-0 z-40 flex justify-end bg-black/60 backdrop-blur-sm">
            {/* Click outside to close */}
            <div 
              className="absolute inset-0" 
              onClick={() => {
                if (!loadingAlunos) setSelectedTurmaForAlunos(null);
              }} 
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl h-full bg-[#0d131f]/95 border-l border-dark-600/50 p-6 shadow-2xl overflow-y-auto flex flex-col z-50 text-slate-200"
            >
              <header className="flex justify-between items-start border-b border-dark-600/50 pb-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-px w-8 bg-gradient-to-r from-primary to-transparent" />
                    <span className="text-[10px] uppercase tracking-[0.3em] text-primary/60 font-medium">Gestão de Alunos</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-100 tracking-tight">
                    Turma: {selectedTurmaForAlunos.id}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Curso: {selectedTurmaForAlunos.curso} | Turno: {selectedTurmaForAlunos.turno}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTurmaForAlunos(null)}
                    className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </header>

              {alunosError && (
                <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-2.5 flex items-center gap-3 mb-4">
                  <WarningCircle className="w-5 h-5 text-red-400 shrink-0" weight="fill" />
                  <p className="text-xs text-red-450">{alunosError}</p>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {accessRestricted ? (
                  <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-5 text-center flex flex-col items-center gap-3">
                    <WarningCircle size={36} className="text-red-400" weight="fill" />
                    <p className="text-sm text-red-400 font-semibold leading-relaxed">
                      Acesso Restrito: A listagem de alunos e dados acadêmicos desta turma é restrita ao instrutor responsável pela disciplina.
                    </p>
                  </div>
                ) : loadingAlunos && turmaAlunos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                    <div className="flex gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                    </div>
                    <span className="text-xs font-mono">Carregando estudantes...</span>
                  </div>
                ) : turmaAlunos.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-mono">
                    Nenhum aluno matriculado nesta turma.
                  </div>
                ) : (
                  <>
                    {/* Layout para Desktop */}
                    <div className="hidden sm:block glass-card overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="tech-table-header">
                            <tr>
                              <th className="text-left px-4 py-2.5">Matrícula</th>
                              <th className="text-left px-4 py-2.5">Nome</th>
                              <th className="text-left px-4 py-2.5">E-mail</th>
                              <th className="text-right px-4 py-2.5">Ações</th>
                            </tr>
                          </thead>
                          <tbody>
                            {turmaAlunos.map((aluno) => (
                              <tr key={aluno.id} className="tech-table-row group">
                                <td className="px-4 py-3 font-mono text-primary/80">{aluno.matricula}</td>
                                <td className="px-4 py-3 font-bold text-slate-200">{aluno.nome}</td>
                                <td className="px-4 py-3 text-slate-450 font-mono text-[10px] max-w-[170px] truncate" title={aluno.email}>
                                  {aluno.email}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => handleViewHistory(aluno)}
                                      className="p-1.5 rounded-lg bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-400 hover:text-primary transition-all"
                                      title="Histórico de Empréstimos"
                                    >
                                      <ClockCounterClockwise size={14} />
                                    </button>
                                    {isTi && (
                                      <>
                                        <button
                                          onClick={() => handleEditStudent(aluno)}
                                          className="p-1.5 rounded-lg bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-400 hover:text-primary transition-all"
                                          title="Editar Aluno"
                                        >
                                          <PencilSimple size={14} />
                                        </button>
                                        <button
                                          onClick={() => handleRemoveStudentClick(aluno)}
                                          className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-455 hover:bg-red-500/20 transition-all"
                                          title="Remover da Turma"
                                        >
                                          <UserMinus size={14} />
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Layout para Mobile (Cards) */}
                    <div className="block sm:hidden space-y-3">
                      {turmaAlunos.map((aluno) => (
                        <div key={aluno.id} className="bg-dark-800/40 border border-dark-600 p-4 rounded-xl flex flex-col gap-2 relative">
                          <div>
                            <p className="font-bold text-sm text-slate-200">{aluno.nome}</p>
                            <p className="font-mono text-[10px] text-primary/85 mt-0.5">Matrícula: {aluno.matricula}</p>
                            <p className="text-[11px] text-slate-450 font-mono mt-0.5 truncate">{aluno.email}</p>
                          </div>
                          
                          <div className="flex justify-end gap-2 border-t border-dark-600/30 pt-2.5 mt-1">
                            <button
                              onClick={() => handleViewHistory(aluno)}
                              className="p-2.5 rounded-lg bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-350 hover:text-primary flex items-center justify-center"
                              title="Histórico de Empréstimos"
                            >
                              <ClockCounterClockwise size={16} />
                            </button>
                            {isTi && (
                              <>
                                <button
                                  onClick={() => handleEditStudent(aluno)}
                                  className="p-2.5 rounded-lg bg-dark-700 hover:bg-primary/10 border border-dark-600 hover:border-primary/20 text-slate-355 hover:text-primary flex items-center justify-center"
                                  title="Editar Aluno"
                                >
                                  <PencilSimple size={16} />
                                </button>
                                <button
                                  onClick={() => handleRemoveStudentClick(aluno)}
                                  className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:bg-red-500/20 flex items-center justify-center"
                                  title="Remover da Turma"
                                >
                                  <UserMinus size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUB-MODAL: Editar Dados do Aluno */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4 text-slate-200">
              <button
                onClick={() => setEditingStudent(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
              <form onSubmit={handleSaveEditStudent} className="space-y-4">
                <header className="border-b border-dark-600/50 pb-3">
                  <h3 className="text-base font-bold text-slate-100">Editar Aluno</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Atualize os dados cadastrais do aluno. E-mail institucional obrigatório.
                  </p>
                </header>

                <Input
                  label="Nome Completo"
                  value={editForm.nome}
                  onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />

                <Input
                  label="Matrícula"
                  value={editForm.matricula}
                  onChange={(e) => setEditForm(prev => ({ ...prev, matricula: e.target.value }))}
                  required
                />

                <div>
                  <Input
                    label="E-mail Institucional (@edu.df.senac.br)"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                  {!editForm.email.toLowerCase().endsWith('@edu.df.senac.br') && editForm.email.length > 0 && (
                    <span className="text-[10px] text-red-400 mt-1 block">
                      Atenção: Alunos devem ter e-mail com final @edu.df.senac.br
                    </span>
                  )}
                </div>

                <div className="flex gap-2 pt-3 border-t border-dark-600/50">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs py-2 bg-dark-700 hover:bg-dark-600 text-slate-200"
                    onClick={() => setEditingStudent(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="cyan"
                    className="flex-1 text-xs py-2"
                    disabled={!editForm.email.toLowerCase().endsWith('@edu.df.senac.br')}
                  >
                    Salvar Alterações
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* SUB-MODAL: Histórico do Aluno */}
      <AnimatePresence>
        {studentHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-lg shadow-2xl relative mx-4 text-slate-200">
              <button
                onClick={() => setStudentHistory(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
              <div className="space-y-4">
                <header className="border-b border-dark-600/50 pb-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ClockCounterClockwise size={20} weight="bold" />
                    <h3 className="text-base font-bold text-slate-100">Histórico do Aluno</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-200 mt-1">{studentHistory.nome}</p>
                  <p className="text-xs text-slate-450 mt-0.5 font-mono">Matrícula: {studentHistory.matricula}</p>
                </header>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {loadingHistory ? (
                    <div className="text-center py-6 text-xs text-slate-500 font-mono animate-pulse">
                      Carregando histórico...
                    </div>
                  ) : historyLogs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-6 text-center">Nenhum registro de empréstimo encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {historyLogs.map((log) => (
                        <div key={log.id} className="p-3 rounded-lg border border-dark-600 bg-dark-800/40 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-200">
                              Notebook: <span className="font-mono text-primary">{log.notebook_patrimonio || 'N/A'}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {log.created_at ? new Date(log.created_at).toLocaleString('pt-BR') : 'N/A'}
                            </span>
                          </div>
                          <p className="text-slate-400">
                            Movimentação: <span className="text-slate-300 font-semibold">{log.tipo_movimentacao}</span>
                          </p>
                          <p className="text-slate-400">
                            De <span className="font-semibold">{log.status_anterior}</span> para <span className="font-semibold">{log.status_novo}</span>
                          </p>
                          {log.descricao && (
                            <p className="text-slate-500 text-[10px] italic">{log.descricao}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-dark-600/50 flex justify-end">
                  <Button
                    onClick={() => setStudentHistory(null)}
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
      </AnimatePresence>

      {/* SUB-MODAL: Resultado do Empréstimo em Lote */}
      <AnimatePresence>
        {batchResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-xl shadow-2xl relative mx-4 text-slate-200">
              <button
                onClick={() => setBatchResult(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>
              <div className="space-y-4">
                <header className="border-b border-dark-600/50 pb-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check size={20} weight="bold" />
                    <h3 className="text-base font-bold text-slate-100">Resultado da Alocação</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {batchResult.message}
                  </p>
                </header>

                <div className="max-h-[300px] overflow-y-auto space-y-4 pr-1">
                  {/* ALOCADOS */}
                  {batchResult.alocados && batchResult.alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Contemplados ({batchResult.alocados.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {batchResult.alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-xs flex justify-between">
                            <span className="text-slate-300 font-semibold">{item.nome}</span>
                            <span className="font-mono text-emerald-400 font-bold">{item.notebook_patrimonio}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JÁ POSSUÍAM */}
                  {batchResult.ja_alocados && batchResult.ja_alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        Já com Notebook ({batchResult.ja_alocados.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {batchResult.ja_alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2 rounded bg-dark-800 border border-dark-600 text-xs flex justify-between">
                            <span className="text-slate-400">{item.nome}</span>
                            <span className="font-mono text-slate-450">{item.notebook_patrimonio}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NÃO ALOCADOS */}
                  {batchResult.nao_alocados && batchResult.nao_alocados.length > 0 && (
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider">
                        Não Alocados (Sem Estoque) ({batchResult.nao_alocados.length})
                      </h4>
                      <div className="space-y-2">
                        {batchResult.nao_alocados.map((item) => (
                          <div key={item.usuario_id} className="p-2.5 rounded bg-red-500/5 border border-red-500/10 text-xs space-y-1">
                            <div className="flex justify-between font-semibold text-slate-300">
                              <span>{item.nome}</span>
                              <span className="text-red-400">{item.motivo}</span>
                            </div>
                            {item.historico && item.historico.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-red-500/10">
                                <span className="text-[10px] text-slate-500">Histórico de Uso Recente:</span>
                                <div className="space-y-1 mt-1 font-mono">
                                  {item.historico.map((h, i) => (
                                    <div key={i} className="text-[10px] text-slate-450 flex justify-between">
                                      <span>{h.modelo} ({h.patrimonio})</span>
                                      <span>{h.data}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-dark-600/50 flex justify-end">
                  <Button
                    onClick={() => setBatchResult(null)}
                    variant="cyan"
                    className="text-xs py-2 px-4"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom confirm modal for student removal from class */}
      <AnimatePresence>
        {confirmRemoveStudent && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center text-slate-200"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-450 text-2xl">
                <UserMinus weight="bold" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Desvincular Aluno
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Tem certeza que deseja remover o aluno <strong>{confirmRemoveStudent.nome}</strong> da turma? O aluno não possuirá turma vinculada no sistema.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200"
                  onClick={() => setConfirmRemoveStudent(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500"
                  onClick={executeRemoveStudent}
                >
                  Confirmar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Custom confirm modal for class deletion */}
      <AnimatePresence>
        {confirmDeleteTurmaId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4 text-center text-slate-200"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl">
                <Trash weight="duotone" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Excluir Turma
              </h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Tem certeza que deseja excluir a turma <strong>{confirmDeleteTurmaId}</strong>? Isso também removerá todas as reservas ativas associadas a ela.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 text-xs py-2.5 bg-dark-800 hover:bg-dark-700 text-slate-200"
                  onClick={() => setConfirmDeleteTurmaId(null)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  className="flex-1 text-xs py-2.5 bg-red-600 hover:bg-red-500 text-white border border-red-500"
                  onClick={executeDeleteTurma}
                >
                  Confirmar Exclusão
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
