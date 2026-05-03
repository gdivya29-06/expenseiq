import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 (auto logout)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// -----------------------------
// AI + DASHBOARD APIs
// -----------------------------

export const getInsights = async () => {
  const res = await api.get('/ai/insights');
  return res.data;
};

export const getDailyLimit = async () => {
  const res = await api.get('/ai/daily-limit');
  return res.data;
};

export const getAlerts = async () => {
  const res = await api.get('/alerts');
  return res.data;
};
export const getPrediction = async () => {
  const res = await api.get('/ai/prediction');
  return res.data;
};
export const parseText = async (text) => {
  const res = await api.post('/ai/parse-text', { text });
  return res.data;
};
export default api;