import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';
import FirstAccessGuard from '../components/FirstAccessGuard.jsx';

import Login from '../pages/Login.jsx';
import Home from '../pages/Home.jsx';
import Equipamentos from '../pages/Equipamentos.jsx';
import Turmas from '../pages/Turmas.jsx';
import Reservas from '../pages/Reservas.jsx';
import Solicitacoes from '../pages/Solicitacoes.jsx';
import Emprestimos from '../pages/Emprestimos.jsx';
import Historico from '../pages/Historico.jsx';
import Alocacoes from '../pages/Alocacoes.jsx';
import Usuarios from '../pages/Usuarios.jsx';
import AcessoNegado from '../pages/AcessoNegado.jsx';

function PrivateRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 text-primary">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse delay-75" />
          <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse delay-150" />
          <span className="text-xs font-semibold tracking-widest text-slate-300 uppercase">
            Carregando ambiente seguro...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // RBAC: Se o papel do usuário não estiver incluído nos papéis permitidos,
  // redireciona para a página personalizada de erro 403 (Acesso Negado)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  // Envolvemos o layout no FirstAccessGuard para garantir que usuários no primeiro acesso
  // sejam redirecionados exclusivamente para o formulário de alteração de senha.
  return (
    <FirstAccessGuard>
      <Layout>
        <Outlet />
      </Layout>
    </FirstAccessGuard>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/acesso-negado" element={<AcessoNegado />} />

      {/* Rota Privada Geral (Qualquer papel autenticado) */}
      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Home />} />
      </Route>

      {/* Rotas Restritas - Apenas TI (Administradores) */}
      <Route element={<PrivateRoute allowedRoles={['ti']} />}>
        <Route path="/equipamentos" element={<Equipamentos />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>

      {/* Rotas Restritas - Professores e TI */}
      <Route element={<PrivateRoute allowedRoles={['professor', 'ti']} />}>
        <Route path="/emprestimos" element={<Emprestimos />} />
        <Route path="/alocacoes" element={<Alocacoes />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/reservas" element={<Reservas />} />
        <Route path="/historico" element={<Historico />} />
      </Route>

      {/* Redirecionamento Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export { PrivateRoute };
