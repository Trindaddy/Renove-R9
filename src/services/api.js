import axios from 'axios';

const api = axios.create({
  // Em produção, use Nginx para proxyar /api -> backend
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const detail = error.response.data?.detail;
      if (
        detail === 'Conta suspensa/inativa' || 
        detail === 'Esta conta está inativa/suspensa. Entre em contato com o administrador.'
      ) {
        localStorage.removeItem('r9:user');
        delete api.defaults.headers.common.Authorization;
        window.location.href = '/login?suspended=true';
      }
    }
    return Promise.reject(error);
  }
);

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export default api;

