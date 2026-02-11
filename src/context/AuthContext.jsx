import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email, password, displayName) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { display_name: displayName }
            }
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            setUser(null);
            setSession(null);
        }
        return { error };
    };

    const updateEmail = async (newEmail) => {
        const { data, error } = await supabase.auth.updateUser({ email: newEmail });
        return { data, error };
    };

    const verifyPassword = async (password) => {
        // Re-authenticate by signing in with current email + provided password
        const { data, error } = await supabase.auth.signInWithPassword({
            email: user?.email,
            password
        });
        return { data, error };
    };

    const changePasswordWithVerify = async (currentPassword, newPassword) => {
        // Step 1: Verify current password
        const { error: verifyError } = await verifyPassword(currentPassword);
        if (verifyError) return { data: null, error: { message: 'Current password is incorrect' } };

        // Step 2: Update to new password
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        return { data, error };
    };

    const updatePassword = async (newPassword) => {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        return { data, error };
    };

    const updateDisplayName = async (newName) => {
        const { data, error } = await supabase.auth.updateUser({
            data: { display_name: newName }
        });
        if (!error && data?.user) {
            setUser(data.user);
        }
        return { data, error };
    };

    const resetPassword = async (email) => {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email);
        return { data, error };
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        updateEmail,
        updatePassword,
        changePasswordWithVerify,
        verifyPassword,
        updateDisplayName,
        resetPassword,
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
