import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

export interface User {
    id: number;
    login: string;
    role: string;
    fullName: string;
    department?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, userData: User) => void;
    logout: () => void;
    setSimulatedRole: (role: string | null) => void;
    simulatedRole: string | null;
    originalRole: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [simulatedRole, setSimulatedRoleState] = useState<string | null>(null);
    const [originalUser, setOriginalUser] = useState<User | null>(null);

    useEffect(() => {
        // Check local storage for existing session
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedSimRole = localStorage.getItem('simulatedRole');

        if (storedToken && storedUser) {
            try {
                const decodedToken = jwtDecode(storedToken);
                const currentTime = Date.now() / 1000;

                // Ensure token hasn't expired (if exp exists)
                if (decodedToken.exp && decodedToken.exp < currentTime) {
                    logout();
                } else {
                    const parsedUser = JSON.parse(storedUser);
                    setToken(storedToken);
                    
                    // CRITICAL: We need the actual role from the token/storage to be the "original" role.
                    // The "user" state will have its role overridden by simulatedRole if it exists.
                    setOriginalUser(parsedUser);
                    setUser(parsedUser); 
                    
                    setSimulatedRoleState(storedSimRole);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                }
            } catch (e) {
                logout();
            }
        }
        setIsLoading(false);
    }, []);

    const login = (newToken: string, userData: User) => {
        setToken(newToken);
        setUser(userData);
        setOriginalUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    };

    const setSimulatedRole = (role: string | null) => {
        setSimulatedRoleState(role);
        if (role) {
            localStorage.setItem('simulatedRole', role);
        } else {
            localStorage.removeItem('simulatedRole');
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setOriginalUser(null);
        setSimulatedRoleState(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('simulatedRole');
        delete axios.defaults.headers.common['Authorization'];
    };

    return (
        <AuthContext.Provider value={{ 
            user: user ? { ...user, role: simulatedRole || user.role } : null, 
            token, 
            login, 
            logout, 
            setSimulatedRole,
            simulatedRole,
            originalRole: originalUser?.role || null,
            isAuthenticated: !!token, 
            isLoading 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
