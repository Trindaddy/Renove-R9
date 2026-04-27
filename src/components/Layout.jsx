import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navLinkBase =
  'px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-all duration-300 hover:bg-cyan-dim hover:text-cyan';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      {/* Grid background effect */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(100,255,218,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(100,255,218,0.3) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      <header className="relative border-b border-navy-500/30 bg-navy-900/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-cyan/20 to-cyan/5 border border-cyan/30 flex items-center justify-center">
                <span className="text-sm font-black text-cyan font-mono tracking-tighter">R9</span>
              </div>
              <div className="absolute -inset-1 rounded-lg bg-cyan/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-widest text-slate-100 uppercase">
                Renove <span className="text-cyan">R9</span>
              </p>
              <p className="text-[10px] text-slate-500 tracking-[0.2em] uppercase">Sistema de Gestão de Ativos</p>
            </div>
          </Link>

          {user && (
            <nav className="flex-1 flex items-center justify-center gap-1">
              <RoleAwareLinks role={user.role} />
            </nav>
          )}

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-slate-200">{user.nome}</p>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-cyan/60">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-xs px-4 py-1.5 rounded-lg border border-navy-500/50 text-slate-400 hover:border-alert/50 hover:text-alert transition-all duration-300"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-xs px-5 py-2 rounded-lg bg-alert text-navy-900 font-bold hover:shadow-glow-alert transition-all duration-300"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>

      {/* Footer tech line */}
      <div className="h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
    </div>
  );
}

function RoleAwareLinks({ role }) {
  const common = [
    { to: '/', label: 'Dashboard' },
    { to: '/emprestimos', label: 'Empréstimos' },
    { to: '/solicitacoes', label: 'Solicitações' }
  ];

  const professorAndTi = [
    { to: '/turmas', label: 'Turmas' },
    { to: '/reservas', label: 'Reservas' },
    { to: '/historico', label: 'Histórico' }
  ];

  const onlyTi = [{ to: '/equipamentos', label: 'Inventário' }];

  const links = [...common];

  if (role === 'professor' || role === 'ti') {
    links.push(...professorAndTi);
  }

  if (role === 'ti') {
    links.push(...onlyTi);
  }

  return links.map((link) => (
    <NavLink
      key={link.to}
      to={link.to}
      className={({ isActive }) =>
        `${navLinkBase} ${isActive ? 'bg-cyan-dim text-cyan border border-cyan/20' : 'text-slate-400 border border-transparent'}`
      }
    >
      {link.label}
    </NavLink>
  ));
}

