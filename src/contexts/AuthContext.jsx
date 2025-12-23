import React, { createContext, useContext, useState, useEffect } from 'react';
import { ApiService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const storedUser = ApiService.getCurrentUser();
            if (storedUser && storedUser.id) {
                try {
                    // Refresh user data from server to get latest profile fields (intake, cohort, etc.)
                    const { data: freshUser } = await ApiService.supabase
                        .from('users')
                        .select('*')
                        .eq('id', storedUser.id)
                        .single();

                    if (freshUser) {
                        localStorage.setItem('user', JSON.stringify(freshUser));
                        setUser(freshUser);
                    } else {
                        setUser(storedUser); // Fallback
                    }
                } catch (err) {
                    console.error("Failed to refresh user session", err);
                    setUser(storedUser);
                }
            } else {
                setUser(storedUser);
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    const login = async (regNumber, password) => {
        try {
            const loggedInUser = await ApiService.login(regNumber, password);
            if (loggedInUser) {
                setUser(loggedInUser);
                return true;
            }
            return false;
        } catch (err) {
            console.error("Login failed", err);
            return false;
        }
    };

    const logout = () => {
        ApiService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
