import React, { useEffect, useState } from 'react';
import Input from '../components/Input.jsx';
import { listarEquipamentos } from '../services/equipamentosService';
import { EquipmentStatus, EquipmentStatusLabel } from '../enums/EquipmentStatus';

export default function Equipamentos() {
  const [busca, setBusca] = useState('');
  const [equipamentos, setEquipamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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

    load();
  }, []);

  const filtrados = equipamentos.filter((eq) =>
    eq.id?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Inventário de Equipamentos</h1>
          <p className="text-sm text-slate-400">
            Visão completa do parque de notebooks. Acesso restrito à equipe de TI.
          </p>
        </div>
        <div className="w-60">
          <Input
            label="Buscar por ID"
            placeholder="Ex: NB-001"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
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
              <th className="text-left px-3 py-2">ID</th>
              <th className="text-left px-3 py-2">Modelo</th>
              <th className="text-left px-3 py-2">Local</th>
              <th className="text-left px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Carregando equipamentos...
                </td>
              </tr>
            )}

            {!loading &&
              filtrados.map((eq) => (
              <tr
                key={eq.id}
                className="border-t border-slate-800/80 hover:bg-slate-800/40"
              >
                <td className="px-3 py-2 font-mono text-xs">{eq.id}</td>
                <td className="px-3 py-2">{eq.modelo}</td>
                <td className="px-3 py-2 text-xs text-slate-300">{eq.local}</td>
                <td className="px-3 py-2 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full text-[11px] ${
                      eq.status === 'Disponível'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                        : eq.status === 'Em uso'
                        ? 'bg-senac-orange/10 text-senac-orange border border-senac-orange/40'
                        : eq.status === 'Manutenção'
                        ? 'bg-red-500/10 text-red-300 border border-red-500/40'
                        : 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/40'
                    }`}
                  >
                    {eq.status}
                  </span>
                </td>
              </tr>
            ))}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-center text-xs text-slate-400"
                >
                  Nenhum equipamento encontrado para o filtro informado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

