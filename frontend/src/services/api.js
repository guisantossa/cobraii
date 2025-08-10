// services/api.js
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 20000,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cobraii_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Se receber 401/403, apaga token e manda pro login
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if ((status === 401 || status === 403) && !isRedirecting) {
      isRedirecting = true;
      try {
        localStorage.removeItem('cobraii_token');
      } finally {
        // evita loop: só redireciona se não estiver já no /login
        const isOnLogin = window.location.pathname.startsWith('/login');
        if (!isOnLogin) window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);


export default api
