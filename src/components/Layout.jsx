import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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
    ti: 'text-cyan',
    professor: 'text-alert',
    aluno: 'text-blue-400'
  };

  const navItems = [];

  if (user?.role === 'ti') {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: '◆' },
      { to: '/emprestimos', label: 'Empréstimos', icon: '◈' },
      { to: '/equipamentos', label: 'Inventário', icon: '▣' },
      { to: '/historico', label: 'Histórico', icon: '◉' },
      { to: '/turmas', label: 'Turmas', icon: '▤' },
      { to: '/reservas', label: 'Reservas', icon: '▦' }
    );
  } else if (user?.role === 'professor') {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: '◆' },
      { to: '/emprestimos', label: 'Empréstimos', icon: '◈' },
      { to: '/historico', label: 'Histórico', icon: '◉' },
      { to: '/turmas', label: 'Turmas', icon: '▤' },
      { to: '/reservas', label: 'Reservas', icon: '▦' }
    );
  } else {
    navItems.push(
      { to: '/', label: 'Dashboard', icon: '◆' },
      { to: '/emprestimos', label: 'Empréstimos', icon: '◈' }
    );
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-navy-500/20 rounded-none">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan/20 to-transparent border border-cyan/30 flex items-center justify-center group-hover:border-cyan/50 transition-colors">
                <span className="text-sm font-black text-cyan font-mono tracking-tighter">R9</span>
              </div>
              <div className="absolute -inset-1 rounded-lg bg-cyan/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold tracking-widest text-slate-100 uppercase leading-none">
                Renove
              </p>
              <p className="text-[9px] text-slate-500 tracking-[0.25em] uppercase mt-0.5">
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
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-300 ${
                    active
                      ? 'text-cyan bg-cyan/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-navy-600/30'
                  }`}
                >
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-px bg-cyan/60 rounded-full" />
                  )}
                  <span className="mr-1.5 opacity-50 font-mono text-[10px]">{item.icon}</span>
                  {item.label}
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
              <svg className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden glass-card border-b border-navy-500/20 rounded-none overflow-x-auto">
        <div className="flex gap-1 px-4 py-2 min-w-max">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                  active ? 'text-cyan bg-cyan/10' : 'text-slate-400'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-navy-500/20 py-4 px-6">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] text-slate-600 tracking-wider uppercase">
            SENAC • Sistema Renove R9
          </p>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan/60 animate-pulse" />
            <span className="text-[10px] text-slate-600 font-mono">v1.0.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

