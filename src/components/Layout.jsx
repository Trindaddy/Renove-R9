import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { motion } from 'framer-motion';
import { 
  SquaresFour, 
  Laptop, 
  Archive, 
  ClockCounterClockwise, 
  Users, 
  CalendarCheck,
  SignOut
} from '@phosphor-icons/react';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
      { to: '/equipamentos', label: 'Inventário', icon: <Archive weight="duotone" /> },
      { to: '/historico', label: 'Histórico', icon: <ClockCounterClockwise weight="duotone" /> },
      { to: '/turmas', label: 'Turmas', icon: <Users weight="duotone" /> },
      { to: '/reservas', label: 'Reservas', icon: <CalendarCheck weight="duotone" /> }
    );
  } else if (user?.role === 'professor') {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: <SquaresFour weight="duotone" /> },
      { to: '/emprestimos', label: 'Empréstimos', icon: <Laptop weight="duotone" /> },
      { to: '/historico', label: 'Histórico', icon: <ClockCounterClockwise weight="duotone" /> },
      { to: '/reservas', label: 'Reservas', icon: <CalendarCheck weight="duotone" /> }
    );
  } else {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: <SquaresFour weight="duotone" /> },
      { to: '/emprestimos', label: 'Empréstimos', icon: <Laptop weight="duotone" /> }
    );
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-dark-600 rounded-none bg-dark-900/60">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-9 px-3 rounded-lg bg-gradient-to-br from-senac-orange/90 to-senac-orange/70 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="text-sm font-black text-white tracking-widest uppercase">Senac</span>
              </div>
              <div className="absolute -inset-1 rounded-lg bg-senac-orange/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:flex flex-col justify-center">
              <p className="text-sm font-bold tracking-widest text-slate-100 uppercase leading-none mt-0.5">
                Renove
              </p>
              <p className="text-[9px] text-senac-blue tracking-[0.25em] uppercase mt-1 font-semibold">
                Gestão de Ativos
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative px-4 py-2 rounded-lg text-xs font-medium tracking-wide transition-colors ${
                    active
                      ? 'text-primary'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-dark-700/50'
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="relative flex items-center gap-2 z-10">
                    <span className="text-lg opacity-80">{item.icon}</span>
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-200">{user?.nome?.split(' ')[0]}</span>
              <span className={`text-[10px] font-medium uppercase tracking-wider ${roleColor[user?.role] || 'text-slate-400'}`}>
                {roleLabel[user?.role] || user?.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="group relative p-2 rounded-lg hover:bg-red-500/10 transition-colors"
              title="Sair"
            >
              <SignOut className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" weight="duotone" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden glass-card border-b border-dark-600 rounded-none overflow-x-auto bg-dark-900/60">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  active ? 'text-primary bg-primary/10 border border-primary/20' : 'text-slate-400'
                }`}
              >
                <span className="text-sm opacity-80">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
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
      <footer className="border-t border-dark-600/50 py-4 px-6 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500 tracking-wider uppercase">
            SENAC • Sistema Integrado Renove
          </p>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/60 animate-pulse" />
            <span className="text-[10px] text-slate-500 font-mono">v2.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

