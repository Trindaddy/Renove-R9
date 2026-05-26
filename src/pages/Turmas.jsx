import React, { useEffect, useState } from 'react';
import { listarTurmas } from '../services/turmasService';

export default function Turmas() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await listarTurmas();
        setTurmas(Array.isArray(data) ? data : []);
      } catch (err) {
        setError('Não foi possível carregar as turmas. Verifique a API.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-semibold">Turmas</h1>
        <p className="text-sm text-slate-400">
          Lista de turmas vinculadas a reservas de notebooks. Acesso para Professores e TI.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {error}
        </p>
      )}

      <div className="bg-slate-900/70 border border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/90 text-xs uppercase text-slate-400">
            <tr>
              <th className="text-left px-3 py-2">ID (Turma)</th>
              <th className="text-left px-3 py-2">Curso</th>
              <th className="text-left px-3 py-2">Instrutor</th>
              <th className="text-left px-3 py-2">Turno</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Carregando turmas...
                </td>
              </tr>
            )}

            {!loading &&
              turmas.map((turma) => (
                <tr
                  key={turma.id}
                  className="border-t border-slate-800/80 hover:bg-slate-800/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">{turma.id}</td>
                  <td className="px-3 py-2">{turma.curso}</td>
                  <td className="px-3 py-2 text-xs text-slate-300 font-semibold text-alert">{turma.instrutor}</td>
                  <td className="px-3 py-2 text-xs text-slate-300">{turma.turno}</td>
                </tr>
              ))}

            {!loading && turmas.length === 0 && !error && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Nenhuma turma encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


