import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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
  X
} from '@phosphor-icons/react';

export default function Layout({ children }) {
  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );
  const [toasts, setToasts] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.showToast = (toast) => {
      const id = Date.now() + Math.random();
      const newToast = { id, type: 'info', duration: 5000, ...toast };
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

  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
      { to: '/alocacoes', label: 'Alocações', icon: <ChartBar weight="duotone" /> },
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
      { to: '/alocacoes', label: 'Alocações', icon: <ChartBar weight="duotone" /> },
      { to: '/historico', label: 'Histórico', icon: <ClockCounterClockwise weight="duotone" /> },
      { to: '/turmas', label: 'Turmas', icon: <Users weight="duotone" /> },
      { to: '/reservas', label: 'Reservas', icon: <CalendarCheck weight="duotone" /> }
    );
  } else {
    // Aluno: Apenas o dashboard principal, sem navegação lateral
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-dark-950 text-slate-100">
      
      {/* 1. DESKTOP SIDEBAR (Fixo na esquerda em telas md+) */}
      {user && (
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-40 bg-dark-900/40 border-r border-dark-600/40 backdrop-blur-xl">
          {/* Logo Area */}
          <div className="h-16 flex items-center px-6 border-b border-dark-600/30">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <div className="h-9 px-3 rounded-lg bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <span className="text-sm font-black text-white tracking-widest uppercase">Senac</span>
                </div>
                <div className="absolute -inset-1 rounded-lg bg-senac-orange/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-bold tracking-widest text-slate-100 uppercase leading-none mt-0.5">
                  Renove
                </p>
                <p className="text-[9px] text-senac-blue tracking-[0.25em] uppercase mt-1 font-semibold">
                  Gestão de Ativos
                </p>
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
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-medium tracking-wide transition-all ${
                    active
                      ? 'text-primary bg-primary/5 border border-primary/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/30'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="active-indicator"
                      className="absolute left-0 w-1 top-3 bottom-3 bg-primary rounded-r-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <span className="text-lg shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer (User info & Settings) */}
          <div className="p-4 border-t border-dark-600/30 bg-dark-900/20">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-8 w-8 rounded-lg bg-dark-700 flex items-center justify-center font-bold text-xs text-slate-200 border border-dark-600">
                {user?.nome ? user.nome.charAt(0) : 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.nome}</p>
                <p className={`text-[10px] font-medium uppercase tracking-wider truncate ${roleColor[user?.role] || 'text-slate-400'}`}>
                  {roleLabel[user?.role] || user?.role}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-dark-600/20 pt-3">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-lg bg-dark-800/40 border border-dark-600/30 text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center"
                title={theme === 'dark' ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5" weight="duotone" /> : <Moon className="w-4.5 h-4.5" weight="duotone" />}
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-xs font-semibold text-red-400 hover:text-red-300 transition-all ml-auto"
                title="Sair da Conta"
              >
                <SignOut className="w-4 h-4" weight="duotone" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* 2. MOBILE HEADER (Top-bar fixa em telas < md) */}
      <header className="flex md:hidden sticky top-0 z-50 w-full h-16 items-center justify-between px-4 bg-dark-900/60 border-b border-dark-600/40 backdrop-blur-xl">
        {/* Toggle Burger Button */}
        {navItems.length > 0 && (
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-lg bg-dark-800/40 border border-dark-600/30 text-slate-300 hover:text-primary transition-colors flex items-center justify-center"
          >
            {isMobileMenuOpen ? <X size={20} /> : <List size={20} />}
          </button>
        )}

        {/* Mobile Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 px-2.5 rounded-md bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center shadow-md">
            <span className="text-xs font-black text-white uppercase tracking-wider">Senac</span>
          </div>
          <span className="text-xs font-black tracking-widest text-slate-100 uppercase mt-0.5">Renove</span>
        </Link>

        {/* Mobile User/Logout Quick Action */}
        <button
          onClick={handleLogout}
          className="p-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 text-red-400 transition-colors flex items-center justify-center"
          title="Sair"
        >
          <SignOut size={16} weight="duotone" />
        </button>
      </header>

      {/* 3. MOBILE HAMBURGER DRAWER (Menu deslizante com AnimatePresence) */}
      <AnimatePresence>
        {isMobileMenuOpen && navItems.length > 0 && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-45 bg-black/60 backdrop-blur-sm md:hidden"
            />

            {/* Side Drawer */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-72 max-w-[80vw] bg-dark-900 border-r border-dark-600 flex flex-col md:hidden shadow-2xl"
            >
              {/* Header inside drawer */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-dark-600/30 bg-dark-950/20">
                <div className="flex items-center gap-2">
                  <div className="h-8 px-2.5 rounded-md bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center">
                    <span className="text-xs font-black text-white uppercase">Senac</span>
                  </div>
                  <span className="text-xs font-bold text-slate-100 uppercase">Renove</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-dark-800 text-slate-400 hover:text-slate-200"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Links inside drawer */}
              <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
                {navItems.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                        active
                          ? 'text-primary bg-primary/10 border border-primary/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Footer inside drawer */}
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

      {/* 4. MAIN CONTENT CONTAINER (Padded left matching sidebar on desktop) */}
      <div className={`flex-1 flex flex-col min-h-screen ${user ? 'md:pl-64' : ''}`}>
        
        {/* Main Body */}
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

        {/* Footer */}
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
                t.type === 'warning' ? 'border-amber-500/30 text-amber-450' :
                'border-primary/30 text-primary'
              }`}
            >
              <div className="text-xl shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle weight="fill" />}
                {t.type === 'danger' && <Warning weight="fill" />}
                {t.type === 'warning' && <Warning weight="fill" />}
                {t.type === 'info' && <SquaresFour weight="fill" />}
              </div>
              <div className="flex-1">
                {t.title && <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wide mb-1">{t.title}</h4>}
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{t.message}</p>
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
