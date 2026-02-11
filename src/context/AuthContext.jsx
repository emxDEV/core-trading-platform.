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

    // Handle Deep Links (Google Auth)
    useEffect(() => {
        const handleDeepLink = async (url) => {
            try {
                let code = null;

                // 1. Try modern PKCE Code
                if (url.includes('code=')) {
                    const codePart = url.split('code=')[1];
                    code = codePart ? codePart.split('&')[0].split('#')[0] : null;
                }

                if (code) {
                    const { error } = await supabase.auth.exchangeCodeForSession(code);
                    if (error) throw error;
                    return;
                }

                // 2. Try Implicit Flow (Token in Hash)
                if (url.includes('#access_token=')) {
                    const hash = url.split('#')[1];
                    const params = new URLSearchParams(hash);
                    const access_token = params.get('access_token');
                    const refresh_token = params.get('refresh_token');

                    if (access_token && refresh_token) {
                        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
                        if (error) throw error;
                    }
                }
            } catch (err) {
                console.error('Deep link auth error:', err.message || err);
            }
        };

        if (window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.on('deep-link', handleDeepLink);
        }
    }, []);

    const signInWithGoogle = async () => {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'core-app://auth/callback',
                skipBrowserRedirect: true,
                queryParams: {
                    prompt: 'select_account'
                }
            }
        });

        if (data?.url && window.electron?.ipcRenderer) {
            window.electron.ipcRenderer.send('open-external-url', data.url);
        }

        return { data, error };
    };

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
        // Always clear local state immediately for instant UI response
        setUser(null);
        setSession(null);

        try {
            const { error } = await supabase.auth.signOut();
            return { error };
        } catch (err) {
            console.error('Sign out error:', err);
            return { error: err };
        }
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
        signInWithGoogle,
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
