// API Service
// Handles all API calls to the backend

import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Auth API
export const authAPI = {
  login: (email, password) => axiosInstance.post('/auth/login', { email, password }),
  getProfile: () => axiosInstance.get('/auth/me'),
  changePassword: (oldPassword, newPassword) => 
    axiosInstance.post('/auth/change-password', { oldPassword, newPassword })
};

// Students API
export const studentAPI = {
  getAll: (page = 1, limit = 10, filters = {}) => 
    axiosInstance.get('/students', { params: { page, limit, ...filters } }),
  getById: (id) => axiosInstance.get(`/students/${id}`),
  create: (data) => axiosInstance.post('/students', data),
  update: (id, data) => axiosInstance.put(`/students/${id}`, data),
  delete: (id) => axiosInstance.delete(`/students/${id}`),
  search: (query) => axiosInstance.get('/students/search', { params: { query } }),
  getPaymentSummary: (id) => axiosInstance.get(`/students/${id}/payment-summary`)
};

// Payments API
export const paymentAPI = {
  getAll: (page = 1, limit = 10, filters = {}) => 
    axiosInstance.get('/payments', { params: { page, limit, ...filters } }),
  getById: (id) => axiosInstance.get(`/payments/${id}`),
  create: (data) => axiosInstance.post('/payments', data),
  update: (id, data) => axiosInstance.put(`/payments/${id}`, data),
  delete: (id) => axiosInstance.delete(`/payments/${id}`),
  getSummary: (fromDate, toDate) => 
    axiosInstance.get('/payments/summary', { params: { from_date: fromDate, to_date: toDate } }),
  generateInvoice: (studentId, feeId) => 
    axiosInstance.get(`/payments/${studentId}/invoice/${feeId}`)
};

// Expenses API
export const expenseAPI = {
  getAll: (page = 1, limit = 10, filters = {}) => 
    axiosInstance.get('/expenses', { params: { page, limit, ...filters } }),
  getById: (id) => axiosInstance.get(`/expenses/${id}`),
  create: (data) => axiosInstance.post('/expenses', data),
  update: (id, data) => axiosInstance.put(`/expenses/${id}`, data),
  approve: (id) => axiosInstance.put(`/expenses/${id}/approve`),
  delete: (id) => axiosInstance.delete(`/expenses/${id}`),
  getSummary: (fromDate, toDate) => 
    axiosInstance.get('/expenses/summary', { params: { from_date: fromDate, to_date: toDate } }),
  getCategories: () => axiosInstance.get('/expenses/categories')
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => axiosInstance.get('/dashboard/stats'),
  getDailyReport: (date) => axiosInstance.get('/dashboard/report/daily', { params: { date } }),
  getMonthlyReport: (year, month) => 
    axiosInstance.get('/dashboard/report/monthly', { params: { year, month } })
};

export default axiosInstance;
