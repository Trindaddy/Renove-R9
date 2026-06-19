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
      <style>{`
        /* CUSTOM STYLES FOR THE PREMIUM LOGIN PAGE */
        .login-page-container {
          background-color: #020b18;
          color: #f8fafc;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow-x: hidden;
          position: relative;
          width: 100%;
        }

        /* DYNAMIC BACKGROUND */
        .bg-animation {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(140px);
          opacity: 0.18;
          mix-blend-mode: screen;
          animation: float-blob 20s infinite ease-in-out alternate;
        }

        .blob-blue {
          top: -10%;
          left: 10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #00f0ff, #004a8d);
        }

        .blob-orange {
          bottom: -10%;
          right: 10%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #ff8c00, #ff4500);
          animation-delay: -5s;
          animation-duration: 25s;
        }

        .blob-gold {
          top: 40%;
          left: 45%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, #ffc800, #ff8c00);
          opacity: 0.08;
          animation-delay: -10s;
        }

        .tech-grid {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 40px 40px;
          mask-image: radial-gradient(ellipse at 50% 50%, black, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black, transparent 80%);
        }

        .circuit-lines {
          position: absolute;
          inset: 0;
          opacity: 0.06;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'%3E%3Cpath d='M100 100h200v200m100-300v400h-100m400-300h200v200' stroke='white' stroke-width='2' fill='none'/%3E%3Ccircle cx='100' cy='100' r='5' fill='white'/%3E%3Ccircle cx='300' cy='300' r='5' fill='white'/%3E%3Ccircle cx='400' cy='100' r='5' fill='white'/%3E%3Ccircle cx='300' cy='500' r='5' fill='white'/%3E%3Ccircle cx='700' cy='200' r='5' fill='white'/%3E%3Ccircle cx='900' cy='400' r='5' fill='white'/%3E%3C/svg%3E");
        }

        .skyline-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 25vh;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3E%3Cpath d='M0 100 V90 H20 V70 H30 V80 H50 V60 H70 V90 H90 V50 H110 V70 H130 V90 H150 V40 H170 V80 H180 V60 H200 V90 H220 V55 H240 V75 H260 V90 H280 V30 H310 V80 H330 V65 H350 V90 H370 V50 H400 V70 H420 V90 H440 V40 H470 V80 H490 V60 H510 V90 H530 V35 H560 V75 H580 V55 H600 V90 H630 V45 H660 V70 H680 V90 H700 V30 H730 V80 H750 V60 H780 V90 H800 V50 H830 V70 H850 V90 H880 V35 H910 V75 H930 V55 H950 V90 H980 V45 H1000 V100 Z' fill='%230b1329' opacity='0.25'/%3E%3C/svg%3E");
          background-size: 100% 100%;
          pointer-events: none;
        }

        /* HEADER / TOPBAR */
        .topbar {
          width: 100%;
          padding: 1.5rem 3rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 10;
          position: relative;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: linear-gradient(135deg, #004a8d, #00f0ff);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .brand-logo svg {
          width: 22px;
          height: 22px;
          fill: #f8fafc;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-size: 1.15rem;
          font-weight: 900;
          letter-spacing: 0.15em;
          background: linear-gradient(to right, #f8fafc, #00f0ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-subtitle {
          font-size: 0.65rem;
          color: #ff8c00;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }

        .senac-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.04);
          padding: 0.5rem 1rem;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .senac-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ff8c00;
          box-shadow: 0 0 10px #ff8c00;
        }

        .senac-text {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #94a3b8;
        }

        /* MAIN CONTAINER */
        .content-container {
          flex: 1;
          width: 100%;
          max-width: 1300px;
          margin: 0 auto;
          padding: 1rem 2rem 3rem;
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          align-items: center;
          gap: 4rem;
          z-index: 10;
          position: relative;
        }

        /* LEFT SIDE */
        .conceptual-side {
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .tech-title-large {
          font-size: 2.75rem;
          font-weight: 900;
          line-height: 1.15;
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
        }

        .tech-title-large span {
          background: linear-gradient(135deg, #00f0ff 30%, #ff8c00 80%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .tech-desc {
          font-size: 0.95rem;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 2.5rem;
          max-width: 480px;
        }

        .illustration-frame {
          position: relative;
          width: 100%;
          max-width: 520px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .illustration-glow {
          position: absolute;
          width: 320px;
          height: 320px;
          background: radial-gradient(circle, rgba(0, 240, 255, 0.15) 0%, transparent 70%);
          z-index: 1;
          pointer-events: none;
        }

        .main-illustration {
          width: 100%;
          height: auto;
          z-index: 2;
          filter: drop-shadow(0 20px 40px rgba(0, 74, 141, 0.3));
          border-radius: 20px;
          max-height: 380px;
          object-fit: contain;
        }

        /* Tooltips */
        .tooltip-card {
          position: absolute;
          background: rgba(10, 25, 47, 0.75);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 240, 255, 0.25);
          z-index: 3;
          animation: float-tooltip 6s infinite ease-in-out;
          transition: all 0.3s ease;
        }

        .tooltip-card:hover {
          transform: scale(1.05) translateY(-5px);
          border-color: #ff8c00;
          box-shadow: 0 15px 30px rgba(0, 0, 0, 0.4), 0 0 25px rgba(255, 140, 0, 0.3);
        }

        .tooltip-1 {
          top: 5%;
          right: 5%;
          animation-delay: 0s;
        }

        .tooltip-2 {
          bottom: 12%;
          left: -5%;
          animation-delay: -3s;
          border-color: rgba(255, 140, 0, 0.25);
        }

        .tooltip-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .icon-blue {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: #00f0ff;
        }

        .icon-orange {
          background: rgba(255, 140, 0, 0.1);
          border: 1px solid rgba(255, 140, 0, 0.2);
          color: #ff8c00;
        }

        .tooltip-icon svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        .tooltip-content {
          display: flex;
          flex-direction: column;
        }

        .tooltip-label {
          font-size: 0.65rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #94a3b8;
          font-weight: 600;
        }

        .tooltip-value {
          font-size: 0.85rem;
          font-weight: 800;
          color: #f8fafc;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .status-dot-green {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #00e676;
          box-shadow: 0 0 8px #00e676;
        }

        /* RIGHT SIDE: GLASS CARD */
        .login-side {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .glass-card {
          width: 100%;
          max-width: 430px;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 3rem 2.5rem;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
          position: relative;
          overflow: hidden;
        }

        .circuit-trim {
          position: absolute;
          pointer-events: none;
          width: 60px;
          height: 60px;
          opacity: 0.6;
        }

        .circuit-trim svg {
          width: 100%;
          height: 100%;
          stroke: #ffc800;
          stroke-width: 1.5;
          fill: none;
          filter: drop-shadow(0 0 3px rgba(255, 200, 0, 0.4));
        }

        .trim-top-left {
          top: 0;
          left: 0;
        }

        .trim-bottom-right {
          bottom: 0;
          right: 0;
          transform: rotate(180deg);
        }

        .card-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 2.25rem;
          text-align: center;
        }

        .r9-logo-circle {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          background: radial-gradient(circle, #020b18 40%, rgba(255, 255, 255, 0.05) 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          position: relative;
          box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.05);
        }

        .r9-logo-circle::after {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00f0ff, #ff8c00);
          z-index: -1;
          opacity: 0.45;
          filter: blur(4px);
        }

        .r9-logo-circle span {
          font-size: 1.75rem;
          font-weight: 950;
          letter-spacing: -0.05em;
          background: linear-gradient(135deg, #f8fafc, #00f0ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 10px rgba(0, 240, 255, 0.3));
        }

        .card-title {
          font-size: 1.45rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #f8fafc;
          margin-bottom: 0.35rem;
        }

        .card-subtitle {
          font-size: 0.8rem;
          color: #94a3b8;
        }

        /* FORMS */
        .form-group {
          margin-bottom: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .input-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #00f0ff;
          text-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
          text-align: left;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper svg.field-icon {
          position: absolute;
          left: 1.15rem;
          width: 18px;
          height: 18px;
          fill: #94a3b8;
          transition: all 0.3s ease;
          pointer-events: none;
        }

        .input-field {
          width: 100%;
          background: rgba(1, 10, 22, 0.65);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 0.95rem 1.15rem 0.95rem 2.85rem;
          color: #f8fafc;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .input-field::placeholder {
          color: rgba(148, 163, 184, 0.4);
        }

        .input-field:hover {
          border-color: rgba(0, 240, 255, 0.3);
          background: rgba(1, 10, 22, 0.7);
        }

        .input-field:focus {
          outline: none;
          border-color: #00f0ff;
          background: rgba(1, 10, 22, 0.85);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.25);
        }

        .input-field:focus + svg.field-icon {
          fill: #00f0ff;
          filter: drop-shadow(0 0 5px #00f0ff);
        }

        .btn-toggle-pass {
          position: absolute;
          right: 1.15rem;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          border-radius: 4px;
          transition: color 0.2s ease;
        }

        .btn-toggle-pass:hover {
          color: #00f0ff;
        }

        .btn-toggle-pass svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        .form-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1.5rem 0 2rem;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #94a3b8;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-container input {
          display: none;
        }

        .custom-checkbox {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.25);
          display: inline-block;
          position: relative;
          transition: all 0.2s ease;
        }

        .checkbox-container input:checked + .custom-checkbox {
          background: #00f0ff;
          border-color: #00f0ff;
          box-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
        }

        .checkbox-container input:checked + .custom-checkbox::after {
          content: '';
          position: absolute;
          left: 5px;
          top: 2px;
          width: 4px;
          height: 7px;
          border: solid #020b18;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }

        .forgot-link {
          font-size: 0.8rem;
          color: #ff8c00;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .forgot-link:hover {
          color: #ffc800;
        }

        /* BUTTON */
        .btn-submit-premium {
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(135deg, #00f0ff, #ff8c00);
          color: #f8fafc;
          padding: 1rem;
          font-size: 0.95rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.25), 0 0 25px rgba(255, 140, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .btn-submit-premium::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
          transition: all 0.6s ease;
        }

        .btn-submit-premium:hover {
          transform: scale(1.02);
          box-shadow: 0 0 35px rgba(0, 240, 255, 0.45), 0 0 35px rgba(255, 140, 0, 0.45);
          border-color: rgba(255, 255, 255, 0.25);
        }

        .btn-submit-premium:hover::before {
          left: 100%;
        }

        .btn-submit-premium:active {
          transform: scale(0.98);
        }

        .btn-submit-premium svg {
          width: 18px;
          height: 18px;
          fill: currentColor;
        }

        /* FOOTER */
        .footer {
          width: 100%;
          padding: 1.5rem 3rem;
          display: flex;
          justify-content: center;
          align-items: center;
          border-top: 1px solid rgba(255, 255, 255, 0.03);
          background: rgba(2, 11, 24, 0.5);
          z-index: 10;
          position: relative;
        }

        .footer-left {
          font-size: 0.75rem;
          color: #94a3b8;
          opacity: 0.7;
        }

        /* KEYFRAMES */
        @keyframes float-blob {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(50px, 30px) scale(1.1); }
        }

        @keyframes float-tooltip {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        /* RESPONSIVENESS */
        @media (max-width: 1023px) {
          .content-container {
            grid-template-columns: 1fr;
            gap: 3rem;
            padding-bottom: 2rem;
          }
          .conceptual-side {
            align-items: center;
            text-align: center;
          }
          .tech-desc {
            margin-bottom: 2rem;
          }
          .illustration-frame {
            max-width: 420px;
            margin: 0 auto;
          }
          .tooltip-2 {
            left: -2%;
            bottom: 8%;
          }
        }

        @media (max-width: 639px) {
          .topbar { padding: 1rem 1.5rem; }
          .brand-title { font-size: 1rem; }
          .brand-subtitle { font-size: 0.55rem; }
          .senac-badge { padding: 0.35rem 0.75rem; }
          .senac-text { font-size: 0.65rem; }
          .content-container { padding: 1rem 1.15rem 2rem; gap: 2.5rem; }
          .tech-title-large { font-size: 2rem; }
          .tech-desc { font-size: 0.85rem; }
          .tooltip-card { padding: 0.5rem 0.75rem; }
          .tooltip-label { font-size: 0.55rem; }
          .tooltip-value { font-size: 0.75rem; }
          .glass-card { padding: 2.25rem 1.5rem; }
          .card-title { font-size: 1.25rem; }
          .card-subtitle { font-size: 0.75rem; }
          .footer { padding: 1.25rem 1.5rem; flex-direction: column; gap: 1rem; text-align: center; }
        }
      `}</style>

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
            <div className="glass-card">
              {/* Gold corner ornaments */}
              <div className="circuit-trim trim-top-left">
                <svg viewBox="0 0 100 100">
                  <path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" />
                  <circle cx="95" cy="5" r="4" fill="#ffc800" />
                  <circle cx="95" cy="25" r="4" fill="#ffc800" />
                </svg>
              </div>
              <div className="circuit-trim trim-bottom-right">
                <svg viewBox="0 0 100 100">
                  <path d="M 5,95 L 5,5 L 95,5 M 25,95 L 25,25 L 95,25" />
                  <circle cx="95" cy="5" r="4" fill="#ffc800" />
                  <circle cx="95" cy="25" r="4" fill="#ffc800" />
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
        <footer class="footer">
          <div class="footer-left">
            &copy; 2026 Renove (R9) • Senac Distrito Federal. Todos os direitos reservados.
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
    </>
  );
}
