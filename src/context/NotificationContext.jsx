import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { soundEngine } from '../utils/SoundEngine';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

const STORAGE_KEY = 'core_notification_history';
const MAX_HISTORY = 50;

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    // Save history to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    }, [history]);

    const addNotification = useCallback((notification) => {
        const id = Date.now();
        const config = typeof notification === 'string' ? { message: notification } : notification;

        const newNotification = {
            id,
            type: config.type || 'info', // success, error, info, warning
            message: config.message,
            duration: config.duration || 5000,
            action: config.action, // { label: string, onClick: function }
            native: config.native || false,
            timestamp: new Date().toISOString(),
            isRead: false
        };

        // Add to active toasts
        setToasts((prev) => [...prev, newNotification]);

        // Add to history (limit size)
        setHistory((prev) => {
            const updated = [newNotification, ...prev];
            return updated.slice(0, MAX_HISTORY);
        });

        // Native OS Notification if requested
        if (newNotification.native) {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification('CORE Registry', {
                    body: newNotification.message,
                    icon: '/logo.png'
                });
            }
        }

        if (newNotification.duration !== Infinity) {
            setTimeout(() => {
                removeToast(id);
            }, newNotification.duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const markAsRead = useCallback((id) => {
        setHistory(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    }, []);

    const markAllAsRead = useCallback(() => {
        setHistory(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const unreadCount = useMemo(() => history.filter(n => !n.isRead).length, [history]);

    const showSuccess = useCallback((content) => {
        soundEngine.playSuccess();
        const config = typeof content === 'string' ? { message: content } : content;
        addNotification({ ...config, type: 'success' });
    }, [addNotification]);

    const showError = useCallback((content) => {
        soundEngine.playError();
        const config = typeof content === 'string' ? { message: content } : content;
        addNotification({ ...config, type: 'error' });
    }, [addNotification]);

    const showInfo = useCallback((content) => {
        soundEngine.playNotification();
        const config = typeof content === 'string' ? { message: content } : content;
        addNotification({ ...config, type: 'info' });
    }, [addNotification]);

    const showWarning = useCallback((content) => {
        soundEngine.playNotification();
        const config = typeof content === 'string' ? { message: content } : content;
        addNotification({ ...config, type: 'warning' });
    }, [addNotification]);

    const [confirmDialog, setConfirmDialog] = useState(null);
    const confirm = useCallback((config) => {
        return new Promise((resolve) => {
            setConfirmDialog({
                title: config.title || 'Confirm Action',
                message: config.message,
                confirmText: config.confirmText || 'Confirm',
                cancelText: config.cancelText || 'Cancel',
                type: config.type || 'danger',
                onConfirm: () => {
                    setConfirmDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications: toasts, // Maintain legacy naming for Toaster
            history,
            unreadCount,
            addNotification,
            removeNotification: removeToast,
            markAsRead,
            markAllAsRead,
            clearHistory,
            showSuccess,
            showError,
            showInfo,
            showWarning,
            confirm
        }}>
            {children}
            {confirmDialog && <ConfirmModal {...confirmDialog} />}
        </NotificationContext.Provider>
    );
};

const ConfirmModal = ({ title, message, confirmText, cancelText, type, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 z-[200000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="relative w-full max-w-sm">
                <div className={`absolute -inset-4 blur-3xl opacity-20 rounded-[3rem] animate-pulse ${type === 'danger' ? 'bg-rose-500' : 'bg-primary'}`} />
                <div className="relative bg-[#0F172A]/80 border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    <div className="p-10 text-center">
                        <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-6 transition-transform duration-500 hover:scale-110 ${type === 'danger' ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-primary/20 border border-primary/30'}`}>
                            <span className={`material-symbols-outlined text-[32px] ${type === 'danger' ? 'text-rose-400' : 'text-primary'}`}>
                                {type === 'danger' ? 'warning' : 'help'}
                            </span>
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
                        <p className="text-slate-400 text-sm leading-relaxed font-medium px-2">{message}</p>
                    </div>
                    <div className="flex gap-1 p-3 pt-0">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white rounded-2xl transition-all duration-300"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`flex-1 px-6 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 shadow-lg ${type === 'danger'
                                ? 'bg-rose-500 text-white hover:bg-rose-400 shadow-rose-500/20'
                                : 'bg-primary text-white hover:bg-primary/80 shadow-primary/20'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                    <div className="h-2 w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-1" />
                </div>
            </div>
        </div>
    );
};
