import { authAPI } from './api';

export interface User {
  id: number;
  email: string;
  name: string;
  phone?: string;
  userType: 'user' | 'hospital-authority' | 'admin';
  role?: string;
  hospitalId?: number;
  permissions?: string;
  balance?: number; // Add balance property to match the database schema
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Login function
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await authAPI.login({ email, password });
    const { user, token } = response.data.data;
    
    // Store token in localStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    return { user, token };
  } catch (error: any) {
    // Preserve the original error response for better error handling
    if (error.response?.data?.error) {
      const authError = new Error(error.response.data.error);
      (authError as any).response = error.response;
      throw authError;
    }
    throw error;
  }
};

// Logout function
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  // Use window.location.href for navigation outside of React components
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

// Get token
export const getToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return getToken() !== null;
};

// Check if user is hospital authority
export const isHospitalAuthority = (): boolean => {
  const user = getCurrentUser();
  return user?.userType === 'hospital-authority';
};

// Check if user has permission
export const hasPermission = (permission: string): boolean => {
  const user = getCurrentUser();
  if (!user?.permissions) return false;
  
  try {
    const permissions = JSON.parse(user.permissions);
    return permissions.includes(permission);
  } catch {
    return false;
  }
};

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.userType === 'admin';
};