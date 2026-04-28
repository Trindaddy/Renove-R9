import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      navigate('/');
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(100,255,218,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(100,255,218,0.3) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-alert/5 rounded-full blur-3xl" />
      <div className="relative w-full max-w-md px-6">
        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="relative">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan/20 to-cyan/5 border border-cyan/30 flex items-center justify-center">
                <span className="text-lg font-black text-cyan font-mono">R9</span>
              </div>
              <div className="absolute -inset-1 rounded-xl bg-cyan/10 blur-lg" />
            </div>
            <div>
              <p className="text-base font-bold tracking-widest text-slate-100 uppercase">Renove <span className="text-cyan">R9</span></p>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Sistema de Gestao de Ativos</p>
            </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">E-mail Institucional</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu.email@senac.br" className="tech-input w-full" required />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-cyan/60 mb-1.5">Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="tech-input w-full" required />
            </div>
            {error && (
              <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-red-400 text-xs">✕</span>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full py-3 text-sm tracking-wider" disabled={loading}>
              {loading ? 'Autenticando...' : 'Entrar no Sistema'}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t border-navy-500/20">
            <p className="text-[10px] text-center text-slate-600 tracking-wider">SENAC • Ambiente de Gestao de Notebooks</p>
          </div>
      </div>
  );
}
