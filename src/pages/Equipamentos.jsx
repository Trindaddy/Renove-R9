import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listarEquipamentos, atualizarEquipamento, cadastrarEquipamento, forcarDevolucaoEquipamento, excluirEquipamento } from '../services/equipamentosService';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningCircle, Archive, Laptop, Trash, ArrowClockwise, PencilSimple, CheckCircle, Warning } from '@phosphor-icons/react';

export default function Equipamentos() {
  const [busca, setBusca] = useState('');
  const [activeDashboard, setActiveDashboard] = useState('status'); // 'status' ou 'condicao'
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showForceReturnModal, setShowForceReturnModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditConditionModal, setShowEditConditionModal] = useState(false);
  const [showEditDescriptionModal, setShowEditDescriptionModal] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editCondition, setEditCondition] = useState('Bom');
  const [selectedEq, setSelectedEq] = useState(null);

  // Form de Cadastro
  const [newNotebook, setNewNotebook] = useState({
    patrimonio: '',
    modelo: '',
    marca: 'Dell',
    local: 'Estoque',
    status: 'Disponível',
    condicao: 'Bom',
    observacoes: ''
  });

  // Form de Manutenção
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const data = await listarEquipamentos();
      const formatados = (Array.isArray(data) ? data : []).map(eq => ({
        ...eq,
        condicao: eq.condicao || 'Bom'
      }));
      setEquipamentos(formatados);
    } catch (err) {
      setError('Não foi possível carregar os equipamentos. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Detecta alteração no patrimônio e auto-classifica modelo/marca
  function handlePatrimonioChange(e) {
    const pat = e.target.value;
    let modelo = newNotebook.modelo;
    let marca = newNotebook.marca;

    if (pat.startsWith('21')) {
      modelo = 'Dell Latitude 5430';
      marca = 'Dell';
    } else if (pat.startsWith('29')) {
      modelo = 'Dell Latitude 5450';
      marca = 'Dell';
    } else if (pat.startsWith('37')) {
      modelo = 'Dell Pro';
      marca = 'Dell';
    }

    setNewNotebook(prev => ({
      ...prev,
      patrimonio: pat,
      modelo,
      marca
    }));
  }

  async function handleAddNotebook(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await cadastrarEquipamento(newNotebook);
      setSuccess('Notebook cadastrado com sucesso!');
      setShowAddModal(false);
      setNewNotebook({
        patrimonio: '',
        modelo: '',
        marca: 'Dell',
        local: 'Estoque',
        status: 'Disponível',
        condicao: 'Bom',
        observacoes: ''
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar notebook.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendToMaintenance(e) {
    e.preventDefault();
    if (!maintenanceReason) {
      setError('Por favor, informe o motivo da manutenção.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const reasonDetail = maintenanceNotes ? `${maintenanceReason} - ${maintenanceNotes}` : maintenanceReason;
      await atualizarEquipamento(selectedEq.id, { 
        status: 'Manutenção',
        justificativa_manutencao: reasonDetail,
        observacoes: reasonDetail
      });
      setSuccess('Equipamento enviado para manutenção.');
      setShowMaintenanceModal(false);
      setSelectedEq(null);
      setMaintenanceReason('');
      setMaintenanceNotes('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Não foi possível enviar o equipamento para manutenção.');
    } finally {
      setLoading(false);
    }
  }

  async function handleReturnFromMaintenance(id) {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await atualizarEquipamento(id, { 
        status: 'Disponível',
        observacoes: 'Retornou da manutenção'
      });
      setSuccess('Equipamento liberado e disponível para uso.');
      await load();
    } catch (err) {
      setError('Não foi possível alterar o status do equipamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForceStatus(id, newStatus) {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await atualizarEquipamento(id, { 
        status: newStatus,
        observacoes: newStatus === 'Disponível' ? 'Reserva cancelada administrativamente' : 'Empréstimo confirmado administrativamente'
      });
      setSuccess(newStatus === 'Disponível' ? 'Reserva cancelada com sucesso.' : 'Retirada física confirmada com sucesso.');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Não foi possível alterar o status do equipamento.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForceReturn() {
    if (!selectedEq) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await forcarDevolucaoEquipamento(selectedEq.id);
      setSuccess(`Notebook ${selectedEq.patrimonio} foi devolvido forçadamente e liberado.`);
      setShowForceReturnModal(false);
      setSelectedEq(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao forçar devolução do equipamento.');
      setShowForceReturnModal(false);
      setSelectedEq(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!selectedEq) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await excluirEquipamento(selectedEq.id);
      setSuccess(`Notebook ${selectedEq.patrimonio} excluído logicamente com sucesso.`);
      setShowDeleteModal(false);
      setSelectedEq(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao excluir o equipamento.');
      setShowDeleteModal(false);
      setSelectedEq(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveCondition(e) {
    e.preventDefault();
    if (!selectedEq) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await atualizarEquipamento(selectedEq.id, { condicao: editCondition });
      setSuccess(`Condição do notebook ${selectedEq.patrimonio} atualizada para ${editCondition}.`);
      setShowEditConditionModal(false);
      setSelectedEq(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atualizar a condição do equipamento.');
      setShowEditConditionModal(false);
      setSelectedEq(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDescription(e) {
    e.preventDefault();
    if (!selectedEq) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await atualizarEquipamento(selectedEq.id, { observacoes: editDescription || null });
      setSuccess(`Descrição do notebook ${selectedEq.patrimonio} atualizada com sucesso.`);
      setShowEditDescriptionModal(false);
      setSelectedEq(null);
      setEditDescription('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao atualizar a descrição do equipamento.');
      setShowEditDescriptionModal(false);
      setSelectedEq(null);
      setEditDescription('');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteDescription() {
    if (!selectedEq) return;
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await atualizarEquipamento(selectedEq.id, { observacoes: null });
      setSuccess(`Descrição do notebook ${selectedEq.patrimonio} removida com sucesso.`);
      setShowEditDescriptionModal(false);
      setSelectedEq(null);
      setEditDescription('');
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao excluir a descrição do equipamento.');
      setShowEditDescriptionModal(false);
      setSelectedEq(null);
      setEditDescription('');
    } finally {
      setLoading(false);
    }
  }

  function getConditionBadgeClass(condicao) {
    const cond = (condicao || 'Bom').toLowerCase();
    switch (cond) {
      case 'excelente':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'bom':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'regular':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      case 'ruim':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'danificado':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'obsoleto':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  }

  const filtrados = equipamentos.filter((eq) => {
    const patrimonioStr = (eq?.patrimonio ?? '').toString().toLowerCase();
    const q = (busca ?? '').toLowerCase();
    return patrimonioStr.includes(q);
  });

  const paginated = filtrados.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Métricas do Dashboard 1 (Status Geral)
  const disponiveisCount = equipamentos.filter(eq => eq.status === 'Disponível').length;
  const manutencaoCount = equipamentos.filter(eq => eq.status === 'Manutenção').length;
  const emprestadosCount = equipamentos.filter(eq => eq.status === 'Emprestado' || eq.status === 'Em uso').length;

  // Métricas do Dashboard 2 (Condições Físicas)
  const excelenteCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'excelente').length;
  const bomCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'bom').length;
  const regularCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'regular').length;
  const ruimCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'ruim').length;
  const danificadoCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'danificado').length;
  const obsoletoCount = equipamentos.filter(eq => (eq.condicao || 'Bom').toLowerCase() === 'obsoleto').length;

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
          <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Inventário de Equipamentos</h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão completa do parque de notebooks. Acesso restrito à equipe de TI.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 w-full md:w-auto">
          <div className="w-full md:w-72">
            <Input
              label="Buscar por Patrimônio"
              placeholder="Ex: 29673"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Button onClick={() => setShowAddModal(true)} variant="cyan" className="h-fit py-2 px-4">
            + Novo Notebook
          </Button>
        </div>
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
            <p className="text-sm text-red-400">{error}</p>
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
            <p className="text-sm text-emerald-300">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEÇÃO DE RELATÓRIOS VISUAIS (DASHBOARD COMPARTILHADO COM TRANSIÇÕES) */}
      <div className="relative glass-card p-5 border border-dark-600/50 bg-dark-850/30 overflow-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Decorative background glow that updates dynamically */}
        <div className={`absolute -right-20 -top-20 w-48 h-48 rounded-full blur-[80px] opacity-15 pointer-events-none transition-all duration-500 ${
          activeDashboard === 'status' ? 'bg-primary' : 'bg-amber-500'
        }`} />

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {activeDashboard === 'status' ? (
              <motion.div
                key="db-status"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
              >
                {/* Card 1: Disponíveis */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/25 transition-all flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle weight="duotone" size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Disponíveis</span>
                    <h3 className="text-xl font-black text-slate-100 mt-0.5">{disponiveisCount}</h3>
                  </div>
                </div>

                {/* Card 2: Emprestados */}
                <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/25 transition-all flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                    <Laptop weight="duotone" size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Emprestados</span>
                    <h3 className="text-xl font-black text-slate-100 mt-0.5">{emprestadosCount}</h3>
                  </div>
                </div>

                {/* Card 3: Em Manutenção */}
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/25 transition-all flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
                    <Warning weight="duotone" size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Manutenção</span>
                    <h3 className="text-xl font-black text-slate-100 mt-0.5">{manutencaoCount}</h3>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="db-condicao"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
              >
                {/* Excelente */}
                <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Excelente</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{excelenteCount}</h3>
                </div>

                {/* Bom */}
                <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10 hover:border-green-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bom</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{bomCount}</h3>
                </div>

                {/* Regular */}
                <div className="p-3 rounded-2xl bg-yellow-500/5 border border-yellow-500/10 hover:border-yellow-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Regular</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{regularCount}</h3>
                </div>

                {/* Ruim */}
                <div className="p-3 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ruim</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{ruimCount}</h3>
                </div>

                {/* Danificado */}
                <div className="p-3 rounded-2xl bg-red-500/5 border border-red-500/10 hover:border-red-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Danificado</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{danificadoCount}</h3>
                </div>

                {/* Obsoleto */}
                <div className="p-3 rounded-2xl bg-purple-500/5 border border-purple-500/10 hover:border-purple-500/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Obsoleto</span>
                  </div>
                  <h3 className="text-lg font-black text-slate-100 mt-1">{obsoletoCount}</h3>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimalist Toggle Seta Button */}
        <div className="flex items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-dark-600/40 pt-4 md:pt-0 md:pl-5">
          <button
            type="button"
            onClick={() => setActiveDashboard(prev => prev === 'status' ? 'condicao' : 'status')}
            className="h-10 w-10 rounded-xl bg-dark-700/50 border border-dark-600 hover:border-primary/40 hover:bg-primary/5 text-slate-400 hover:text-primary transition-all flex items-center justify-center group"
            title={activeDashboard === 'status' ? "Ver Condições Físicas" : "Ver Métricas Gerais"}
          >
            <motion.div
              animate={{ rotate: activeDashboard === 'status' ? 0 : 180 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-center"
            >
              <svg className="h-5 w-5 stroke-current fill-none stroke-2 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </motion.div>
          </button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        {/* Table layout para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3">Patrimônio</th>
                <th className="text-left px-5 py-3">Modelo</th>
                <th className="text-left px-5 py-3">Condição</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                      <span className="text-xs text-slate-500 ml-2">Sincronizando...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginated.map((eq) => {
                const isEmprestadoOuUso = eq.status === 'Emprestado' || eq.status === 'Em uso';
                return (
                  <tr key={eq.id} className="tech-table-row group">
                    <td className="px-5 py-3.5 font-mono text-xs text-primary/80">{eq.patrimonio}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{eq.modelo}</span>
                        <button
                          onClick={() => {
                            setSelectedEq(eq);
                            setEditDescription(eq.observacoes || '');
                            setShowEditDescriptionModal(true);
                          }}
                          className="p-1 rounded text-slate-450 hover:text-primary hover:bg-dark-600/50 transition-all flex items-center justify-center"
                          title="Editar Descrição"
                        >
                          <PencilSimple size={13} />
                        </button>
                      </div>
                      {eq.observacoes ? (
                        <div className="text-[10px] text-slate-450 italic mt-0.5">
                          {eq.observacoes}
                        </div>
                      ) : (
                        <div 
                          className="text-[10px] text-slate-600 hover:text-primary mt-0.5 cursor-pointer inline-block transition-colors"
                          onClick={() => {
                            setSelectedEq(eq);
                            setEditDescription('');
                            setShowEditDescriptionModal(true);
                          }}
                        >
                          + Adicionar descrição
                        </div>
                      )}
                      {eq.status === 'Manutenção' && eq.justificativa_manutencao && (
                        <div className="text-[10px] text-amber-500 mt-1.5 font-medium">
                          Motivo: {eq.justificativa_manutencao} • Autor: {eq.autor_manutencao || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={() => {
                            setSelectedEq(eq);
                            setEditCondition(eq.condicao || 'Bom');
                            setShowEditConditionModal(true);
                          }}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all ${getConditionBadgeClass(eq.condicao)}`}
                          title="Clique para editar a condição"
                        >
                          {eq.condicao || 'Bom'}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedEq(eq);
                            setEditCondition(eq.condicao || 'Bom');
                            setShowEditConditionModal(true);
                          }}
                          className="p-1 rounded text-slate-450 hover:text-primary hover:bg-dark-600/50 transition-all"
                          title="Editar Condição"
                        >
                          <PencilSimple size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={eq.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {eq.status === 'Disponível' && (
                        <div className="inline-flex gap-2 items-center">
                          <Button
                            variant="danger"
                            className="px-2.5 py-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setSelectedEq(eq);
                              setShowMaintenanceModal(true);
                            }}
                          >
                            Enviar Manutenção
                          </Button>
                          <button
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all text-xs"
                            title="Excluir Notebook"
                            onClick={() => {
                              setSelectedEq(eq);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                      {eq.status === 'Manutenção' && (
                        <div className="inline-flex gap-2 items-center">
                          <Button
                            variant="success"
                            className="px-2.5 py-1 text-[11px]"
                            onClick={() => handleReturnFromMaintenance(eq.id)}
                          >
                            Concluir Manutenção
                          </Button>
                          <button
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all text-xs"
                            title="Excluir Notebook"
                            onClick={() => {
                              setSelectedEq(eq);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                      {(eq.status === 'Reservado' || eq.status === 'Reservado (Em Lote)' || isEmprestadoOuUso) && (
                        <div className="inline-flex gap-1.5 items-center">
                          <Button
                            variant="danger"
                            className="px-2.5 py-1 text-[11px] font-bold"
                            onClick={() => {
                              setSelectedEq(eq);
                              setShowForceReturnModal(true);
                            }}
                          >
                            Forçar Devolução
                          </Button>
                          {eq.status === 'Reservado' && (
                            <Button
                              variant="success"
                              className="px-2.5 py-1 text-[11px] font-bold"
                              onClick={() => handleForceStatus(eq.id, 'Emprestado')}
                            >
                              Forçar Entrega
                            </Button>
                          )}
                          <button
                            className="p-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition-all text-xs"
                            title="Excluir Notebook"
                            onClick={() => {
                              setSelectedEq(eq);
                              setShowDeleteModal(true);
                            }}
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl opacity-20 text-slate-500"><Archive weight="duotone" /></span>
                      <p className="text-xs text-slate-500">Nenhum equipamento encontrado.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Card Layout para Mobile */}
        <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
            </div>
          )}

          {!loading && paginated.map((eq) => {
            const isEmprestadoOuUso = eq.status === 'Emprestado' || eq.status === 'Em uso';
            return (
              <div key={eq.id} className="bg-dark-700/30 border border-dark-600 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3">
                  <StatusBadge status={eq.status} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-dark-600/50 flex items-center justify-center">
                    <Laptop weight="duotone" className="text-primary text-xl" />
                  </div>
                  <div className="flex-1">
                    <div className="font-mono text-xs text-primary/80">{eq.patrimonio}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-sm font-bold text-slate-200">{eq.modelo}</div>
                      <button
                        onClick={() => {
                          setSelectedEq(eq);
                          setEditDescription(eq.observacoes || '');
                          setShowEditDescriptionModal(true);
                        }}
                        className="p-1 rounded text-slate-450 hover:text-primary hover:bg-dark-600/50 transition-all flex items-center justify-center"
                        title="Editar Descrição"
                      >
                        <PencilSimple size={13} />
                      </button>
                    </div>
                    {eq.observacoes ? (
                      <div className="text-[10px] text-slate-450 italic mt-1">
                        {eq.observacoes}
                      </div>
                    ) : (
                      <div 
                        className="text-[10px] text-slate-600 hover:text-primary mt-1 cursor-pointer inline-block transition-colors"
                        onClick={() => {
                          setSelectedEq(eq);
                          setEditDescription('');
                          setShowEditDescriptionModal(true);
                        }}
                      >
                        + Adicionar descrição
                      </div>
                    )}
                    {eq.status === 'Manutenção' && eq.justificativa_manutencao && (
                      <div className="text-[10px] text-amber-500 mt-1.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 font-medium">
                        <strong>Motivo:</strong> {eq.justificativa_manutencao}<br/>
                        <strong>Autor:</strong> {eq.autor_manutencao || 'N/A'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-xs border-t border-dark-600/50 pt-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Condição</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span 
                        onClick={() => {
                          setSelectedEq(eq);
                          setEditCondition(eq.condicao || 'Bom');
                          setShowEditConditionModal(true);
                        }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer hover:scale-105 active:scale-95 transition-all ${getConditionBadgeClass(eq.condicao)}`}
                        title="Clique para editar a condição"
                      >
                        {eq.condicao || 'Bom'}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedEq(eq);
                          setEditCondition(eq.condicao || 'Bom');
                          setShowEditConditionModal(true);
                        }}
                        className="p-1 rounded bg-dark-600/50 border border-dark-500/30 text-slate-300 hover:text-primary hover:bg-dark-600 transition-all"
                        title="Editar Condição"
                      >
                        <PencilSimple size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  {eq.status === 'Disponível' && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="danger"
                        className="flex-1 text-[11px] py-2"
                        onClick={() => {
                          setSelectedEq(eq);
                          setShowMaintenanceModal(true);
                        }}
                      >
                        Enviar para Manutenção
                      </Button>
                      <button
                        className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                        onClick={() => {
                          setSelectedEq(eq);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                  {eq.status === 'Manutenção' && (
                    <div className="flex gap-2 w-full">
                      <Button
                        variant="success"
                        className="flex-1 text-[11px] py-2"
                        onClick={() => handleReturnFromMaintenance(eq.id)}
                      >
                        Concluir Manutenção
                      </Button>
                      <button
                        className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                        onClick={() => {
                          setSelectedEq(eq);
                          setShowDeleteModal(true);
                        }}
                      >
                        <Trash size={16} />
                      </button>
                    </div>
                  )}
                  {(eq.status === 'Reservado' || eq.status === 'Reservado (Em Lote)' || isEmprestadoOuUso) && (
                    <div className="w-full flex flex-col gap-2">
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="danger"
                          className="flex-1 text-[11px] py-2 font-bold"
                          onClick={() => {
                            setSelectedEq(eq);
                            setShowForceReturnModal(true);
                          }}
                        >
                          Forçar Devolução
                        </Button>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                          onClick={() => {
                            setSelectedEq(eq);
                            setShowDeleteModal(true);
                          }}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                      {eq.status === 'Reservado' && (
                        <Button
                          variant="success"
                          className="w-full text-[11px] py-2"
                          onClick={() => handleForceStatus(eq.id, 'Emprestado')}
                        >
                          Forçar Entrega
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && filtrados.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <span className="text-3xl opacity-20 text-slate-500"><Archive weight="duotone" /></span>
              <p className="text-xs text-slate-500">Nenhum equipamento.</p>
            </div>
          )}
        </div>
        
        {/* Pagination Controls */}
        {filtrados.length > itemsPerPage && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-dark-600/50 bg-dark-800/50">
            <span className="text-[10px] text-slate-500 font-mono">
              Página {page} de {Math.ceil(filtrados.length / itemsPerPage)} ({filtrados.length} notebooks)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || loading}
                className="px-3.5 py-1.5 rounded-lg bg-dark-700 border border-dark-600 hover:bg-dark-600 text-slate-350 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold animate-all"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((prev) => prev + 1)}
                disabled={page * itemsPerPage >= filtrados.length || loading}
                className="px-3.5 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-semibold animate-all"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: Adicionar Notebook */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <form onSubmit={handleAddNotebook} className="space-y-4">
              <header className="border-b border-dark-600/50 pb-3">
                <h3 className="text-base font-bold text-slate-100">Cadastrar Novo Notebook</h3>
                <p className="text-xs text-slate-400 mt-1">Classificação inteligente baseada no patrimônio.</p>
              </header>

              <Input
                label="Patrimônio"
                name="patrimonio"
                placeholder="Ex: 21491, 29673, 37568..."
                value={newNotebook.patrimonio}
                onChange={handlePatrimonioChange}
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Modelo"
                  name="modelo"
                  placeholder="Auto-classificado"
                  value={newNotebook.modelo}
                  onChange={(e) => setNewNotebook(prev => ({ ...prev, modelo: e.target.value }))}
                  required
                />
                <Input
                  label="Marca"
                  name="marca"
                  placeholder="Dell, Lenovo..."
                  value={newNotebook.marca}
                  onChange={(e) => setNewNotebook(prev => ({ ...prev, marca: e.target.value }))}
                  required
                />
              </div>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-300">Condição</span>
                <select
                  value={newNotebook.condicao}
                  onChange={(e) => setNewNotebook(prev => ({ ...prev, condicao: e.target.value }))}
                  className="tech-select text-xs"
                >
                  <option value="Excelente">Excelente</option>
                  <option value="Bom">Bom</option>
                  <option value="Regular">Regular</option>
                  <option value="Ruim">Ruim</option>
                  <option value="Danificado">Danificado</option>
                  <option value="Obsoleto">Obsoleto</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-300">Observações</span>
                <textarea
                  value={newNotebook.observacoes}
                  onChange={(e) => setNewNotebook(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Informações adicionais sobre o equipamento..."
                  className="tech-input h-20 resize-none w-full"
                />
              </label>

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
                  Salvar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Enviar para Manutenção (Formulário Obrigatório) */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => {
                setShowMaintenanceModal(false);
                setSelectedEq(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <form onSubmit={handleSendToMaintenance} className="space-y-4">
              <header className="border-b border-dark-600/50 pb-3">
                <h3 className="text-base font-bold text-slate-100">Enviar para Manutenção</h3>
                <p className="text-xs text-slate-400 mt-1">Indique obrigatoriamente o motivo da baixa do notebook {selectedEq?.patrimonio}.</p>
              </header>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-350">Motivo principal</span>
                <select
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  className="tech-select text-xs"
                  required
                >
                  <option value="">Selecione o motivo</option>
                  <option value="Avaria">Avaria (Tela quebrada, teclado solto, etc.)</option>
                  <option value="Roubo">Roubo / Extravio</option>
                  <option value="Problema Técnico">Problema Técnico (Lentidão, falha no boot, bateria)</option>
                  <option value="Outro">Outro (Especifique abaixo)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-355">Detalhes / Observações (Opcional)</span>
                <textarea
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  placeholder="Descreva melhor o problema ocorrido..."
                  className="tech-input h-24 resize-none w-full"
                />
              </label>

              <div className="flex gap-2 pt-3 border-t border-dark-600/50">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs py-2 bg-dark-700 hover:bg-dark-600 text-slate-200"
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setSelectedEq(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 text-xs py-2"
                >
                  Confirmar Baixa
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Forçar Devolução */}
      {showForceReturnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4 border-amber-500/20 bg-gradient-to-br from-dark-800 to-dark-900">
            <button
              onClick={() => {
                setShowForceReturnModal(false);
                setSelectedEq(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-405 shrink-0">
                <ArrowClockwise weight="bold" size={32} className="animate-spin" />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Forçar Devolução</h3>
                <p className="text-[10px] text-amber-400 font-mono tracking-widest uppercase">Gatilho de Contingência</p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-dark-950/40 p-4 rounded-xl border border-dark-600/40">
                Você está prestes a forçar a devolução do notebook <strong className="text-amber-400">{selectedEq?.patrimonio}</strong>. 
                Isso mudará seu status para <strong>Disponível</strong> e encerrará qualquer empréstimo ou reserva ativa correspondente.
              </p>

              <div className="flex gap-3 w-full pt-2">
                <Button
                  onClick={() => {
                    setShowForceReturnModal(false);
                    setSelectedEq(null);
                  }}
                  variant="outline"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold bg-dark-700 hover:bg-dark-600 text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleForceReturn}
                  disabled={loading}
                  variant="danger"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold bg-amber-600 hover:bg-amber-500 border-amber-600"
                >
                  {loading ? 'Processando...' : 'Confirmar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Condição */}
      {showEditConditionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4 border-dark-600 bg-gradient-to-br from-dark-800 to-dark-900">
            <button
              onClick={() => {
                setShowEditConditionModal(false);
                setSelectedEq(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <form onSubmit={handleSaveCondition} className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <PencilSimple weight="duotone" size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Editar Condição</h3>
                  <p className="text-[10px] text-primary font-mono tracking-widest uppercase">{selectedEq?.patrimonio}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Nova Condição</label>
                <select
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value)}
                  className="tech-select w-full py-2.5 text-xs"
                  required
                >
                  <option value="Excelente">Excelente</option>
                  <option value="Bom">Bom</option>
                  <option value="Regular">Regular</option>
                  <option value="Ruim">Ruim</option>
                  <option value="Danificado">Danificado</option>
                  <option value="Obsoleto">Obsoleto</option>
                </select>
              </div>

              <div className="flex gap-3 w-full pt-2">
                <Button
                  onClick={() => {
                    setShowEditConditionModal(false);
                    setSelectedEq(null);
                  }}
                  variant="outline"
                  type="button"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold bg-dark-700 hover:bg-dark-600 text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  variant="success"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Descrição */}
      {showEditDescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4 border-dark-600 bg-gradient-to-br from-dark-800 to-dark-900">
            <button
              onClick={() => {
                setShowEditDescriptionModal(false);
                setSelectedEq(null);
                setEditDescription('');
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <form onSubmit={handleSaveDescription} className="space-y-4">
              <div className="flex flex-col items-center text-center space-y-3 pt-2">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                  <PencilSimple weight="duotone" size={32} />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Editar Descrição</h3>
                  <p className="text-[10px] text-primary font-mono tracking-widest uppercase">{selectedEq?.patrimonio}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição / Observações</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Insira detalhes sobre o notebook (ex: carregador danificado, sem bateria, etc.)"
                  className="tech-input w-full p-3 text-xs bg-dark-900 border border-dark-600 text-slate-100 rounded-xl focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  rows={4}
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-3 w-full">
                  <Button
                    onClick={() => {
                      setShowEditDescriptionModal(false);
                      setSelectedEq(null);
                      setEditDescription('');
                    }}
                    variant="outline"
                    type="button"
                    className="flex-1 py-2.5 text-xs tracking-wider uppercase font-bold bg-dark-700 hover:bg-dark-600 text-slate-200"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    variant="success"
                    className="flex-1 py-2.5 text-xs tracking-wider uppercase font-bold"
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
                {selectedEq?.observacoes && (
                  <Button
                    onClick={handleDeleteDescription}
                    disabled={loading}
                    variant="danger"
                    type="button"
                    className="w-full py-2.5 text-xs tracking-wider uppercase font-bold bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-900/20"
                  >
                    Excluir Descrição
                  </Button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Excluir Notebook */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="glass-card p-6 w-full max-w-md shadow-2xl relative mx-4 border-red-500/20 bg-gradient-to-br from-dark-800 to-dark-900">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedEq(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
            >
              ✕
            </button>
            <div className="flex flex-col items-center text-center space-y-4 pt-2">
              <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <Trash weight="duotone" size={32} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">Excluir Equipamento</h3>
                <p className="text-[10px] text-red-405 font-mono tracking-widest uppercase">Soft Delete</p>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-medium bg-dark-950/40 p-4 rounded-xl border border-dark-600/40">
                Deseja realmente marcar o notebook <strong className="text-red-400">{selectedEq?.patrimonio}</strong> ({selectedEq?.modelo}) como excluído do inventário?
                Esta ação não apagará seus históricos anteriores, mas o removerá da lista ativa.
              </p>

              <div className="flex gap-3 w-full pt-2">
                <Button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedEq(null);
                  }}
                  variant="outline"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold bg-dark-700 hover:bg-dark-600 text-slate-200"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={loading}
                  variant="danger"
                  className="flex-1 py-3 text-xs tracking-wider uppercase font-bold"
                >
                  {loading ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
