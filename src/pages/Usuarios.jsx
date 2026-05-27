import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarTurmas } from '../services/turmasService';

export default function Usuarios() {
  const [form, setForm] = useState({
    matricula: '',
    nome: '',
    email: '',
    role: 'aluno',
    curso: '',
    turma: '',
    senha: ''
  });

  const [searchMatricula, setSearchMatricula] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function loadTurmas() {
      try {
        const response = await listarTurmas();
        setTurmas(Array.isArray(response) ? response : []);
      } catch (err) {
        console.error('Erro ao carregar turmas:', err);
      }
    }
    loadTurmas();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // Visual domain validation
  const emailDomainValid = (() => {
    if (!form.email) return true;
    const emailLower = form.email.trim().toLowerCase();
    if (form.role === 'ti' || form.role === 'professor') {
      return emailLower.endsWith('@df.senac.br');
    } else if (form.role === 'aluno') {
      return emailLower.endsWith('@edu.df.senac.br');
    }
    return true;
  })();

  const expectedDomainLabel = form.role === 'aluno' ? '@edu.df.senac.br' : '@df.senac.br';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailDomainValid) {
      setError(`Domínio de e-mail inválido para o cargo selecionado. Aluno exige ${expectedDomainLabel}, TI/Professor exige @df.senac.br.`);
      return;
    }

    try {
      setLoading(true);
      await api.post('/usuarios', form);
      setSuccess('Usuário cadastrado com sucesso!');
      setForm({
        matricula: '',
        nome: '',
        email: '',
        role: 'aluno',
        curso: '',
        turma: '',
        senha: ''
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    setSearchError('');
    setSearchedUser(null);
    if (!searchMatricula.trim()) return;

    try {
      setSearchLoading(true);
      const response = await api.get(`/usuarios/matricula/${searchMatricula.trim()}`);
      setSearchedUser(response.data);
    } catch (err) {
      setSearchError(err.response?.data?.detail || 'Usuário não encontrado.');
    } finally {
      setSearchLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.5s_ease-out]">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-navy-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-px w-8 bg-gradient-to-r from-cyan to-transparent" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-cyan/60 font-medium">Administração</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Controle de <span className="text-cyan glow-text-cyan">Usuários</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Cadastre novos usuários com validação de e-mail institucional ou consulte contas existentes.
          </p>
        </div>
      </header>

      {error && (
        <div className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-4 py-3 flex items-center gap-3 animate-[slideIn_0.3s_ease-out]">
          <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-emerald-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column - Registration Form */}
        <div className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="glass-card-alert p-6 scan-line space-y-4">
            <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-2">
              Cadastrar Novo Usuário
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Matrícula / Registro"
                name="matricula"
                value={form.matricula}
                onChange={handleChange}
                placeholder="Ex: 20261234"
                required
              />

              <Input
                label="Nome Completo"
                name="nome"
                value={form.nome}
                onChange={handleChange}
                placeholder="Ex: Caleb Carvalho"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs text-slate-350">Perfil (Cargo)</span>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="tech-select text-xs"
                  required
                >
                  <option value="aluno">Aluno</option>
                  <option value="professor">Professor</option>
                  <option value="ti">TI</option>
                </select>
              </label>

              <div className="flex flex-col gap-1">
                <Input
                  label="E-mail Institucional"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={`Ex: nome${expectedDomainLabel}`}
                  required
                />
                {form.email && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${emailDomainValid ? 'bg-emerald-500' : 'bg-alert animate-pulse'}`} />
                    <span className={`text-[10px] font-mono ${emailDomainValid ? 'text-emerald-450' : 'text-alert'}`}>
                      {emailDomainValid 
                        ? `Domínio institucional ${expectedDomainLabel} verificado.` 
                        : `Atenção: E-mail deve terminar com ${expectedDomainLabel}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {form.role === 'aluno' ? (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-350">Turma</span>
                  <select
                    name="turma"
                    value={form.turma}
                    onChange={handleChange}
                    className="tech-select text-xs"
                    required
                  >
                    <option value="">Selecione uma turma</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.id} - {t.curso}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <Input
                  label="Curso Vinculado (Opcional)"
                  name="curso"
                  value={form.curso}
                  onChange={handleChange}
                  placeholder="Ex: Análise e Desenvolvimento de Sistemas"
                />
              )}

              <Input
                label="Senha de Acesso"
                name="senha"
                type="password"
                value={form.senha}
                onChange={handleChange}
                placeholder="Mínimo de 6 caracteres"
                required
              />
            </div>

            <div className="pt-2">
              <Button type="submit" className="w-full py-2.5" disabled={loading || !emailDomainValid}>
                {loading ? 'Cadastrando...' : 'Criar Conta de Usuário'}
              </Button>
            </div>
          </form>
        </div>

        {/* Right column - Lookup & Search */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase mb-4">
              Consultar Conta
            </h2>
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Pesquise por Matrícula..."
                  value={searchMatricula}
                  onChange={(e) => setSearchMatricula(e.target.value)}
                  className="tech-select text-xs w-full py-2 px-3 bg-slate-900 border border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan focus:border-cyan text-slate-250 font-mono"
                />
              </div>
              <Button type="submit" disabled={searchLoading} className="text-xs py-2 bg-cyan/10 text-cyan border border-cyan/20 hover:bg-cyan/20 px-4">
                Buscar
              </Button>
            </form>

            {searchError && (
              <p className="text-xs text-red-400 mt-2 font-mono">{searchError}</p>
            )}

            {searchedUser && (
              <div className="mt-5 border-t border-navy-500/20 pt-4 space-y-3 animate-[fadeIn_0.3s_ease-out]">
                <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                  <span className="text-xs text-slate-500 font-mono">ID no Banco:</span>
                  <span className="text-xs text-cyan font-mono">#{searchedUser.id}</span>
                </div>
                <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                  <span className="text-xs text-slate-500">Nome:</span>
                  <span className="text-xs text-slate-200 font-bold">{searchedUser.nome}</span>
                </div>
                <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                  <span className="text-xs text-slate-500 font-mono">Matrícula:</span>
                  <span className="text-xs text-slate-200 font-mono">{searchedUser.matricula}</span>
                </div>
                <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                  <span className="text-xs text-slate-500">Cargo:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-cyan/10 text-cyan border border-cyan/15">
                    {searchedUser.role}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                  <span className="text-xs text-slate-500">E-mail:</span>
                  <span className="text-xs text-slate-350 font-mono">{searchedUser.email}</span>
                </div>
                {searchedUser.turma && (
                  <div className="flex items-center justify-between border-b border-navy-500/10 pb-2">
                    <span className="text-xs text-slate-500">Turma:</span>
                    <span className="text-xs text-slate-200 font-mono">{searchedUser.turma}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${searchedUser.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    {searchedUser.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
