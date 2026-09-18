import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  getNotificacoesPendentesProfessor, 
  visualizarSolicitacaoAlocacao, 
  listarSolicitacoesAlocacao 
} from '../services/alocacoesService';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SquaresFour, 
  Laptop, 
  Archive, 
  ClockCounterClockwise, 
  Users, 
  CalendarCheck, 
  SignOut, 
  ChartBar, 
  UsersThree, 
  Sun, 
  Moon, 
  CheckCircle, 
  Warning, 
  List, 
  X, 
  Info,
  Lightning,
  ShieldCheck,
  XCircle
} from '@phosphor-icons/react';

export default function Layout({ children }) {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );
  const [toasts, setToasts] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notificações de Alocação
  const [solicitacoesAbertasCount, setSolicitacoesAbertasCount] = useState(0);
  const [professorFeedbackModal, setProfessorFeedbackModal] = useState(null);
  const [showNotebooksList, setShowNotebooksList] = useState(false);

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    window.showToast = (toast) => {
      const id = Date.now() + Math.random();
      const newToast = { id, type: 'info', duration: 6000, ...toast };
      setToasts(prev => [...prev, newToast]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, newToast.duration);
    };
    return () => {
      delete window.showToast;
    };
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Carregar notificações iniciais
  async function carregarNotificacoes() {
    if (!user) return;
    if (user.role === 'ti' || user.role === 'professor') {
      try {
        const abertas = await listarSolicitacoesAlocacao({ status: 'Aberto' });
        setSolicitacoesAbertasCount(Array.isArray(abertas) ? abertas.length : 0);
      } catch (e) {}
    }
    if (user.role === 'professor') {
      try {
        const pendentes = await getNotificacoesPendentesProfessor();
        if (Array.isArray(pendentes) && pendentes.length > 0) {
          setProfessorFeedbackModal(pendentes[0]);
        }
      } catch (e) {}
    }
  }

  useEffect(() => {
    carregarNotificacoes();
  }, [user]);

  // WebSocket Listeners
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'solicitacao_alocacao_criada') {
      if (user?.role === 'ti' || user?.role === 'professor') {
        carregarNotificacoes();
        if (window.showToast) {
          window.showToast({
            type: 'warning',
            title: 'Nova Solicitação de Alocação',
            message: `O professor ${lastMessage.data?.solicitante_nome} solicitou alocação para a turma ${lastMessage.data?.turma_id}.`
          });
        }
      }
    }

    if (lastMessage.type === 'solicitacao_alocacao_avaliada') {
      if (user?.role === 'ti' || user?.role === 'professor') {
        carregarNotificacoes();
      }
      if (user?.role === 'professor' && lastMessage.data?.solicitante_id === user.id) {
        setProfessorFeedbackModal(lastMessage.data);
      }
    }
  }, [lastMessage, user]);

  async function handleCloseProfessorModal() {
    if (professorFeedbackModal?.id) {
      try {
        await visualizarSolicitacaoAlocacao(professorFeedbackModal.id);
      } catch (e) {}
    }
    setProfessorFeedbackModal(null);
    setShowNotebooksList(false);
  }

  const roleLabel = {
    ti: 'Administrador TI',
    professor: 'Professor',
    aluno: 'Aluno'
  };

  const roleColor = {
    ti: 'text-primary',
    professor: 'text-accent',
    aluno: 'text-secondary'
  };

  const navItems = [];

  if (user?.role === 'ti') {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: <SquaresFour weight="duotone" /> },
      { to: '/emprestimos', label: 'Empréstimos', icon: <Laptop weight="duotone" /> },
      { 
        to: '/alocacoes', 
        label: 'Alocações', 
        icon: <ChartBar weight="duotone" />,
        badge: solicitacoesAbertasCount > 0 ? solicitacoesAbertasCount : null 
      },
      { to: '/equipamentos', label: 'Inventário', icon: <Archive weight="duotone" /> },
      { to: '/usuarios', label: 'Usuários', icon: <UsersThree weight="duotone" /> },
      { to: '/historico', label: 'Histórico', icon: <ClockCounterClockwise weight="duotone" /> },
      { to: '/turmas', label: 'Turmas', icon: <Users weight="duotone" /> },
      { to: '/reservas', label: 'Reservas', icon: <CalendarCheck weight="duotone" /> }
    );
  } else if (user?.role === 'professor') {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: <SquaresFour weight="duotone" /> },
      { to: '/emprestimos', label: 'Empréstimos', icon: <Laptop weight="duotone" /> },
      { 
        to: '/alocacoes', 
        label: 'Alocações', 
        icon: <ChartBar weight="duotone" />,
        badge: solicitacoesAbertasCount > 0 ? solicitacoesAbertasCount : null 
      },
      { to: '/historico', label: 'Histórico', icon: <ClockCounterClockwise weight="duotone" /> },
      { to: '/turmas', label: 'Turmas', icon: <Users weight="duotone" /> },
      { to: '/reservas', label: 'Reservas', icon: <CalendarCheck weight="duotone" /> }
    );
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Parse dos notebooks alocados para o modal do professor
  const notebooksAlocadosList = (() => {
    if (!professorFeedbackModal?.detalhes_alocacao) return [];
    try {
      const parsed = JSON.parse(professorFeedbackModal.detalhes_alocacao);
      return parsed.alocados || [];
    } catch (e) {
      return [];
    }
  })();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-dark-950 text-slate-100">
      
      {/* 1. DESKTOP SIDEBAR */}
      {user && (
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-dark-900/40 border-r border-dark-600/40 backdrop-blur-xl">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-dark-600/30">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="h-9 px-3 rounded-lg bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <span className="text-sm font-black text-white uppercase tracking-wider">Senac</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black tracking-widest text-slate-100 uppercase">Renove</span>
                <span className="text-[9px] text-slate-400 font-mono tracking-wider">DF • R9</span>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? 'text-primary bg-primary/10 border border-primary/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-dark-800/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Theme Toggle */}
          <div className="p-4 border-t border-dark-600/30 bg-dark-950/20">
            <div className="flex items-center gap-3 mb-3 px-2">
              <div className="h-9 w-9 rounded-lg bg-dark-700 flex items-center justify-center font-bold text-sm text-slate-200 border border-dark-600">
                {user?.nome ? user.nome.charAt(0) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{user?.nome}</p>
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor[user?.role] || 'text-slate-400'}`}>
                  {roleLabel[user?.role] || user?.role}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-dark-600/20">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-dark-800 border border-dark-600/40 text-slate-400 hover:text-slate-200 transition-colors"
                title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-400 border border-red-500/20 transition-colors"
              >
                <SignOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MOBILE TOP BAR */}
      {user && (
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-dark-900 border-b border-dark-600/50 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="h-8 px-2 rounded-md bg-gradient-to-br from-senac-orange to-senac-orange/80 flex items-center justify-center">
              <span className="text-xs font-black text-white">SNC</span>
            </div>
            <span className="text-sm font-black text-slate-100 tracking-wider">RENOVE</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-dark-800 border border-dark-600 text-slate-300"
            >
              {isMobileMenuOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>
      )}

      {/* 3. MOBILE DRAWER */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-dark-900 border-r border-dark-600 flex flex-col md:hidden shadow-2xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-dark-600/30 bg-dark-950/20">
                <div className="flex items-center gap-3">
                  <div className="h-8 px-2.5 rounded-md bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center shadow-md">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Senac</span>
                  </div>
                  <span className="text-xs font-black tracking-widest text-slate-100 uppercase mt-0.5">Renove</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-dark-800 text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        active
                          ? 'text-primary bg-primary/10 border border-primary/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-black">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-5 border-t border-dark-600/30 bg-dark-950/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-9 w-9 rounded-lg bg-dark-700 flex items-center justify-center font-bold text-sm text-slate-200 border border-dark-600">
                    {user?.nome ? user.nome.charAt(0) : 'U'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">{user?.nome}</p>
                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${roleColor[user?.role] || 'text-slate-400'}`}>
                      {roleLabel[user?.role] || user?.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dark-600/10">
                  <button
                    onClick={toggleTheme}
                    className="p-2.5 rounded-lg bg-dark-800 border border-dark-600/30 text-slate-400 hover:text-slate-200"
                  >
                    {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 text-xs font-bold text-red-400"
                  >
                    <SignOut size={14} />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 4. MAIN CONTENT CONTAINER */}
      <div className={`flex-1 flex flex-col min-h-screen ${user ? 'md:pl-64' : ''}`}>
        <main className="flex-1 p-4 sm:p-6 md:p-8">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        <footer className="border-t border-dark-600/25 py-4 px-6 mt-auto bg-dark-900/10">
          <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500 tracking-wider uppercase">
              SENAC • Sistema Integrado Renove
            </p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
              <span className="text-[10px] text-slate-500 font-mono">v2.1.0</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ============================================================ */}
      {/* MODAL DE RETORNO PARA O PROFESSOR (APROVADO / NEGADO)        */}
      {/* ============================================================ */}
      <AnimatePresence>
        {professorFeedbackModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-[fadeIn_0.2s_ease-out]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`glass-card p-6 w-full max-w-lg shadow-2xl relative text-slate-200 border rounded-2xl ${
                professorFeedbackModal.status === 'Aprovado' ? 'border-emerald-500/40' : 'border-red-500/40'
              }`}
            >
              <button
                onClick={handleCloseProfessorModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-lg"
              >
                ✕
              </button>

              <header className="border-b border-dark-600/50 pb-4 mb-4 text-center">
                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-3xl ${
                  professorFeedbackModal.status === 'Aprovado' 
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' 
                    : 'bg-red-500/15 border border-red-500/30 text-red-400'
                }`}>
                  {professorFeedbackModal.status === 'Aprovado' ? <CheckCircle weight="fill" /> : <XCircle weight="fill" />}
                </div>

                <h3 className="text-lg font-black text-slate-100">
                  {professorFeedbackModal.status === 'Aprovado' ? 'Alocação Aprovada!' : 'Alocação Negada'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Turma: <strong className="text-slate-200 font-mono">{professorFeedbackModal.turma_id}</strong>
                </p>
              </header>

              <div className="space-y-4">
                {/* Mensagem Oficial Padronizada */}
                <div className={`p-4 rounded-xl border text-xs font-semibold leading-relaxed text-center ${
                  professorFeedbackModal.status === 'Aprovado'
                    ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-800/40 text-red-300'
                }`}>
                  {professorFeedbackModal.status === 'Aprovado'
                    ? 'O pedido de empréstimo por alocação foi aprovado! Encaminhe seus alunos para realizar a retirada! Obrigado!'
                    : 'O pedido de empréstimo por alocação foi negado! As razões pelas quais isso ocorreu foram avaliadas pelo responsável abaixo.'}
                </div>

                {/* Justificativa e Motivo do TI */}
                <div className="bg-dark-800/80 p-3.5 rounded-xl border border-dark-600/60 text-xs space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Responsável pela Avaliação:</span>
                    <strong className="text-slate-200">{professorFeedbackModal.responsavel_ti_nome || 'Equipe de TI'}</strong>
                  </div>

                  <div className="pt-2 border-t border-dark-600/40">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Motivo Informado pelo Administrador:</span>
                    <p className="text-slate-200 italic bg-dark-900/60 p-2.5 rounded-lg border border-dark-700 leading-relaxed">
                      "{professorFeedbackModal.motivo_decisao || 'Nenhum motivo detalhado informado.'}"
                    </p>
                  </div>
                </div>

                {/* Exibição dos notebooks liberados se aprovado */}
                {professorFeedbackModal.status === 'Aprovado' && notebooksAlocadosList.length > 0 && (
                  <div className="pt-2 border-t border-dark-600/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Laptop size={15} weight="fill" />
                        Notebooks Disponibilizados ({notebooksAlocadosList.length})
                      </span>
                    </div>

                    <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                      {notebooksAlocadosList.map((item, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-dark-900/70 border border-dark-700 flex justify-between items-center">
                          <span className="text-primary font-bold">{item.patrimonio} <span className="text-slate-400 font-sans">({item.modelo})</span></span>
                          <span className="text-slate-300 font-sans font-semibold">{item.aluno_nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-3 border-t border-dark-600/50">
                  <button
                    onClick={handleCloseProfessorModal}
                    className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-white shadow-lg ${
                      professorFeedbackModal.status === 'Aprovado'
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-dark-700 hover:bg-dark-600 text-slate-200 border border-dark-600'
                    }`}
                  >
                    {professorFeedbackModal.status === 'Aprovado' ? 'Entendido / Fechar Aviso' : 'Entendido'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toasts Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              className={`p-4 rounded-xl border backdrop-blur-xl shadow-2xl pointer-events-auto flex items-start gap-3 bg-dark-900/90 ${
                t.type === 'success' ? 'border-emerald-500/30 text-emerald-450' :
                t.type === 'danger' ? 'border-red-500/30 text-red-450' :
                t.type === 'warning' ? 'border-amber-500/30 text-amber-400' :
                'border-primary/30 text-primary'
              }`}
            >
              <div className="text-xl shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle weight="fill" />}
                {t.type === 'danger' && <Warning weight="fill" />}
                {t.type === 'warning' && <Warning weight="fill" />}
                {t.type === 'info' && <Info weight="fill" />}
              </div>
              <div className="flex-1">
                {t.title && <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide mb-1">{t.title}</h4>}
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{t.message}</p>
                {t.title === 'Nova Solicitação de Alocação' && (
                  <Link
                    to="/alocacoes"
                    className="inline-block mt-2 text-[11px] font-bold text-primary hover:underline"
                  >
                    Ir para Avaliação →
                  </Link>
                )}
              </div>
              <button onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))} className="text-slate-500 hover:text-slate-350 text-xs font-mono ml-2 shrink-0">
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
