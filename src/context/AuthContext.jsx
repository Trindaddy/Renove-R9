import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest, getMeRequest } from '../services/authService';
import { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const storedUser = localStorage.getItem('r9:user');
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.token) {
            setAuthToken(parsed.token);
            // Verify token is still valid by fetching user
            const me = await getMeRequest();
            setUser({ ...parsed, ...me });
          }
        } catch (err) {
          // Token expired or invalid
          localStorage.removeItem('r9:user');
          setAuthToken(null);
        }
      }
      setLoading(false);
    }
    init();
  }, []);

  async function login(email, password) {
    try {
      const tokenData = await loginRequest(email, password);
      setAuthToken(tokenData.access_token);

      // Fetch user details
      const me = await getMeRequest();
      const loggedUser = {
        id: me.id,
        nome: me.nome,
        role: me.role,
        email: me.email,
        token: tokenData.access_token
      };

      setUser(loggedUser);
      localStorage.setItem('r9:user', JSON.stringify(loggedUser));
      return { ok: true };
    } catch (error) {
      setAuthToken(null);
      return {
        ok: false,
        message:
          error.response?.data?.detail ||
          'Não foi possível autenticar. Verifique suas credenciais.'
      };
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('r9:user');
    setAuthToken(null);
  }

  const value = {
    user,
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

