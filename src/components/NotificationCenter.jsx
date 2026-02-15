import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const NotificationCenter = ({ isOpen, onClose }) => {
    const { history, markAsRead, markAllAsRead, clearHistory, unreadCount } = useNotifications();
    const containerRef = useRef(null);

    useEffect(() => {
        const clickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) onClose();
        };
        if (isOpen) window.addEventListener('mousedown', clickOutside);
        return () => window.removeEventListener('mousedown', clickOutside);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const getTimeAgo = (timestamp) => {
        const ms = Date.now() - new Date(timestamp).getTime();
        const sec = Math.floor(ms / 1000);
        if (sec < 60) return 'Just now';
        const min = Math.floor(sec / 60);
        if (min < 60) return `${min}m ago`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `${hr}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return 'check_circle';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'info';
        }
    };

    const getColor = (type) => {
        switch (type) {
            case 'success': return 'text-emerald-500';
            case 'error': return 'text-rose-500';
            case 'warning': return 'text-amber-500';
            default: return 'text-primary';
        }
    };

    return (
        <div
            ref={containerRef}
            className="absolute top-full right-0 mt-4 w-[380px] bg-[#0F172A] border border-white/10 rounded-[2rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.8)] backdrop-blur-3xl z-[2000] overflow-hidden animate-in zoom-in slide-in-from-top-4 duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        >
            {/* Glass Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-transparent pointer-events-none" />

            <div className="relative z-10 p-6 flex items-center justify-between border-b border-white/5">
                <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest italic">Intelligence Center</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">History Log</span>
                        {unreadCount > 0 && (
                            <span className="px-2 py-0.5 bg-primary/20 text-primary text-[8px] font-black rounded-full uppercase tracking-tighter">
                                {unreadCount} New
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={markAllAsRead}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-white/10"
                        title="Mark all as read"
                    >
                        <span className="material-symbols-outlined text-[18px]">done_all</span>
                    </button>
                    <button
                        onClick={clearHistory}
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-rose-500 transition-all text-[10px] font-black uppercase tracking-widest border border-transparent hover:border-rose-500/20"
                        title="Clear all"
                    >
                        <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                    </button>
                </div>
            </div>

            <div className="relative z-10 max-h-[450px] overflow-y-auto custom-scrollbar">
                {history.length === 0 ? (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center mx-auto mb-6 text-slate-600">
                            <span className="material-symbols-outlined text-3xl animate-pulse">radar</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Static Zero</h4>
                        <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-widest px-10">No protocol events recorded in local buffer.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {history.map((item) => (
                            <div
                                key={item.id}
                                className={`p-5 flex gap-4 hover:bg-white/[0.03] transition-colors relative group ${!item.isRead ? 'bg-primary/[0.02]' : ''}`}
                                onClick={() => markAsRead(item.id)}
                            >
                                <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!item.isRead ? 'bg-primary shadow-[0_0_8px_rgba(124,58,237,0.6)] animate-pulse' : 'bg-slate-700'}`} />

                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-4">
                                        <p className={`text-xs font-bold leading-relaxed ${item.isRead ? 'text-slate-400' : 'text-slate-100'}`}>
                                            {item.message}
                                        </p>
                                        <span className={`material-symbols-outlined shrink-0 text-[16px] ${getColor(item.type)} opacity-80`}>
                                            {getIcon(item.type)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{getTimeAgo(item.timestamp)}</span>
                                        {item.action && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); item.action.onClick(); }}
                                                className="text-[9px] font-black text-primary hover:text-white uppercase tracking-widest transition-colors py-1 px-3 bg-primary/10 rounded-lg"
                                            >
                                                {item.action.label}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative z-10 p-5 bg-white/[0.02] text-center border-t border-white/5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Integrated Intelligence Protocol</span>
            </div>
        </div>
    );
};

export default NotificationCenter;
