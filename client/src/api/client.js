import axios from 'axios';

export const TOKEN_KEY = 'hotelpro_token';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Session expired or account disabled: drop the token and tell the app.
    if (err.response?.status === 401 && localStorage.getItem(TOKEN_KEY)) {
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('hotelpro:logout'));
    }
    return Promise.reject(err);
  }
);

export function errorMessage(err) {
  const data = err?.response?.data;
  if (data?.details) {
    const [field, msgs] = Object.entries(data.details)[0] || [];
    if (field) {
      const msg = [].concat(msgs)[0];
      return field === '_form' ? msg : `${field}: ${msg}`;
    }
  }
  if (!err?.response && err?.request) return 'Cannot reach the server. Is the API running?';
  return data?.message || err?.message || 'Something went wrong';
}

export default api;
