import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, getMeRequest } from '../services/authService';
import api, { setAuthToken, registerUnauthorizedCallback } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // JWT armazenado apenas em estado de memória
  const [loading, setLoading] = useState(true);

  // Função centralizada de logout
  function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    localStorage.removeItem('r9:user');
  }

  useEffect(() => {
    async function init() {
      // Registra o callback do Axios para deslogar automaticamente em erros 401/403
      registerUnauthorizedCallback((detail) => {
        logout();
        if (
          detail === 'Conta suspensa/inativa' || 
          detail === 'Esta conta está inativa/suspensa. Entre em contato com o administrador.'
        ) {
          window.location.href = '/login?suspended=true';
        } else {
          window.location.href = '/login?expired=true';
        }
      });

      const storedUser = localStorage.getItem('r9:user');
      if (storedUser) {
        try {
          // Em um modelo Zero Trust (BFF / HttpOnly), ao recarregar a página,
          // o cookie seguro envia a sessão e obtemos os dados de perfil
          const me = await getMeRequest();
          
          setUser({
            id: me.id,
            nome: me.nome,
            role: me.role,
            email: me.email,
            primeiro_acesso: me.primeiro_acesso
          });
        } catch (err) {
          // Token expirado ou sem cookie de sessão ativo
          logout();
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function login(email, password) {
    try {
      const tokenData = await loginRequest(email, password);
      
      // Armazena o token na memória (React State + api.js local variable)
      setToken(tokenData.access_token);
      setAuthToken(tokenData.access_token);

      // Busca dados de perfil do usuário
      const me = await getMeRequest();
      
      const loggedUser = {
        id: me.id,
        nome: me.nome,
        role: me.role,
        email: me.email,
        primeiro_acesso: me.primeiro_acesso
      };

      setUser(loggedUser);
      
      // Salva apenas metadados no localStorage (SEM TOKEN)
      localStorage.setItem('r9:user', JSON.stringify(loggedUser));
      return { ok: true };
    } catch (error) {
      logout();
      return {
        ok: false,
        message:
          error.response?.data?.detail ||
          'Não foi possível autenticar. Verifique suas credenciais.'
      };
    }
  }

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
