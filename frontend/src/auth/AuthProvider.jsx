import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const accessToken = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');
        
        if (accessToken && storedUser && storedUser !== "undefined" && storedUser !== "null") {
          try {
              setUser(JSON.parse(storedUser));
          } catch (parseError) {
              console.warn("Corrupt user data in localStorage, clearing.");
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              localStorage.removeItem('user');
          }
        }
      }
    } catch (e) {
      console.error("Failed to access localStorage", e);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        // Backend returns: { accessToken, refreshToken, id, name, email, role }
        const { accessToken, refreshToken, ...userData } = response.data;

        try {
          if (typeof window !== "undefined") {
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', refreshToken);
              localStorage.setItem('user', JSON.stringify(userData));
          }
        } catch (e) {
          console.error("Failed to save to localStorage", e);
        }
        setUser(userData);
        return userData;
    } catch (error) {
        console.error("Login failed", error);
        throw error;
    }
  };

  const logout = () => {
    try {
      if (typeof window !== "undefined") {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
      }
    } catch (e) {
      console.error("Failed to clear localStorage", e);
    }
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
