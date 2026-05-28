import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import {
  listarMaquinasDisponiveisAluno,
  listarSolicitacoes,
  aprovarSolicitacao,
  negarSolicitacao,
  alterarEquipamentoSolicitacao
} from '../services/solicitacoesService';

export default function Solicitacoes() {
  const { user } = useAuth();

  if (!user) return null;

  const isAluno = user.role === 'aluno';
  const isProfessorOuTi = user.role === 'professor' || user.role === 'ti';

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Solicitações de Notebooks</h1>
        <p className="text-sm text-slate-400">
          {isAluno
            ? 'Veja as máquinas disponíveis liberadas pelo seu professor e o status da sua solicitação.'
            : 'Gerencie a fila de solicitações dos alunos, aprovando, negando ou ajustando o ID do equipamento.'}
        </p>
      </header>

      {isAluno && <ListaMaquinasAluno />}
      {isProfessorOuTi && <TabelaSolicitacoesGestor />}
    </div>
  );
}

function ListaMaquinasAluno() {
  const [selecionada, setSelecionada] = useState(null);
  const [maquinas, setMaquinas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await listarMaquinasDisponiveisAluno();
        setMaquinas(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Não foi possível carregar as máquinas disponíveis. Verifique a API.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading && (
          <p className="text-xs text-slate-400 md:col-span-3">
            Carregando máquinas disponíveis...
          </p>
        )}

        {!loading &&
          maquinas.map((maq) => (
            <button
              key={maq.id}
              onClick={() => setSelecionada(maq.id)}
              className={`text-left glass-card p-3 text-sm hover:border-primary transition-colors ${
                selecionada === maq.id
                  ? 'border-primary'
                  : 'border-dark-600/50'
              }`}
            >
              <p className="font-mono text-xs mb-1">{maq.id}</p>
              <p className="text-[11px] text-emerald-300">{maq.status}</p>
            </button>
          ))}

        {!loading && maquinas.length === 0 && !error && (
          <p className="text-xs text-slate-400 md:col-span-3">
            Nenhuma máquina disponível no momento.
          </p>
        )}
      </div>

      {selecionada && (
        <div className="glass-card p-4 text-xs text-slate-350">
          <p>
            Máquina selecionada:{' '}
            <span className="font-mono text-primary">{selecionada}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function TabelaSolicitacoesGestor() {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promptAlterarId, setPromptAlterarId] = useState(null);
  const [promptNovoIdVal, setPromptNovoIdVal] = useState('');

  async function carregar() {
    try {
      setLoading(true);
      setError('');
      const data = await listarSolicitacoes();
      setSolicitacoes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Não foi possível carregar as solicitações. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  async function handleAcao(tipo, id) {
    try {
      if (tipo === 'aprovar') {
        await aprovarSolicitacao(id);
      } else if (tipo === 'negar') {
        await negarSolicitacao(id);
      } else if (tipo === 'alterar-id') {
        setPromptAlterarId(id);
        setPromptNovoIdVal('');
        return;
      }
      await carregar();
    } catch (err) {
      setError('Não foi possível atualizar a solicitação. Verifique a API.');
    }
  }

  async function executeAlterarId(e) {
    e.preventDefault();
    if (!promptAlterarId || !promptNovoIdVal.trim()) return;
    const id = promptAlterarId;
    const novoId = promptNovoIdVal.trim();
    setPromptAlterarId(null);
    setPromptNovoIdVal('');
    try {
      setLoading(true);
      setError('');
      await alterarEquipamentoSolicitacao(id, novoId);
      await carregar();
    } catch (err) {
      setError('Não foi possível atualizar a solicitação. Verifique a API.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="tech-table-header">
            <tr>
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Aluno</th>
              <th className="text-left px-3 py-2">Turma</th>
              <th className="text-left px-3 py-2">Professor</th>
              <th className="text-left px-3 py-2">Equipamento</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-right px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Carregando solicitações...
                </td>
              </tr>
            )}

            {!loading &&
              solicitacoes.map((sol) => (
                <tr
                  key={sol.id}
                  className="tech-table-row"
                >
                  <td className="px-3 py-2 font-mono text-xs">{sol.id}</td>
                  <td className="px-3 py-2 text-xs">{sol.aluno}</td>
                  <td className="px-3 py-2 text-xs text-slate-300">{sol.turma}</td>
                  <td className="px-3 py-2 text-xs text-slate-300">
                    {sol.professor}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {sol.equipamentoId ? (
                      <span className="font-mono">{sol.equipamentoId}</span>
                    ) : (
                      <span className="text-slate-500">A definir</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <span
                      className={`px-2 py-1 rounded-full text-[11px] ${
                        sol.status === 'Aprovada'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                          : sol.status === 'Negada'
                          ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                          : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                      }`}
                    >
                      {sol.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-[11px]"
                        onClick={() => handleAcao('aprovar', sol.id)}
                      >
                        Aprovar
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-[11px]"
                        onClick={() => handleAcao('negar', sol.id)}
                      >
                        Negar
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-[11px]"
                        onClick={() => handleAcao('alterar-id', sol.id)}
                      >
                        Alterar ID
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

            {!loading && solicitacoes.length === 0 && !error && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Custom Prompt Modal for altering Equipment ID */}
      <AnimatePresence>
        {promptAlterarId && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-dark-900 border border-dark-600 rounded-xl p-6 w-full max-w-sm shadow-2xl relative mx-4"
            >
              <h3 className="text-base font-bold text-slate-100 mb-2">
                Alterar ID do Equipamento
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Informe o novo número de patrimônio (ID) para a solicitação #{promptAlterarId}:
              </p>
              <form onSubmit={executeAlterarId} className="space-y-4">
                <input
                  type="text"
                  placeholder="Ex: 21491"
                  value={promptNovoIdVal}
                  onChange={(e) => setPromptNovoIdVal(e.target.value)}
                  className="tech-input w-full"
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 text-xs py-2 bg-dark-800 hover:bg-dark-700 text-slate-200"
                    onClick={() => { setPromptAlterarId(null); setPromptNovoIdVal(''); }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    variant="cyan"
                    className="flex-1 text-xs py-2"
                  >
                    Confirmar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

