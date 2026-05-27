import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listarEquipamentos, atualizarEquipamento } from '../services/equipamentosService';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningCircle, Archive, Laptop } from '@phosphor-icons/react';

export default function Equipamentos() {
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  async function handleToggleManutencao(id, novoStatus) {
    try {
      setLoading(true);
      setError('');
      await atualizarEquipamento(id, { status: novoStatus });
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
        <div className="w-full md:w-72">
          <Input
            label="Buscar por ID/Patrimônio"
            placeholder="Ex: NB-001"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
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

      <div className="glass-card overflow-hidden">
        {/* Table layout para Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="tech-table-header">
              <tr>
                <th className="text-left px-5 py-3 font-mono">ID</th>
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
                  <td colSpan={6} className="px-5 py-8 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-75" />
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150" />
                      <span className="text-xs text-slate-500 ml-2">Sincronizando...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filtrados.map((eq) => {
                const isEmprestadoOuUso = eq.status === 'Emprestado' || eq.status === 'Em uso';
                return (
                  <tr key={eq.id} className="tech-table-row group">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-400">#{eq.id?.toString().padStart(4, '0')}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-primary/80">{eq.patrimonio}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-200">{eq.modelo}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{eq.local}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={eq.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {eq.status === 'Disponível' && (
                        <Button
                          variant="danger"
                          className="px-2.5 py-1 text-[11px] opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleToggleManutencao(eq.id, 'Manutenção')}
                        >
                          Enviar Manutenção
                        </Button>
                      )}
                      {eq.status === 'Manutenção' && (
                        <Button
                          variant="success"
                          className="px-2.5 py-1 text-[11px]"
                          onClick={() => handleToggleManutencao(eq.id, 'Disponível')}
                        >
                          Concluir Manutenção
                        </Button>
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
                  <td colSpan={6} className="px-5 py-10 text-center">
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

          {!loading && filtrados.map((eq) => {
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
                  <div>
                    <div className="font-mono text-xs text-primary/80">{eq.patrimonio}</div>
                    <div className="text-sm font-bold text-slate-200">{eq.modelo}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-dark-600/50 pt-3">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">ID</span>
                    <span className="font-mono text-slate-300">#{eq.id?.toString().padStart(4, '0')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Local</span>
                    <span className="text-slate-300">{eq.local}</span>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  {eq.status === 'Disponível' && (
                    <Button variant="danger" className="w-full text-[11px] py-2" onClick={() => handleToggleManutencao(eq.id, 'Manutenção')}>
                      Enviar para Manutenção
                    </Button>
                  )}
                  {eq.status === 'Manutenção' && (
                    <Button variant="success" className="w-full text-[11px] py-2" onClick={() => handleToggleManutencao(eq.id, 'Disponível')}>
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
      </div>
    </motion.div>
  );
}


