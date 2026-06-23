import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import ChangePasswordForm from '../pages/ChangePasswordForm.jsx';

/**
 * Guardião de Primeiro Acesso:
 * Impede que o usuário acesse qualquer tela da aplicação (inclusive dashboard ou menu lateral)
 * caso a flag 'primeiro_acesso' esteja marcada como true no perfil.
 * Caso esteja ativa, força a exibição do formulário de troca de senha.
 */
export default function FirstAccessGuard({ children }) {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user?.primeiro_acesso === true) {
    return <ChangePasswordForm />;
  }

  return <>{children}</>;
}
