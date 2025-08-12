import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // já pega o token direto do localStorage
  const [token, setToken] = useState(() => localStorage.getItem('cobraii_token'));

  const login = (newToken) => {
    localStorage.setItem('cobraii_token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('cobraii_token');
    setToken(null);
    window.location.href = '/login';
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
