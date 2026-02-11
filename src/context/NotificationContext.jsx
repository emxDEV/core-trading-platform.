import React, { createContext, useContext, useState, useCallback } from 'react';
import { soundEngine } from '../utils/SoundEngine';

const NotificationContext = createContext();

export const useNotifications = () => {
    return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = useCallback((notification) => {
        const id = Date.now();
        const newNotification = {
            id,
            type: notification.type || 'info', // success, error, info, warning
            message: notification.message,
            duration: notification.duration || 5000,
            action: notification.action, // { label: string, onClick: function }
            native: notification.native || false,
        };

        setNotifications((prev) => [...prev, newNotification]);

        // Native OS Notification if requested or high priority
        if (newNotification.native) {
            new Notification('core', {
                body: newNotification.message,
                icon: '/logo.png' // Adjust path if needed
            });
        }

        if (newNotification.duration !== Infinity) {
            setTimeout(() => {
                removeNotification(id);
            }, newNotification.duration);
        }
    }, []);

    const removeNotification = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

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
            notifications,
            addNotification,
            removeNotification,
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
                {/* Glow Effect */}
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
