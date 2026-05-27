import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Input from '../components/Input.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningCircle, ShieldCheck } from '@phosphor-icons/react';

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
    <div className="min-h-screen flex items-center justify-center bg-dark-900 relative overflow-hidden">
      {/* Dynamic Backgrounds */}
      <div className="absolute inset-0 opacity-20 grid-bg" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] animate-[float_8s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md px-6 z-10"
      >
        <div className="glass-card-primary p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 border border-senac-orange/30 flex items-center justify-center shadow-[0_0_15px_rgba(244,121,32,0.3)]">
                <span className="text-2xl font-black text-white uppercase">S</span>
              </div>
            </div>
            <div>
              <p className="text-xl font-black tracking-widest text-slate-100 uppercase">Senac</p>
              <p className="text-[10px] text-senac-orange tracking-[0.2em] uppercase mt-1 font-semibold">Sistema Renove</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input 
              label="E-mail Institucional" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu.email@senac.br" 
              required 
            />
            <Input 
              label="Senha de Acesso" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••" 
              required 
            />
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }} 
                  animate={{ opacity: 1, height: 'auto', y: 0 }} 
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-red-950/40 border border-red-800/50 rounded-lg overflow-hidden"
                >
                  <div className="px-3 py-2.5 flex items-start gap-2">
                    <WarningCircle weight="fill" className="text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-400 font-medium leading-relaxed">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <Button type="submit" variant="primary" className="w-full py-3.5 text-sm tracking-wider uppercase font-bold" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
                    Autenticando...
                  </span>
                ) : 'Entrar no Sistema'}
              </Button>
            </div>
          </form>

          <div className="mt-8 pt-5 border-t border-dark-600/50 flex flex-col items-center gap-2">
            <p className="text-[10px] text-center text-slate-500 tracking-wider">SECURE CONNECTION • V2.0.0</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

