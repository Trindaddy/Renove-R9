import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../components/Layout.jsx';

import Login from '../pages/Login.jsx';
import Home from '../pages/Home.jsx';
import Equipamentos from '../pages/Equipamentos.jsx';
import Turmas from '../pages/Turmas.jsx';
import Reservas from '../pages/Reservas.jsx';
import Solicitacoes from '../pages/Solicitacoes.jsx';

function PrivateRoute({ allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300">
        Carregando sessão...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<PrivateRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/solicitacoes" element={<Solicitacoes />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['ti']} />}>
        <Route path="/equipamentos" element={<Equipamentos />} />
      </Route>

      <Route element={<PrivateRoute allowedRoles={['professor', 'ti']} />}>
        <Route path="/turmas" element={<Turmas />} />
        <Route path="/reservas" element={<Reservas />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export { PrivateRoute };

