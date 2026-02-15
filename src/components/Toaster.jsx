import React from 'react';
import { useNotifications } from '../context/NotificationContext';
import { createPortal } from 'react-dom';

const Toaster = () => {
    const { notifications, removeNotification } = useNotifications();

    if (notifications.length === 0) return null;

    return createPortal(
        <div className="fixed bottom-8 right-8 z-[110000] flex flex-col gap-3 pointer-events-none">
            {notifications.map((notification) => (
                <Toast
                    key={notification.id}
                    notification={notification}
                    onClose={() => removeNotification(notification.id)}
                />
            ))}
        </div>,
        document.body
    );
};

const Toast = ({ notification, onClose }) => {
    const [isVisible, setIsVisible] = React.useState(false);

    React.useEffect(() => {
        // Subtle entrance delay to trigger animation
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const config = {
        success: {
            icon: 'check_circle',
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20',
            shadow: 'shadow-emerald-500/10'
        },
        error: {
            icon: 'error',
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20',
            shadow: 'shadow-rose-500/10'
        },
        warning: {
            icon: 'warning',
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/20',
            shadow: 'shadow-amber-500/10'
        },
        info: {
            icon: 'info',
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
            shadow: 'shadow-cyan-500/10'
        }
    }[notification.type] || config.info;

    return (
        <div
            className={`
                pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl
                transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
                ${config.bg} ${config.border} ${config.shadow}
                ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-90'}
            `}
            style={{ width: '380px' }}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg} border ${config.border} shrink-0 shadow-lg`}>
                <span className={`material-symbols-outlined text-[24px] ${config.color} drop-shadow-glow`}>{config.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate uppercase tracking-widest opacity-40 mb-0.5">
                    {notification.type}
                </p>
                <p className="text-white/90 font-medium text-sm leading-relaxed">
                    {notification.message}
                </p>
                {notification.action && (
                    <button
                        onClick={() => {
                            notification.action.onClick();
                            onClose();
                        }}
                        className="mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all border border-white/5 active:scale-95"
                    >
                        {notification.action.label}
                    </button>
                )}
            </div>

            <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/5 transition-colors group shrink-0"
            >
                <span className="material-symbols-outlined text-white/20 group-hover:text-white/60 text-[18px]">close</span>
            </button>
        </div>
    );
};

export default Toaster;
