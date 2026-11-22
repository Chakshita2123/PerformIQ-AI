import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

/**
 * AuthContext — central state management for authentication.
 * Manages user object, token storage in localStorage, and login/logout methods.
 */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('performiq_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('performiq_token'));
  const [loading, setLoading] = useState(true);

  // Validate active session with the backend on initial load
  useEffect(() => {
    const verifySession = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success && res.data?.data?.user) {
            setUser(res.data.data.user);
            localStorage.setItem('performiq_user', JSON.stringify(res.data.data.user));
          }
        } catch {
          // 401 response interceptor in client.js automatically clears storage
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    verifySession();
  }, [token]);

  // Login handler
  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data) {
        const { token: newToken, user: newUser } = res.data.data;
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('performiq_token', newToken);
        localStorage.setItem('performiq_user', JSON.stringify(newUser));
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid credentials or server unavailable';
      return { success: false, message };
    }
  };

  // Logout handler
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('performiq_token');
    localStorage.removeItem('performiq_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        isTeacher: user?.role === 'teacher',
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
