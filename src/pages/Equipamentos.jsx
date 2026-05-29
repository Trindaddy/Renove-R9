import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listarEquipamentos, atualizarEquipamento, cadastrarEquipamento } from '../services/equipamentosService';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningCircle, Archive, Laptop } from '@phosphor-icons/react';

export default function Equipamentos() {
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
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
      setEquipamentos(Array.isArray(data) ? data : []);
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

  const filtrados = equipamentos.filter((eq) => {
    const patrimonioStr = (eq?.patrimonio ?? '').toString().toLowerCase();
    const q = (busca ?? '').toLowerCase();
    return patrimonioStr.includes(q);
  });

  const paginated = filtrados.slice((page - 1) * itemsPerPage, page * itemsPerPage);

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

      <div className="glass-card overflow-hidden">
        {/* Table layout para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3">Patrimônio</th>
                <th className="text-left px-5 py-3">Modelo</th>
                <th className="text-left px-5 py-3">Local</th>
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
                      <div>{eq.modelo}</div>
                      {eq.status === 'Manutenção' && eq.justificativa_manutencao && (
                        <div className="text-[10px] text-amber-500 mt-0.5 font-medium">
                          Motivo: {eq.justificativa_manutencao} • Autor: {eq.autor_manutencao || 'N/A'}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{eq.local}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={eq.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {eq.status === 'Disponível' && (
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
                      )}
                      {eq.status === 'Manutenção' && (
                        <Button
                          variant="success"
                          className="px-2.5 py-1 text-[11px]"
                          onClick={() => handleReturnFromMaintenance(eq.id)}
                        >
                          Concluir Manutenção
                        </Button>
                      )}
                      {isEmprestadoOuUso && (
                        <span className="text-[11px] text-slate-505 italic">Em uso ativo</span>
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
                    <div className="text-sm font-bold text-slate-200">{eq.modelo}</div>
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
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Local</span>
                    <span className="text-slate-300">{eq.local}</span>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  {eq.status === 'Disponível' && (
                    <Button
                      variant="danger"
                      className="w-full text-[11px] py-2"
                      onClick={() => {
                        setSelectedEq(eq);
                        setShowMaintenanceModal(true);
                      }}
                    >
                      Enviar para Manutenção
                    </Button>
                  )}
                  {eq.status === 'Manutenção' && (
                    <Button
                      variant="success"
                      className="w-full text-[11px] py-2"
                      onClick={() => handleReturnFromMaintenance(eq.id)}
                    >
                      Concluir Manutenção
                    </Button>
                  )}
                  {isEmprestadoOuUso && (
                    <div className="w-full text-center text-[11px] text-slate-500 italic py-2 bg-dark-800/30 rounded border border-dark-600/50">
                      Em uso ativo
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

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-300">Condição</span>
                  <select
                    value={newNotebook.condicao}
                    onChange={(e) => setNewNotebook(prev => ({ ...prev, condicao: e.target.value }))}
                    className="tech-select text-xs"
                  >
                    <option value="Novo">Novo</option>
                    <option value="Bom">Bom</option>
                    <option value="Regular">Regular</option>
                    <option value="Ruim">Ruim</option>
                  </select>
                </label>

                <Input
                  label="Local"
                  name="local"
                  value={newNotebook.local}
                  onChange={(e) => setNewNotebook(prev => ({ ...prev, local: e.target.value }))}
                  required
                />
              </div>

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
    </motion.div>
  );
}
