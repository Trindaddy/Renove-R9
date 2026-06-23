import axios from 'axios';

// Armazenamento em memória (In-Memory) para mitigar vulnerabilidades XSS
let inMemoryToken = null;
let unauthorizedCallback = null;

const api = axios.create({
  // Em produção, use Nginx para proxyar /api -> backend
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Crucial para permitir envio automático de cookies HttpOnly
});

// Interceptor de Requisição: Injeta o token Bearer em memória se ele existir
api.interceptors.request.use(
  (config) => {
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta: Trata 401/403 de forma centralizada e desloga o usuário
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const detail = error.response.data?.detail;
      
      // Se for conta suspensa ou sessão expirada/inválida, desloga e redireciona
      if (unauthorizedCallback) {
        unauthorizedCallback(detail);
      } else {
        localStorage.removeItem('r9:user');
        inMemoryToken = null;
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Atualiza o token JWT em memória.
 */
export function setAuthToken(token) {
  inMemoryToken = token;
}

/**
 * Registra a função de callback a ser chamada quando ocorrer 401/403.
 */
export function registerUnauthorizedCallback(cb) {
  unauthorizedCallback = cb;
}

export default api;
