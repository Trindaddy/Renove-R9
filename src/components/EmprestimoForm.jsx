import React, { useState } from 'react';
import Input from './Input.jsx';
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
      setErro('Preencha o patrimônio do notebook e a matrícula do aluno');
      return;
    }

    try {
      await onSubmit({
        notebook_patrimonio: form.notebook_patrimonio.trim(),
        usuario_matricula: form.usuario_matricula.trim(),
        motivo: form.motivo.trim() || undefined,
        horas_previstas: parseInt(form.horas_previstas) || 4
      });
      // Limpar formulário após sucesso
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-200 mb-1">
        Empréstimo Rápido
      </h2>

      {erro && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
          {erro}
        </p>
      )}

      <Input
        label="Patrimônio do Notebook"
        name="notebook_patrimonio"
        placeholder="Ex: NB-001"
        value={form.notebook_patrimonio}
        onChange={handleChange}
        required
      />

      <Input
        label="Matrícula do Aluno"
        name="usuario_matricula"
        placeholder="Ex: ALU001"
        value={form.usuario_matricula}
        onChange={handleChange}
        required
      />

      <Input
        label="Motivo (opcional)"
        name="motivo"
        placeholder="Ex: Aula de Programação"
        value={form.motivo}
        onChange={handleChange}
      />

      <Input
        label="Horas Previstas"
        name="horas_previstas"
        type="number"
        min={1}
        max={72}
        value={form.horas_previstas}
        onChange={handleChange}
      />

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Processando...' : '✅ Confirmar Empréstimo'}
      </Button>
    </form>
  );
}

