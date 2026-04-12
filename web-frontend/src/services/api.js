import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000/api`;

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Attach token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - auto logout
api.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (data) => api.put('/auth/profile', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (data) => api.put('/auth/change-password', data),
  getUsers: () => api.get('/auth/users'),
  toggleUser: (id) => api.patch(`/auth/users/${id}/toggle`)
};

// ─── Customers ───────────────────────────────────────────
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  addNote: (id, content) => api.post(`/customers/${id}/notes`, { content }),
  getStats: () => api.get('/customers/stats')
};

// ─── Installments ────────────────────────────────────────
export const installmentsAPI = {
  getAll: (params) => api.get('/installments', { params }),
  getOne: (id) => api.get(`/installments/${id}`),
  create: (data) => api.post('/installments', data),
  update: (id, data) => api.put(`/installments/${id}`, data),
  delete: (id) => api.delete(`/installments/${id}`),
  cancel: (id) => api.patch(`/installments/${id}/cancel`),
  calculate: (data) => api.post('/installments/calculate', data),
  getDashboard: () => api.get('/installments/dashboard')
};

// ─── Payments ────────────────────────────────────────────
export const paymentsAPI = {
  record: (paymentId, data) => api.post(`/payments/${paymentId}/record`, data),
  getPlanPayments: (planId) => api.get(`/payments/plan/${planId}`),
  getCustomerPayments: (customerId) => api.get(`/payments/customer/${customerId}`),
  getOverdue: () => api.get('/payments/overdue'),
  downloadReceipt: (paymentId) => api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' }),
  waive: (paymentId, reason) => api.patch(`/payments/${paymentId}/waive`, { reason })
};

// ─── Reports ─────────────────────────────────────────────
export const reportsAPI = {
  getOverview: (period) => api.get('/reports/overview', { params: { period } }),
  getMonthlyChart: (year) => api.get('/reports/monthly-chart', { params: { year } }),
  getDistribution: () => api.get('/reports/payment-distribution'),
  getTopCustomers: () => api.get('/reports/top-customers'),
  exportExcel: (type, period) => api.get('/reports/export/excel', {
    params: { type, period }, responseType: 'blob'
  })
};

// ─── Notifications ───────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getCount: () => api.get('/notifications/count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

// ─── AI ──────────────────────────────────────────────────
export const aiAPI = {
  chat: (message) => api.post('/ai/chat', { message }),
  getPredictions: () => api.get('/ai/predictions'),
  getInsights: () => api.get('/ai/insights')
};

export default api;
