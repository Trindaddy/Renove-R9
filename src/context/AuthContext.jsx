import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginRequest } from '../services/authService';
import { setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('r9:user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      if (parsed.token) {
        setAuthToken(parsed.token);
      }
    }
    setLoading(false);
  }, []);

  async function login(email, password) {
    try {
      const data = await loginRequest(email, password);
      const loggedUser = {
        id: data.id,
        nome: data.nome,
        role: data.role,
        email: data.email,
        token: data.token
      };

      setUser(loggedUser);
      localStorage.setItem('r9:user', JSON.stringify(loggedUser));
      setAuthToken(loggedUser.token);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message:
          error.response?.data?.message ||
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
