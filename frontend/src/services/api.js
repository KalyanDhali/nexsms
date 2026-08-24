import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexsms_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('nexsms_refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('nexsms_access_token', data.accessToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('nexsms_access_token');
          localStorage.removeItem('nexsms_refresh_token');
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

export const getMyNumbers = () => api.get('/numbers/mine');
export const setPrimaryNumber = (id) => api.patch(`/numbers/${id}/primary`);
export const getAvailableNumbers = (params) => api.get('/numbers/available', { params });
