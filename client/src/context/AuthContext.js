// client/src/context/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import axios from '../services/api';
import { toast } from 'react-toastify';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  // Load persisted auth from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedToken);
    }
  }, []);

  // Save to localStorage when auth changes
  useEffect(() => {
    if (user && accessToken) {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
    }
  }, [user, accessToken]);

  // Refresh token logic
  const refreshAccessToken = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return;
    try {
      const { data } = await axios.post('/auth/refresh', { refreshToken });
      setAccessToken(data.accessToken);
    } catch (err) {
      console.error('Refresh failed', err);
      logout();
    }
  }, []);

  // Intercept 401 globally
  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      res => res,
      async error => {
        const originalRequest = error.config;
        if (error.response && error.response.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          await refreshAccessToken();
          originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
          return axios(originalRequest);
        }
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [refreshAccessToken]);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      const { accessToken: at, refreshToken: rt, user: loggedUser } = data;
      setUser(loggedUser);
      setAccessToken(at);
      localStorage.setItem('refreshToken', rt);
      toast.success('Logged in successfully');
    } catch (err) {
      console.error(err);
      toast.error('Login failed');
    }
  };

  const logout = () => {
    const rt = localStorage.getItem('refreshToken');
    if (rt) {
      axios.post('/auth/logout', { refreshToken: rt }).catch(() => {});
    }
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('refreshToken');
    toast.info('Logged out');
  };

  const value = {
    user,
    accessToken,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole: role => user && user.role === role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
