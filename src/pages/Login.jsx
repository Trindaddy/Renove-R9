import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const result = login(email, password);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    navigate('/');
  }

  if (isAuthenticated) {
    navigate('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-xl p-8 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-senac-orange flex items-center justify-center text-sm font-black text-slate-950">
            R9
          </div>
          <div>
            <p className="text-sm font-semibold">R9 - Gestão de Notebooks</p>
            <p className="text-xs text-slate-400">Senac | Ambiente de Login</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-mail institucional"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu.email@senac.br"
          />

          <Input
            label="Senha"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900 rounded px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full mt-2">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
}

