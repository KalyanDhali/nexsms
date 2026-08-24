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

export const getPlans = () => api.get('/plans');
export const getBillingSettings = () => api.get('/billing/settings');
export const getWallet = () => api.get('/billing/wallet');
export const getSubscriptions = () => api.get('/billing/subscription');
export const subscribePlan = (payload) => api.post('/billing/subscribe', payload);
export const unsubscribePlan = () => api.post('/billing/unsubscribe');
export const getTransactions = () => api.get('/billing/transactions');
export const getPaymentGateways = () => api.get('/payments/gateways');
export const createDeposit = (payload) => api.post('/payments/deposit', payload);
export const getDeposits = () => api.get('/payments/deposits');

export const getAdminStats = () => api.get('/admin/stats');
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const updateAdminUser = (id, payload) => api.put(`/admin/users/${id}`, payload);
export const getAdminDeposits = (params) => api.get('/admin/deposits', { params });
export const getAdminToggles = () => api.get('/admin/toggles');
export const updateAdminToggle = (key, payload) => api.put(`/admin/toggles/${key}`, payload);
export const getAdminSettings = () => api.get('/admin/settings');
export const updateAdminSetting = (key, payload) => api.put(`/admin/settings/${key}`, payload);
export const getAdminGateways = () => api.get('/payments/gateways/all');
export const createGateway = (payload) => api.post('/payments/gateways', payload);
export const updateGateway = (id, payload) => api.put(`/payments/gateways/${id}`, payload);
export const confirmDeposit = (id, payload) => api.post(`/payments/deposit/${id}/confirm`, payload);
export const getAdminProviders = () => api.get('/providers');
export const createProvider = (payload) => api.post('/providers', payload);
export const updateProvider = (id, payload) => api.put(`/providers/${id}`, payload);
export const toggleProvider = (id, payload) => api.patch(`/providers/${id}/toggle`, payload);
export const providerHealthCheck = (id) => api.post(`/providers/${id}/health`);
export const providerTestConnection = (payload) => api.post('/providers/test-connection', payload);
export const getPoolNumbers = (params) => api.get('/numbers/pool', { params });
export const createNumber = (payload) => api.post('/numbers', payload);
export const assignNumber = (id, payload) => api.post(`/numbers/${id}/assign`, payload);
export const revokeNumber = (id) => api.post(`/numbers/${id}/revoke`);
export const blockNumber = (id, blocked) => api.patch(`/numbers/${id}/block`, { blocked });
export const getPoolStats = () => api.get('/numbers/pool/stats');
export const getAdminPlans = () => api.get('/plans/all');
export const createPlan = (payload) => api.post('/plans', payload);
export const updatePlan = (id, payload) => api.put(`/plans/${id}`, payload);
export const deletePlan = (id) => api.delete(`/plans/${id}`);

export const getFraudOrders = (params) => api.get('/admin/fraud/orders', { params });
export const approveFraudOrder = (id, payload) => api.post(`/admin/fraud/orders/${id}/approve`, payload);
export const rejectFraudOrder = (id) => api.post(`/admin/fraud/orders/${id}/reject`);
export const getBlocklist = () => api.get('/admin/fraud/blocklist');
export const addBlocklist = (payload) => api.post('/admin/fraud/blocklist', payload);
export const removeBlocklist = (ip) => api.delete(`/admin/fraud/blocklist/${ip}`);
