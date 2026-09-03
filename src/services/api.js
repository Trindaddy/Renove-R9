import axios from 'axios';

// Armazenamento de token com fallback para localStorage
let inMemoryToken = typeof window !== 'undefined' ? localStorage.getItem('r9:token') : null;
let unauthorizedCallback = null;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
});

// Interceptor de Requisição: Injeta o token Bearer se ele existir
api.interceptors.request.use(
  (config) => {
    const token = inMemoryToken || (typeof window !== 'undefined' ? localStorage.getItem('r9:token') : null);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta: Trata 401/403 de forma centralizada apenas para rotas protegidas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const requestUrl = error.config?.url || '';
      const isAuthRoute = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/primeiro-acesso') || requestUrl.includes('/auth/me');
      const isAlreadyOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';

      if (!isAuthRoute && !isAlreadyOnLoginPage) {
        const detail = error.response.data?.detail;
        if (unauthorizedCallback) {
          unauthorizedCallback(detail);
        } else {
          localStorage.removeItem('r9:user');
          localStorage.removeItem('r9:token');
          inMemoryToken = null;
          window.location.href = '/login?expired=true';
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Atualiza o token JWT em memória e nos cabeçalhos padrão do Axios.
 */
export function setAuthToken(token) {
  inMemoryToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('r9:token', token);
    }
  } else {
    delete api.defaults.headers.common['Authorization'];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('r9:token');
    }
  }
}

/**
 * Registra a função de callback a ser chamada quando ocorrer 401/403.
 */
export function registerUnauthorizedCallback(cb) {
  unauthorizedCallback = cb;
}

export default api;
