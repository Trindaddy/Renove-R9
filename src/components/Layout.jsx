import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navLinkBase =
  'px-3 py-1 rounded text-sm font-medium transition-colors hover:bg-senac-blue/20';

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-full bg-senac-orange flex items-center justify-center text-xs font-black">
              R9
            </span>
            <div>
              <p className="text-sm font-semibold tracking-wide">
                Gestão de Notebooks
              </p>
              <p className="text-[11px] text-slate-400">Senac</p>
            </div>
          </Link>

          {user && (
            <nav className="flex-1 flex items-center justify-center gap-2 text-xs">
              <RoleAwareLinks role={user.role} />
            </nav>
          )}

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="text-right">
                  <p className="text-xs font-medium">{user.nome}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">
                    {user.role}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="text-xs px-3 py-1 rounded border border-slate-700 hover:border-senac-orange hover:text-senac-orange transition-colors"
                >
                  Sair
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="text-xs px-3 py-1 rounded bg-senac-orange text-slate-950 font-semibold"
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

function RoleAwareLinks({ role }) {
  const common = [
    { to: '/', label: 'Home' },
    { to: '/solicitacoes', label: 'Solicitações' }
  ];

  const professorAndTi = [
    { to: '/turmas', label: 'Turmas' },
    { to: '/reservas', label: 'Reservas' }
  ];

  const onlyTi = [{ to: '/equipamentos', label: 'Equipamentos' }];

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
        `${navLinkBase} ${isActive ? 'bg-senac-blue/40 text-white' : 'text-slate-200'}`
      }
    >
      {link.label}
    </NavLink>
  ));
}

