import api from './api';

const marketplaceApi = {
  // Books
  getBooks: (params = {}) => api.get('/marketplace/books', { params }),
  addBook: (data) => api.post('/marketplace/books', data),
  updateBook: (id, data) => api.put(`/marketplace/books/${id}`, data),
  deleteBook: (id) => api.delete(`/marketplace/books/${id}`),

  // Orders
  getOrders: (params = {}) => api.get('/marketplace/orders', { params }),
  placeOrder: (data) => api.post('/marketplace/orders', data),
  updateOrderStatus: (id, status) => api.put(`/marketplace/orders/${id}/status`, { status }),
  getStats: () => api.get('/marketplace/stats'),
};

export default marketplaceApi;
