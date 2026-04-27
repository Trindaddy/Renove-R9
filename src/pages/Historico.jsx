import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import { getHistorico, listarNotebooks } from '../services/emprestimosService';

export default function Historico() {
  const [historico, setHistorico] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notebookSelecionado, setNotebookSelecionado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadNotebooks() {
      try {
        const data = await listarNotebooks();
        setNotebooks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erro ao carregar notebooks:', err);
      }
    }
    loadNotebooks();
  }, []);

  useEffect(() => {
    async function loadHistorico() {
      try {
        setLoading(true);
        setError('');
        const id = notebookSelecionado ? parseInt(notebookSelecionado) : undefined;
        const data = await getHistorico(id);
        setHistorico(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Erro ao carregar histórico');
      } finally {
        setLoading(false);
      }
    }
    loadHistorico();
  }, [notebookSelecionado]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Histórico de Movimentações</h1>
        <p className="text-sm text-slate-400">
          Log completo de todas as movimentações dos equipamentos.
        </p>
      </header>

      <div className="w-72">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-slate-300">Filtrar por Notebook</span>
          <select
            value={notebookSelecionado}
            onChange={(e) => setNotebookSelecionado(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-senac-orange"
          >
            <option value="">Todos os notebooks</option>
            {notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>
                {nb.patrimonio} - {nb.modelo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">Data</th>
              <th className="text-left px-3 py-2">Notebook</th>
              <th className="text-left px-3 py-2">Tipo</th>
              <th className="text-left px-3 py-2">Status Anterior</th>
              <th className="text-left px-3 py-2">Status Novo</th>
              <th className="text-left px-3 py-2">Descrição</th>
              <th className="text-left px-3 py-2">Usuário</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                  Carregando histórico...
                </td>
              </tr>
            )}

            {!loading && historico.map((h) => (
              <tr key={h.id} className="border-t border-slate-800/80 hover:bg-slate-800/40">
                <td className="px-3 py-2 text-xs text-slate-400">
                  {new Date(h.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-3 py-2 text-xs font-mono">
                  {h.notebook?.patrimonio || `#${h.notebook_id}`}
                </td>
                <td className="px-3 py-2 text-xs">
                  <TipoBadge tipo={h.tipo_movimentacao} />
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {h.status_anterior || '-'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {h.status_novo || '-'}
                </td>
                <td className="px-3 py-2 text-xs max-w-xs truncate" title={h.descricao}>
                  {h.descricao || '-'}
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {h.usuario?.nome || '-'}
                </td>
              </tr>
            ))}

            {!loading && historico.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-4 text-center text-xs text-slate-400">
                  Nenhum registro no histórico.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TipoBadge({ tipo }) {
  const cores = {
    'EMPRESTIMO': 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40',
    'DEVOLUCAO': 'bg-blue-500/10 text-blue-300 border border-blue-500/40',
    'MANUTENCAO_ENTRADA': 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40',
    'MANUTENCAO_SAIDA': 'bg-orange-500/10 text-orange-300 border border-orange-500/40',
    'RESERVA': 'bg-purple-500/10 text-purple-300 border border-purple-500/40',
    'CANCELAMENTO': 'bg-red-500/10 text-red-300 border border-red-500/40',
    'CADASTRO': 'bg-slate-500/10 text-slate-300 border border-slate-500/40',
    'ATUALIZACAO': 'bg-slate-500/10 text-slate-300 border border-slate-500/40',
    'ALERTA_ESCASSEZ': 'bg-red-500/10 text-red-300 border border-red-500/40'
  };

  const labels = {
    'EMPRESTIMO': 'Empréstimo',
    'DEVOLUCAO': 'Devolução',
    'MANUTENCAO_ENTRADA': 'Manutenção (Entrada)',
    'MANUTENCAO_SAIDA': 'Manutenção (Saída)',
    'RESERVA': 'Reserva',
    'CANCELAMENTO': 'Cancelamento',
    'CADASTRO': 'Cadastro',
    'ATUALIZACAO': 'Atualização',
    'ALERTA_ESCASSEZ': 'Alerta Escassez'
  };

  return (
    <span className={`px-2 py-1 rounded-full text-[11px] ${cores[tipo] || cores['CADASTRO']}`}>
      {labels[tipo] || tipo}
    </span>
  );
}

