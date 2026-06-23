import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { definirSenhaDefinitivaPrimeiroAcesso } from '../services/authService';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';
import { ShieldCheck, Eye, EyeSlash, Check, X, Lock } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

export default function ChangePasswordForm() {
  const { user, login } = useAuth(); // Usado para acessar dados e re-autenticar se necessário
  
  // Como o usuário já está pré-autenticado pelo AuthContext com primeiro_acesso = true,
  // nós sabemos quem ele é.
  const email = user?.email || '';

  const [senhaPadrao, setSenhaPadrao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [showSenhaPadrao, setShowSenhaPadrao] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Estados de Validação Dinâmica
  const [validation, setValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
    match: false,
  });

  useEffect(() => {
    setValidation({
      length: novaSenha.length >= 8,
      uppercase: /[A-Z]/.test(novaSenha),
      lowercase: /[a-z]/.test(novaSenha),
      number: /\d/.test(novaSenha),
      special: /[@$!%*?&]/.test(novaSenha),
      match: novaSenha === confirmarSenha && novaSenha !== '',
    });
  }, [novaSenha, confirmarSenha]);

  const isValid = Object.values(validation).every(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid) {
      setError('A senha não cumpre todos os requisitos de segurança exigidos.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await definirSenhaDefinitivaPrimeiroAcesso(email, senhaPadrao, novaSenha, confirmarSenha);
      setSuccess(true);
      
      // Forçar atualização do token e dados do usuário re-logando-o com a nova senha
      // Isso irá atualizar a flag 'primeiro_acesso' para false no backend e frontend
      setTimeout(async () => {
        const res = await login(email, novaSenha);
        if (!res.ok) {
          // Se falhar o relogin automático por algum motivo de rede, redireciona ao login tradicional
          window.location.href = '/login?changed=true';
        }
      }, 1500);

    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Erro ao definir senha definitiva. Verifique se a senha padrão/atual está correta.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full relative group"
      >
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/30 to-accent/30 blur-xl opacity-70" />
        
        <div className="relative bg-dark-900/70 border border-dark-600/40 backdrop-blur-xl p-8 rounded-2xl">
          
          <div className="text-center mb-8">
            <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4">
              <Lock className="w-6 h-6" weight="duotone" />
            </div>
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
              Primeiro Acesso
            </h2>
            <p className="text-xs text-slate-400 mt-2">
              Por segurança, altere a sua senha temporária para uma senha forte definitiva antes de prosseguir.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
              <span className="font-bold uppercase tracking-wider block shrink-0 mt-0.5">Erro:</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 shrink-0" weight="duotone" />
              <div>
                <p className="font-bold">Senha alterada com sucesso!</p>
                <p className="text-[10px] text-emerald-500/80">Inicializando ambiente seguro...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Input
                label="E-mail"
                type="email"
                value={email}
                disabled
                className="tech-input w-full opacity-60 cursor-not-allowed bg-dark-800"
              />
            </div>

            <div className="relative">
              <Input
                label="Senha Temporária Atual"
                type={showSenhaPadrao ? 'text' : 'password'}
                name="senhaPadrao"
                value={senhaPadrao}
                onChange={(e) => setSenhaPadrao(e.target.value)}
                required
                placeholder="Insira a senha usada para logar"
              />
              <button
                type="button"
                onClick={() => setShowSenhaPadrao(!showSenhaPadrao)}
                className="absolute right-3 top-8.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showSenhaPadrao ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Nova Senha Forte"
                type={showNovaSenha ? 'text' : 'password'}
                name="novaSenha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                placeholder="Insira sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowNovaSenha(!showNovaSenha)}
                className="absolute right-3 top-8.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showNovaSenha ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="relative">
              <Input
                label="Confirmar Nova Senha"
                type={showConfirmarSenha ? 'text' : 'password'}
                name="confirmarSenha"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                placeholder="Repita a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                className="absolute right-3 top-8.5 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showConfirmarSenha ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Checklist de Validação */}
            <div className="p-4 rounded-xl bg-dark-950/50 border border-dark-600/30 space-y-2.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Requisitos da Senha
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  {validation.length ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.length ? 'text-slate-300' : 'text-slate-500'}>
                    Mínimo 8 caracteres
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {validation.uppercase ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.uppercase ? 'text-slate-300' : 'text-slate-500'}>
                    Letra Maiúscula
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {validation.lowercase ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.lowercase ? 'text-slate-300' : 'text-slate-500'}>
                    Letra Minúscula
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {validation.number ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.number ? 'text-slate-300' : 'text-slate-500'}>
                    Pelo menos um número
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {validation.special ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.special ? 'text-slate-300' : 'text-slate-500'}>
                    Caractere especial (@$!%*?&)
                  </span>
                </div>

                <div className="flex items-center gap-2 col-span-1 sm:col-span-2">
                  {validation.match ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={validation.match ? 'text-slate-300' : 'text-slate-500'}>
                    Senhas coincidem
                  </span>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!isValid || loading || success}
              className="w-full py-3.5 uppercase tracking-wider text-xs shadow-lg shadow-primary/20"
            >
              {loading ? 'Processando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
