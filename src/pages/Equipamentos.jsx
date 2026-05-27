import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarEquipamentos, atualizarEquipamento, cadastrarEquipamento } from '../services/equipamentosService';

export default function Equipamentos() {
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modais
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedEqId, setSelectedEqId] = useState(null);

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
      await atualizarEquipamento(selectedEqId, { 
        status: 'Manutenção',
        observacoes: reasonDetail
      });
      setSuccess('Equipamento enviado para manutenção.');
      setShowMaintenanceModal(false);
      setSelectedEqId(null);
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
    const idStr = (eq?.id ?? '').toString().toLowerCase();
    const patrimonioStr = (eq?.patrimonio ?? '').toString().toLowerCase();
    const q = (busca ?? '').toLowerCase();
    return idStr.includes(q) || patrimonioStr.includes(q);
  });

  return (
    <div className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-navy-500/20">
        <div>
          <h1 className="text-xl font-semibold">Inventário de Equipamentos</h1>
          <p className="text-sm text-slate-400">
            Visão completa do parque de notebooks. Acesso restrito à equipe de TI.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-60">
            <Input
              placeholder="Buscar por ID/Patrimônio"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowAddModal(true)} variant="cyan">
            + Novo Notebook
          </Button>
        </div>
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

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Patrimônio</th>
              <th className="text-left px-3 py-2">Modelo</th>
              <th className="text-left px-3 py-2">Local</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Carregando equipamentos...
                </td>
              </tr>
            )}

            {!loading &&
              filtrados.map((eq) => {
                const isEmprestadoOuUso = eq.status === 'Emprestado' || eq.status === 'Em uso';
                return (
                  <tr
                    key={eq.id}
                    className="border-t border-slate-800/80 hover:bg-slate-800/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs">{eq.id}</td>
                    <td className="px-3 py-2 font-mono text-xs">{eq.patrimonio}</td>
                    <td className="px-3 py-2">{eq.modelo}</td>
                    <td className="px-3 py-2 text-xs text-slate-300">{eq.local}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={`px-2 py-1 rounded-full text-[11px] ${
                          eq.status === 'Disponível'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                            : isEmprestadoOuUso
                            ? 'bg-senac-orange/10 text-senac-orange border border-senac-orange/40'
                            : eq.status === 'Manutenção'
                            ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                            : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                        }`}
                      >
                        {eq.status === 'Emprestado' ? 'Em uso' : eq.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {eq.status === 'Disponível' && (
                        <button
                          onClick={() => {
                            setSelectedEqId(eq.id);
                            setShowMaintenanceModal(true);
                          }}
                          className="px-2.5 py-1 text-[11px] rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all font-semibold"
                        >
                          Enviar para Manutenção
                        </button>
                      )}
                      {eq.status === 'Manutenção' && (
                        <button
                          onClick={() => handleReturnFromMaintenance(eq.id)}
                          className="px-2.5 py-1 text-[11px] rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all font-semibold"
                        >
                          Concluir Manutenção
                        </button>
                      )}
                      {isEmprestadoOuUso && (
                        <span className="text-[11px] text-slate-500 italic">Em uso ativo</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Nenhum equipamento encontrado para o filtro informado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL: Adicionar Notebook */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <form onSubmit={handleAddNotebook} className="space-y-4">
              <header className="border-b border-slate-800 pb-3">
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
                    className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange text-slate-200"
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
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange text-slate-200 h-20 resize-none"
                />
              </label>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs py-2 bg-slate-800 hover:bg-slate-700 text-slate-200"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-2xl relative mx-4">
            <button
              onClick={() => {
                setShowMaintenanceModal(false);
                setSelectedEqId(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
            >
              ✕
            </button>
            <form onSubmit={handleSendToMaintenance} className="space-y-4">
              <header className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-slate-100">Enviar para Manutenção</h3>
                <p className="text-xs text-slate-400 mt-1">Indique obrigatoriamente o motivo da baixa do notebook #{selectedEqId}.</p>
              </header>

              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-300">Motivo principal</span>
                <select
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange text-slate-200"
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
                <span className="text-xs text-slate-300">Detalhes / Observações (Opcional)</span>
                <textarea
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  placeholder="Descreva melhor o problema ocorrido..."
                  className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange text-slate-200 h-24 resize-none"
                />
              </label>

              <div className="flex gap-2 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-xs py-2 bg-slate-800 hover:bg-slate-700 text-slate-200"
                  onClick={() => {
                    setShowMaintenanceModal(false);
                    setSelectedEqId(null);
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
    </div>
  );
}
