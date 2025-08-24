import axios from 'axios';

export const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || 'http://10.0.0.215:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL
});

export default api;