import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../services/api';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { listarTurmas } from '../services/turmasService';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, ShieldCheck, MagnifyingGlass, Plus, LockKey, Eye, EyeSlash, Warning } from '@phosphor-icons/react';

export default function Usuarios() {
  const { user } = useAuth();

  // Guard: somente TI acessa esta página
  if (!user || user.role !== 'ti') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-sm">
          <Warning weight="fill" className="text-red-400 text-4xl mx-auto mb-3" />
          <h2 className="text-slate-100 font-bold mb-2">Acesso Restrito</h2>
          <p className="text-sm text-slate-400">Esta área é exclusiva para a equipe de TI.</p>
        </div>
      </div>
    );
  }

  return <UsuariosPanel />;
}

function UsuariosPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('lista');
  const [usuarios, setUsuarios] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Formulário de cadastro
  const [form, setForm] = useState({
    matricula: '', nome: '', email: '', role: 'aluno',
    curso: '', turma: '', senha: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  // Reset de senha
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Exclusão de usuário
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [usersRes, turmasRes] = await Promise.all([
        api.get('/usuarios'),
        listarTurmas()
      ]);
      setUsuarios(Array.isArray(usersRes.data) ? usersRes.data : []);
      setTurmas(Array.isArray(turmasRes) ? turmasRes : []);
    } catch (err) {
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'role' && value !== 'aluno') updated.turma = '';
      return updated;
    });
  }

  const emailDomainValid = (() => {
    if (!form.email) return true;
    const emailLower = form.email.trim().toLowerCase();
    if (form.role === 'ti' || form.role === 'professor') return emailLower.endsWith('@df.senac.br');
    if (form.role === 'aluno') return emailLower.endsWith('@edu.df.senac.br');
    return true;
  })();

  const expectedDomainLabel = form.role === 'aluno' ? '@edu.df.senac.br' : '@df.senac.br';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!emailDomainValid) {
      setError(`E-mail deve terminar com ${expectedDomainLabel} para este perfil.`);
      return;
    }
    if (form.role === 'aluno' && !form.turma) {
      setError('Seleção de turma é obrigatória para Alunos.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/usuarios', form);
      setSuccess('Usuário cadastrado com sucesso!');
      setForm({ matricula: '', nome: '', email: '', role: 'aluno', curso: '', turma: '', senha: '' });
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao cadastrar usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    try {
      setResetLoading(true);
      setError('');
      await api.patch(`/usuarios/${resetUser.id}/senha`, { nova_senha: newPassword });
      setSuccess(`Senha de ${resetUser.nome} redefinida com sucesso!`);
      setResetUser(null);
      setNewPassword('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao redefinir senha.');
    } finally {
      setResetLoading(false);
    }
  }

  async function handleDeleteUser(e) {
    e.preventDefault();
    if (!deleteUser) return;
    try {
      setDeleteLoading(true);
      setError('');
      setSuccess('');
      await api.delete(`/usuarios/${deleteUser.id}`);
      setSuccess(`Usuário ${deleteUser.nome} excluído com sucesso!`);
      setDeleteUser(null);
      await loadData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao excluir usuário.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const roleColors = {
    ti: 'bg-red-500/10 text-red-400 border border-red-500/20',
    professor: 'bg-primary/10 text-primary border border-primary/20',
    aluno: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
  };

  const roleLabels = { ti: 'TI', professor: 'Professor', aluno: 'Aluno' };

  const filteredUsuarios = usuarios.filter(u =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="rounded-2xl border border-dark-600 bg-dark-800/40 backdrop-blur-xl p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users weight="duotone" className="text-primary text-xl" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 font-semibold">Gestão Exclusiva TI</div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">Controle de Usuários</h1>
          </div>
          <div className="ml-auto">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-semibold">
              <ShieldCheck weight="fill" />
              Acesso TI Verificado
            </span>
          </div>
        </div>
      </header>

      {/* Alerts */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-red-950/30 border border-red-800/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <Warning weight="fill" className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </motion.div>
        )}
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-4 py-3 flex items-center gap-3">
            <p className="text-sm text-emerald-400">{success}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-600/50 pb-0">
        {[{id: 'lista', label: 'Lista de Usuários'}, {id: 'cadastro', label: 'Cadastrar Novo'}].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setError(''); setSuccess(''); }}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary bg-primary/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Lista */}
      <AnimatePresence mode="wait">
        {activeTab === 'lista' && (
          <motion.div key="lista" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Search */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm" />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail, matrícula ou cargo..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="tech-input w-full pl-9"
                />
              </div>
              <Button onClick={() => setActiveTab('cadastro')} className="flex items-center gap-2 text-xs py-2">
                <Plus weight="bold" /> Novo Usuário
              </Button>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="tech-table-header">
                    <tr>
                      <th className="text-left px-5 py-3">Nome</th>
                      <th className="text-left px-5 py-3">Matrícula</th>
                      <th className="text-left px-5 py-3">E-mail</th>
                      <th className="text-center px-5 py-3">Perfil</th>
                      <th className="text-center px-5 py-3">Turma</th>
                      <th className="text-center px-5 py-3">Status</th>
                      <th className="text-center px-5 py-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">Carregando...</td></tr>
                    )}
                    {!loading && filteredUsuarios.map(u => (
                      <tr key={u.id} className="tech-table-row">
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-semibold text-slate-100">{u.nome}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-mono text-xs text-slate-400">{u.matricula || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs text-slate-300">{u.email}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${roleColors[u.role]}`}>
                            {roleLabels[u.role] || u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="font-mono text-xs text-slate-400">{u.turma || '—'}</span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.ativo ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {u.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => { setResetUser(u); setNewPassword(''); setError(''); }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all"
                              title="Redefinir Senha"
                            >
                              <LockKey weight="fill" size={13} />
                              Senha
                            </button>
                            {u.id !== user.id && (
                              <button
                                onClick={() => { setDeleteUser(u); setError(''); setSuccess(''); }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                                title="Excluir Usuário"
                              >
                                <Warning weight="fill" size={13} />
                                Excluir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && filteredUsuarios.length === 0 && (
                      <tr><td colSpan={7} className="px-5 py-10 text-center text-xs text-slate-500">Nenhum usuário encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-dark-600/50 text-[11px] text-slate-500">
                {filteredUsuarios.length} de {usuarios.length} usuário(s)
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab: Cadastro */}
        {activeTab === 'cadastro' && (
          <motion.div key="cadastro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5 max-w-2xl">
              <h2 className="text-sm font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
                <Plus weight="bold" className="text-primary" />
                Cadastrar Novo Usuário
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Matrícula / Registro" name="matricula" value={form.matricula}
                  onChange={handleChange} placeholder="Ex: 20261234" required />
                <Input label="Nome Completo" name="nome" value={form.nome}
                  onChange={handleChange} placeholder="Ex: Alysson Santos" required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-slate-400">Perfil (Cargo)</span>
                  <select name="role" value={form.role} onChange={handleChange}
                    className="tech-select text-xs" required>
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="ti">TI</option>
                  </select>
                </label>

                <div className="flex flex-col gap-1">
                  <Input label="E-mail Institucional" name="email" type="email" value={form.email}
                    onChange={handleChange} placeholder={`Ex: nome${expectedDomainLabel}`} required />
                  {form.email && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${emailDomainValid ? 'bg-emerald-500' : 'bg-red-400 animate-pulse'}`} />
                      <span className={`text-[10px] font-mono ${emailDomainValid ? 'text-emerald-400' : 'text-red-400'}`}>
                        {emailDomainValid ? `✓ Domínio ${expectedDomainLabel} válido` : `✗ Deve terminar com ${expectedDomainLabel}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {form.role === 'aluno' ? (
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs text-slate-400">Turma <span className="text-red-400">*</span></span>
                    <select name="turma" value={form.turma} onChange={handleChange}
                      className="tech-select text-xs" required>
                      <option value="">Selecione uma turma</option>
                      {turmas.map(t => (
                        <option key={t.id} value={t.id}>{t.id} — {t.curso}</option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <Input label="Curso Vinculado" name="curso" value={form.curso}
                    onChange={handleChange} placeholder="Ex: Técnico em Sistemas" />
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-400">Senha de Acesso</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="senha"
                      value={form.senha}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="tech-input w-full pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                      {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <Button type="submit" className="flex-1 py-2.5" disabled={loading || !emailDomainValid}>
                  {loading ? 'Cadastrando...' : 'Criar Conta de Usuário'}
                </Button>
                <Button type="button" onClick={() => setActiveTab('lista')} className="px-6 py-2.5 bg-dark-700/50 text-slate-300 border border-dark-600 hover:border-primary/30">
                  Cancelar
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Reset de Senha */}
      <AnimatePresence>
        {resetUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setResetUser(null); setNewPassword(''); }}}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card-primary p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-5">
                <LockKey weight="duotone" className="text-primary text-2xl" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">Redefinir Senha</h3>
                  <p className="text-xs text-slate-400">{resetUser.nome} ({resetUser.email})</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mín. 6 caracteres)"
                    className="tech-input w-full pr-10"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    {showPassword ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button type="submit" className="flex-1 py-2" disabled={resetLoading}>
                    {resetLoading ? 'Salvando...' : 'Confirmar Redefinição'}
                  </Button>
                  <Button type="button" onClick={() => { setResetUser(null); setNewPassword(''); }}
                    className="px-5 py-2 bg-dark-700/50 text-slate-300 border border-dark-600">
                    Cancelar
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Exclusão de Usuário */}
      <AnimatePresence>
        {deleteUser && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setDeleteUser(null); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card border border-red-500/30 p-6 w-full max-w-md text-center"
            >
              <div className="h-12 w-12 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4 text-red-400 text-2xl">
                <Warning weight="fill" />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-2">Excluir Usuário</h3>
              <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                Tem certeza de que deseja excluir permanentemente o usuário <strong className="text-slate-200">{deleteUser.nome}</strong> ({deleteUser.email})? 
                Esta ação liberará notebooks ativos deste usuário e removerá todos os seus empréstimos, histórico e reservas em cascata de forma irreversível.
              </p>
              <form onSubmit={handleDeleteUser} className="flex gap-3">
                <Button type="submit" variant="danger" className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white border border-red-500" disabled={deleteLoading}>
                  {deleteLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
                </Button>
                <Button type="button" onClick={() => setDeleteUser(null)}
                  className="flex-1 py-2 bg-dark-700/50 text-slate-300 border border-dark-600 hover:border-primary/20">
                  Cancelar
                </Button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
