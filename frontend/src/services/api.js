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

export const getDidStore = (params) => api.get('/numbers/did/store', { params });
export const rentDidNumber = (id) => api.post(`/numbers/did/${id}/rent`);
export const renewDidNumber = (id) => api.post(`/numbers/did/${id}/renew`);
export const releaseDidNumber = (id) => api.post(`/numbers/did/${id}/release`);
export const updateNumberPricing = (id, payload) => api.patch(`/numbers/${id}/pricing`, payload);

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

export const getApiKeys = () => api.get('/keys');
export const createApiKey = (payload) => api.post('/keys', payload);
export const revokeApiKey = (id) => api.post(`/keys/${id}/revoke`);

export const getKyc = () => api.get('/kyc');
export const submitKyc = (payload) => api.post('/kyc', payload);
export const getReferral = () => api.get('/kyc/referral');
export const getBonusStatus = () => api.get('/billing/bonus/status');
export const claimBonus = () => api.post('/billing/bonus/claim');
export const adminGetKyc = (params) => api.get('/admin/kyc', { params });
export const adminApproveKyc = (id) => api.post(`/admin/kyc/${id}/approve`);
export const adminRejectKyc = (id, payload) => api.post(`/admin/kyc/${id}/reject`, payload);
export const providerTestConnection = (payload) => api.post('/providers/test-connection', payload);
export const getPoolNumbers = (params) => api.get('/numbers/pool', { params });
export const createNumber = (payload) => api.post('/numbers', payload);
export const assignNumber = (id, payload) => api.post(`/numbers/${id}/assign`, payload);
export const selfAssignNumber = (id) => api.post(`/numbers/available/${id}/assign`);
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

export const getTemplates = () => api.get('/templates');
export const createTemplate = (payload) => api.post('/templates', payload);
export const updateTemplate = (id, payload) => api.put(`/templates/${id}`, payload);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);
export const adminGetTemplates = () => api.get('/templates/all');

export const getUserWebhooks = () => api.get('/user-webhooks');
export const createUserWebhook = (payload) => api.post('/user-webhooks', payload);
export const updateUserWebhook = (id, payload) => api.put(`/user-webhooks/${id}`, payload);
export const deleteUserWebhook = (id) => api.delete(`/user-webhooks/${id}`);

export const getAiRules = () => api.get('/ai/rules');
export const createAiRule = (payload) => api.post('/ai/rules', payload);
export const updateAiRule = (id, payload) => api.put(`/ai/rules/${id}`, payload);
export const deleteAiRule = (id) => api.delete(`/ai/rules/${id}`);
export const getAiSuggestions = (text) => api.get('/ai/suggestions', { params: { text } });

export const getConversations = () => api.get('/messages/conversations');
export const getConversationMessages = (id, params) => api.get(`/messages/conversations/${id}/messages`, { params });
export const getMessageDetails = (id) => api.get(`/messages/${id}`);
export const deleteMessage = (id) => api.delete(`/messages/${id}`);
export const deleteConversations = (ids) => api.delete('/messages/conversations', { data: { ids } });
export const getScheduledMessages = () => api.get('/messages/scheduled');
export const cancelScheduledMessage = (id) => api.post(`/messages/scheduled/${id}/cancel`);
export const createConversation = (payload) => api.post('/messages/conversations', payload);
export const sendSms = (payload) => api.post('/messages/send', payload);
export const getUserAnalytics = () => api.get('/messages/analytics');
export const sendBlast = (payload) => api.post('/messages/blast', payload);
export const uploadSmsImage = (payload) => api.post('/uploads', payload);
export const pinConversation = (id, pinned) => api.post(`/messages/conversations/${id}/pin`, { pinned });
export const favoriteConversation = (id, favorite) => api.post(`/messages/conversations/${id}/favorite`, { favorite });
export const reactToMessage = (id, reaction) => api.post(`/messages/${id}/reaction`, { reaction });
export const searchConversationMessages = (id, q) => api.get(`/messages/conversations/${id}/search`, { params: { q } });
export const exportConversation = (id, format) => api.get(`/messages/conversations/${id}/export`, { params: { format }, responseType: 'blob' });

export const getAdminAnalytics = () => api.get('/admin/analytics');
export const getAdminApiKeys = () => api.get('/admin/keys');
export const revokeAdminApiKey = (id) => api.post(`/admin/keys/${id}/revoke`);
export const getAdminWhitelist = () => api.get('/admin/whitelist');
export const addAdminWhitelist = (payload) => api.post('/admin/whitelist', payload);
export const removeAdminWhitelist = (ip) => api.delete(`/admin/whitelist/${ip}`);

export const getUserProfile = () => api.get('/auth/profile');
export const changePassword = (payload) => api.post('/auth/change-password', payload);
export const sendTwoFactorCode = () => api.post('/auth/2fa/send-code');
export const verifyTwoFactorCode = (payload) => api.post('/auth/2fa/verify-code', payload);
export const verifyTwoFactorLogin = (payload) => api.post('/auth/2fa/verify-login', payload);

export const getContacts = (q) => api.get('/contacts', { params: q ? { q } : {} });
export const createContact = (payload) => api.post('/contacts', payload);
export const updateContact = (id, payload) => api.put(`/contacts/${id}`, payload);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const importContacts = (contacts) => api.post('/contacts/import', { contacts });
export const getContactGroups = () => api.get('/contacts/groups');
export const createContactGroup = (name) => api.post('/contacts/groups', { name });
export const deleteContactGroup = (id) => api.delete(`/contacts/groups/${id}`);
export const blastContactGroup = (id, payload) => api.post(`/contacts/groups/${id}/blast`, payload);

export const getNotifications = () => api.get('/notifications');
export const markAllNotificationsRead = () => api.post('/notifications/read-all');
export const markNotificationRead = (id) => api.post(`/notifications/${id}/read`);
