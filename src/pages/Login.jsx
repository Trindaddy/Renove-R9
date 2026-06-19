import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Button from '../components/Button.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { WarningCircle, LockKey, X } from '@phosphor-icons/react';
import studentsTechImage from '../../students_tech.png';
import { verificarEmailPrimeiroAcesso, validarSenhaPadraoPrimeiroAcesso, definirSenhaDefinitivaPrimeiroAcesso } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSuspendedModal, setShowSuspendedModal] = useState(false);
  const [suspendedModalMessage, setSuspendedModalMessage] = useState('');

  // Estados do Primeiro Acesso
  const [step, setStep] = useState(0); // 0 = login normal, 1 = e-mail, 2 = senha padrão, 3 = senha definitiva
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('suspended') === 'true') {
      setSuspendedModalMessage('Esta conta está atualmente inativa. Por favor, entre em contato com o setor de TI para verificar o seu status e solicitar o desbloqueio.');
      setShowSuspendedModal(true);
    }
  }, []);

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
        if (result.message && (result.message.includes('inativa') || result.message.includes('suspensa'))) {
          setSuspendedModalMessage(result.message);
          setShowSuspendedModal(true);
        } else {
          setError(result.message);
        }
        return;
      }
      navigate('/');
    } catch (err) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verificarEmailPrimeiroAcesso(email);
      setStep(2);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('E-mail não encontrado. Entre em contato com o administrador.');
      } else {
        setError(err.response?.data?.detail || 'E-mail não cadastrado ou erro ao verificar.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateTempPassword(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (tempPassword !== 'SNC@1234') {
      setError('A senha padrão inicial deve ser exatamente SNC@1234.');
      setLoading(false);
      return;
    }
    try {
      await validarSenhaPadraoPrimeiroAcesso(email, tempPassword);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Senha padrão inválida.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDefineNewPassword(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (newPassword !== confirmNewPassword) {
      setError('A nova senha e a confirmação não coincidem.');
      setLoading(false);
      return;
    }
    if (newPassword === 'SNC@1234') {
      setError('A nova senha definitiva deve ser diferente da senha padrão SNC@1234.');
      setLoading(false);
      return;
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      setLoading(false);
      return;
    }
    try {
      await definirSenhaDefinitivaPrimeiroAcesso(
        email,
        tempPassword,
        newPassword,
        confirmNewPassword
      );
      
      const loginResult = await login(email, newPassword);
      if (loginResult.ok) {
        navigate('/');
      } else {
        setError(loginResult.message || 'Erro ao efetuar login após redefinir a senha.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao salvar redefinição de senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>

      <div className="login-page-container">
        {/* BACKGROUND DECORATIONS */}
        <div className="bg-animation">
          <div className="blob blob-blue"></div>
          <div className="blob blob-orange"></div>
          <div className="blob blob-gold"></div>
          <div className="tech-grid"></div>
          <div className="circuit-lines"></div>
          <div className="skyline-overlay"></div>
        </div>

        {/* TOPBAR */}
        <header className="topbar">
          <div className="brand">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 18H5V6h14v12M21 4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM7.5 15h9c.28 0 .5-.22.5-.5s-.22-.5-.5-.5h-9c-.28 0-.5.22-.5.5s.22.5.5.5z"/>
              </svg>
            </div>
            <div className="brand-text">
              <span className="brand-title">RENOVE</span>
              <span className="brand-subtitle">Notebooks</span>
            </div>
          </div>
          
          <div className="senac-badge">
            <span className="senac-dot"></span>
            <span className="senac-text">SENAC DF</span>
          </div>
        </header>

        {/* CONTENT CONTAINER */}
        <main className="content-container">
          {/* LEFT PANEL: CONCEPTUAL AREA */}
          <section className="conceptual-side">
            <h1 className="tech-title-large">
              Controle Inteligente<br />
              de <span>Notebooks</span>
            </h1>
            <p className="tech-desc">
              Acesso integrado ao gerenciamento de empréstimos, reservas e alocações do Senac DF. Tecnologia e praticidade para instrutores e alunos.
            </p>
            
            <div className="illustration-frame">
              <div className="illustration-glow"></div>
              
              {/* Illustration Asset */}
              <img className="main-illustration" src={studentsTechImage} alt="Estudantes usando notebook" />
              
              {/* Floating Tooltips */}
              <div className="tooltip-card tooltip-1">
                <div className="tooltip-icon icon-blue">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                  </svg>
                </div>
                <div className="tooltip-content">
                  <span className="tooltip-label">Notebook Disponível</span>
                  <span className="tooltip-value">
                    Dispositivo Pronto <span className="status-dot-green"></span>
                  </span>
                </div>
              </div>

              <div className="tooltip-card tooltip-2">
                <div className="tooltip-icon icon-orange">
                  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
                  </svg>
                </div>
                <div className="tooltip-content">
                  <span className="tooltip-label">Patrimônio Vinculado</span>
                  <span className="tooltip-value">Inventário R9</span>
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT PANEL: LOGIN CARD */}
          <section className="login-side">
            <div className="glass-card-login">
              {/* Gold corner ornaments */}
              <div className="circuit-trim trim-top-left">
                <svg viewBox="0 0 100 100">
                  <path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" />
                  <circle cx="95" cy="5" r="4" fill="#f47920" />
                  <circle cx="95" cy="25" r="4" fill="#f47920" />
                </svg>
              </div>
              <div className="circuit-trim trim-bottom-right">
                <svg viewBox="0 0 100 100">
                  <path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" />
                  <circle cx="95" cy="5" r="4" fill="#f47920" />
                  <circle cx="95" cy="25" r="4" fill="#f47920" />
                </svg>
              </div>

              <AnimatePresence mode="wait">
                {step === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header */}
                    <div className="card-header">
                      <div className="r9-logo-circle">
                        <span>R9</span>
                      </div>
                      <h2 className="card-title">Portal de Acesso</h2>
                      <p className="card-subtitle">Insira suas credenciais institucionais</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                      <div className="form-group">
                        <label className="input-label" htmlFor="email">E-mail Institucional</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type="email" 
                            id="email" 
                            placeholder="nome@df.senac.br" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="input-label" htmlFor="password">Senha de Acesso</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type={showPassword ? "text" : "password"} 
                            id="password" 
                            placeholder="••••••••" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          <button 
                            type="button" 
                            className="btn-toggle-pass" 
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label="Visualizar senha"
                          >
                            {showPassword ? (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-11C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 13c-3.03 0-5.74-1.68-7.16-4.14C6.26 10.42 8.97 8.8 12 8.8s5.74 1.62 7.16 4.06C17.74 15.32 15.03 17 12 17z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="form-options">
                        <label className="checkbox-container">
                          <input type="checkbox" id="rememberMe" />
                          <span className="custom-checkbox"></span>
                          Lembrar de mim
                        </label>
                        <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setStep(1); setError(''); }}>Primeiro acesso? Ative sua conta</a>
                      </div>

                      <button className="btn-submit-premium" type="submit" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
                            Autenticando...
                          </span>
                        ) : (
                          <>
                            Entrar no Sistema Renove
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header */}
                    <div className="card-header">
                      <div className="r9-logo-circle" style={{ borderColor: 'rgba(255, 140, 0, 0.4)' }}>
                        <span style={{ color: '#ff8c00' }}>R9</span>
                      </div>
                      <h2 className="card-title">Primeiro Acesso</h2>
                      <p className="card-subtitle">Informe seu e-mail para ativar sua conta</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleVerifyEmail}>
                      <div className="form-group">
                        <label className="input-label" htmlFor="emailPrimeiro">E-mail Institucional</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type="email" 
                            id="emailPrimeiro" 
                            placeholder="nome@df.senac.br" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        </div>
                      </div>

                      <div className="form-options" style={{ justifyContent: 'center' }}>
                        <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setStep(0); setError(''); }}>Voltar ao Login</a>
                      </div>

                      <button className="btn-submit-premium" type="submit" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
                            Verificando...
                          </span>
                        ) : (
                          <>
                            Verificar E-mail
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header */}
                    <div className="card-header">
                      <div className="r9-logo-circle" style={{ borderColor: 'rgba(255, 140, 0, 0.4)' }}>
                        <span style={{ color: '#ff8c00' }}>R9</span>
                      </div>
                      <h2 className="card-title">Senha Provisória</h2>
                      <p className="card-subtitle">Insira a senha padrão para validação</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleValidateTempPassword}>
                      <div className="form-group">
                        <label className="input-label" htmlFor="tempPassword">Senha Padrão (SNC@1234)</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type={showTempPassword ? "text" : "password"} 
                            id="tempPassword" 
                            placeholder="SNC@1234" 
                            value={tempPassword}
                            onChange={(e) => setTempPassword(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          <button 
                            type="button" 
                            className="btn-toggle-pass" 
                            onClick={() => setShowTempPassword(!showTempPassword)}
                            aria-label="Visualizar senha"
                          >
                            {showTempPassword ? (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-11C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 13c-3.03 0-5.74-1.68-7.16-4.14C6.26 10.42 8.97 8.8 12 8.8s5.74 1.62 7.16 4.06C17.74 15.32 15.03 17 12 17z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="form-options" style={{ justifyContent: 'center' }}>
                        <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setStep(1); setError(''); }}>Voltar</a>
                      </div>

                      <button className="btn-submit-premium" type="submit" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
                            Validando...
                          </span>
                        ) : (
                          <>
                            Validar Senha
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* Header */}
                    <div className="card-header">
                      <div className="r9-logo-circle" style={{ borderColor: 'rgba(255, 140, 0, 0.4)' }}>
                        <span style={{ color: '#ff8c00' }}>R9</span>
                      </div>
                      <h2 className="card-title">Senha Definitiva</h2>
                      <p className="card-subtitle">Cadastre sua nova senha de acesso</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleDefineNewPassword}>
                      <div className="form-group">
                        <label className="input-label" htmlFor="newPassword">Nova Senha (min. 6 caracteres)</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type={showNewPassword ? "text" : "password"} 
                            id="newPassword" 
                            placeholder="Sua nova senha" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          <button 
                            type="button" 
                            className="btn-toggle-pass" 
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            aria-label="Visualizar senha"
                          >
                            {showNewPassword ? (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-11C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 13c-3.03 0-5.74-1.68-7.16-4.14C6.26 10.42 8.97 8.8 12 8.8s5.74 1.62 7.16 4.06C17.74 15.32 15.03 17 12 17z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="input-label" htmlFor="confirmNewPassword">Confirmar Nova Senha</label>
                        <div className="input-wrapper">
                          <input 
                            className="input-field" 
                            type={showConfirmNewPassword ? "text" : "password"} 
                            id="confirmNewPassword" 
                            placeholder="Repita sua nova senha" 
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required 
                          />
                          <svg className="field-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                          <button 
                            type="button" 
                            className="btn-toggle-pass" 
                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                            aria-label="Visualizar senha"
                          >
                            {showConfirmNewPassword ? (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm0-11C7 4 2.73 7.11 1 11.5 2.73 15.89 7 19 12 19s9.27-3.11 11-7.5C21.27 7.11 17 4 12 4zm0 13c-3.03 0-5.74-1.68-7.16-4.14C6.26 10.42 8.97 8.8 12 8.8s5.74 1.62 7.16 4.06C17.74 15.32 15.03 17 12 17z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="form-options" style={{ justifyContent: 'center' }}>
                        <a href="#" className="forgot-link" onClick={(e) => { e.preventDefault(); setStep(2); setError(''); }}>Voltar</a>
                      </div>

                      <button className="btn-submit-premium" type="submit" disabled={loading}>
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="h-4 w-4 border-2 border-slate-100/30 border-t-slate-100 rounded-full animate-spin" />
                            Salvando...
                          </span>
                        ) : (
                          <>
                            Ativar Conta e Entrar
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                            </svg>
                          </>
                        )}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="footer flex flex-col md:flex-row justify-between items-center w-full px-6 py-4 space-y-2 md:space-y-0">
          <div className="footer-left text-[11px] md:text-xs text-slate-400">
            &copy; 2026 Renove (R9) • Senac Distrito Federal. Todos os direitos reservados.
          </div>
          <div className="footer-right">
            <button 
              onClick={() => setShowPrivacyModal(true)} 
              className="text-[11px] md:text-xs text-orange-400 hover:text-orange-300 underline bg-transparent border-none cursor-pointer transition-colors"
            >
              Política de Privacidade (LGPD)
            </button>
          </div>
        </footer>
      </div>

      {/* PREMIUM WARNING MODAL FOR SUSPENDED ACCOUNTS */}
      <AnimatePresence>
        {showSuspendedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowSuspendedModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6 text-center shadow-2xl z-10"
              style={{ background: 'rgba(6, 18, 36, 0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 140, 0, 0.25)' }}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-0 left-0 w-12 h-12 opacity-60">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>
              <div className="absolute bottom-0 right-0 w-12 h-12 opacity-60 rotate-180">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>

              <button
                onClick={() => setShowSuspendedModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <LockKey weight="duotone" size={32} className="animate-pulse" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider">Acesso Bloqueado</h3>
                  <p className="text-xs text-orange-400 font-mono tracking-widest uppercase">Conta Inativa</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-medium bg-dark-950/40 p-4 rounded-xl border border-dark-600/30">
                  {suspendedModalMessage}
                </p>

                <div className="w-full pt-2">
                  <Button
                    onClick={() => setShowSuspendedModal(false)}
                    variant="danger"
                    className="w-full py-3 text-xs tracking-wider uppercase font-bold"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PREMIUM WARNING MODAL FOR WRONG CREDENTIALS / OTHER ERRORS */}
      <AnimatePresence>
        {error && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setError('')}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl p-6 text-center shadow-2xl z-10"
              style={{ background: 'rgba(6, 18, 36, 0.65)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 140, 0, 0.25)' }}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-0 left-0 w-12 h-12 opacity-60">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>
              <div className="absolute bottom-0 right-0 w-12 h-12 opacity-60 rotate-180">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>

              <div className="flex flex-col items-center text-center space-y-4 pt-2">
                <div className="h-16 w-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <WarningCircle weight="fill" size={32} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider">Falha de Acesso</h3>
                  <p className="text-xs text-orange-400 font-mono tracking-widest uppercase">Credenciais Inválidas</p>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed font-medium bg-dark-950/40 p-4 rounded-xl border border-dark-600/30">
                  {error}
                </p>

                <div className="w-full pt-2">
                  <Button
                    onClick={() => setError('')}
                    variant="danger"
                    className="w-full py-3 text-xs tracking-wider uppercase font-bold"
                  >
                    Tentar Novamente
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE POLÍTICA DE PRIVACIDADE (LGPD) */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              onClick={() => setShowPrivacyModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-2xl p-6 shadow-2xl z-10 flex flex-col max-h-[85vh]"
              style={{ background: 'rgba(6, 18, 36, 0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 140, 0, 0.25)' }}
            >
              {/* Corner Ornaments */}
              <div className="absolute top-0 left-0 w-12 h-12 opacity-60 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>
              <div className="absolute bottom-0 right-0 w-12 h-12 opacity-60 rotate-180 pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full stroke-orange-500 fill-none"><path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" /><circle cx="95" cy="5" r="4" fill="#ffc800" /><circle cx="95" cy="25" r="4" fill="#ffc800" /></svg>
              </div>

              <button
                onClick={() => setShowPrivacyModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-dark-700/50 border border-dark-600 text-slate-400 hover:text-slate-200 transition-colors z-20"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col space-y-4 pt-2 overflow-hidden">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-100 uppercase tracking-wider">Política de Privacidade</h3>
                  <p className="text-xs text-orange-400 font-mono tracking-widest uppercase">Conformidade LGPD — Renove (R9)</p>
                </div>

                {/* Conteúdo rolável */}
                <div className="overflow-y-auto pr-2 space-y-4 text-slate-300 text-xs md:text-sm leading-relaxed text-left scrollbar-thin scrollbar-thumb-orange-500/20 scrollbar-track-transparent">
                  <div>
                    <h4 className="font-bold text-orange-400 uppercase tracking-wide mb-1">1. Introdução</h4>
                    <p>
                      Esta Política de Privacidade descreve como o sistema **Renove (R9)** do Senac Distrito Federal coleta, armazena, utiliza e protege os dados pessoais de seus usuários (alunos, professores e profissionais de TI), garantindo transparência em conformidade com a **Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709/2018**.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-orange-400 uppercase tracking-wide mb-1">2. Dados Pessoais Coletados</h4>
                    <p>O sistema coleta apenas os dados essenciais para o controle acadêmico e de inventário:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li><strong>Identificação:</strong> Nome completo e número de matrícula institucional.</li>
                      <li><strong>Contato:</strong> E-mail institucional (domínios <code>@df.senac.br</code> ou <code>@edu.df.senac.br</code>).</li>
                      <li><strong>Acadêmicos:</strong> Curso matriculado e código da turma (para estudantes).</li>
                      <li><strong>Segurança:</strong> Senha de acesso criptografada por hash seguro (<code>bcrypt</code>).</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-orange-400 uppercase tracking-wide mb-1">3. Finalidade do Tratamento</h4>
                    <p>
                      A coleta e o processamento de dados visam estritamente o gerenciamento de empréstimos, retiradas, devoluções e reservas de computadores portáteis (notebooks) de propriedade da instituição, garantindo a integridade do inventário, segurança operacional e cumprimento de metas acadêmicas.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-orange-400 uppercase tracking-wide mb-1">4. Direitos do Titular (Art. 18 da LGPD)</h4>
                    <p>Como titular dos dados pessoais, você pode solicitar a qualquer momento ao setor de TI da sua unidade:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Confirmação da existência de tratamento e acesso aos dados.</li>
                      <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                      <li>Exclusão ou anonimização de seus dados (com a ressalva de obrigações de prestação de contas fiscais ou institucionais de ativos físicos pendentes).</li>
                      <li>Exportação de seus dados pessoais.</li>
                      <li>Revogação do consentimento (o que impedirá o uso do sistema e a retirada de notebooks).</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-bold text-orange-400 uppercase tracking-wide mb-1">5. Segurança e Armazenamento</h4>
                    <p>
                      Adotamos medidas rígidas de segurança física e digital, incluindo criptografia na assinatura de tokens de sessão (JWT), hashing robusto de senhas, controle de acesso baseado em papéis (RBAC) e logs detalhados de auditoria interna para todas as movimentações de inventário.
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-dark-600/30">
                  <Button
                    onClick={() => setShowPrivacyModal(false)}
                    variant="primary"
                    className="w-full py-3 text-xs tracking-wider uppercase font-bold"
                  >
                    Aceitar e Fechar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
