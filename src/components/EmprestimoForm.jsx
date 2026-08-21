import React, { useState } from 'react';
import Button from './Button.jsx';

export default function EmprestimoForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    notebook_patrimonio: '',
    usuario_matricula: '',
    motivo: '',
    horas_previstas: 4
  });
  const [erro, setErro] = useState('');

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErro('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    if (!form.notebook_patrimonio.trim() || !form.usuario_matricula.trim()) {
      setErro('Preencha o patrimônio do notebook e o e-mail do usuário');
      return;
    }

    try {
      await onSubmit({
        notebook_patrimonio: form.notebook_patrimonio.trim(),
        usuario_matricula: form.usuario_matricula.trim(),
        motivo: form.motivo.trim() || undefined,
        horas_previstas: parseInt(form.horas_previstas) || 4
      });
      setForm({
        notebook_patrimonio: '',
        usuario_matricula: '',
        motivo: '',
        horas_previstas: 4
      });
    } catch (err) {
      setErro(err.response?.data?.detail || 'Erro ao realizar empréstimo');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-alert/30 to-transparent" />
        <h2 className="text-sm font-bold tracking-[0.15em] text-alert uppercase">
          Novo Empréstimo Rápido
        </h2>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-alert/30 to-transparent" />
      </div>

      {erro && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
          <p className="text-xs text-red-400">{erro}</p>
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">
            Patrimônio do Notebook
          </label>
          <input
            type="text"
            name="notebook_patrimonio"
            placeholder="Ex: 29673"
            value={form.notebook_patrimonio}
            onChange={handleChange}
            className="tech-input w-full font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">
            E-mail do Aluno/Servidor
          </label>
          <input
            type="text"
            name="usuario_matricula"
            placeholder="Ex: nome@edu.df.senac.br"
            value={form.usuario_matricula}
            onChange={handleChange}
            className="tech-input w-full font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">
            Motivo (opcional)
          </label>
          <input
            type="text"
            name="motivo"
            placeholder="Ex: Aula de Programação"
            value={form.motivo}
            onChange={handleChange}
            className="tech-input w-full"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">
            Horas Previstas
          </label>
          <input
            type="number"
            name="horas_previstas"
            min={1}
            max={72}
            value={form.horas_previstas}
            onChange={handleChange}
            className="tech-input w-full font-mono"
          />
        </div>
      </div>

      <Button type="submit" className="w-full mt-2 py-3 text-sm tracking-wider" disabled={loading}>
        {loading ? 'Processando...' : 'Confirmar Retirada'}
      </Button>
    </form>
  );
}

