import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      if (typeof window !== "undefined") {
        token = localStorage.getItem('accessToken');
      }
    } catch (e) {
      console.error('Access to localStorage failed', e);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        let refreshToken = null;
        if (typeof window !== "undefined") {
            refreshToken = localStorage.getItem('refreshToken');
        }
        if (refreshToken) {
            const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}/auth/refresh`, {
                refreshToken
            });
            
            if (response.status === 200) {
                const { accessToken } = response.data;
                if (typeof window !== "undefined") {
                    localStorage.setItem('accessToken', accessToken);
                }
                api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
                return api(originalRequest);
            }
        }
      } catch (refreshError) {
          console.error("Token refresh failed", refreshError);
          // Fall through to logout logic
      }

      // Handle unauthorized access (e.g., redirect to login)
      try {
        if (typeof window !== "undefined") {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
        }
      } catch (e) {
        console.error('Failed to clear localStorage', e);
      }
      if (window.location.pathname !== '/login') {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
