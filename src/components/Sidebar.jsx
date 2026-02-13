import React from 'react';
import { useData } from '../context/TradeContext';
import { soundEngine } from '../utils/SoundEngine';

export default function Sidebar() {
    const { isSidebarCollapsed, toggleSidebar, currentView, setCurrentView, userProfile, stats, setIsDailyJournalOpen, t, friendRequests } = useData();

    return (
        <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-64'} flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-surface-dark flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden`}>
            <div className={`px-8 pt-10 pb-8 flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
                <button
                    onClick={toggleSidebar}
                    className="flex items-center gap-4 group focus:outline-none"
                >
                    <div className={`text-primary transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarCollapsed ? 'rotate-[180deg]' : 'rotate-0'} group-hover:scale-110`}>
                        <svg fill="none" height="32" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="32" className="drop-shadow-[0_0_12px_rgba(124,93,250,0.4)]">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                    </div>
                    {!isSidebarCollapsed && (
                        <span className="font-bold text-2xl tracking-tighter text-slate-800 dark:text-white animate-in fade-in slide-in-from-left-4 duration-700">core</span>
                    )}
                </button>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2">
                <NavItem
                    icon="space_dashboard"
                    label={t('journal')}
                    active={currentView === 'journal'}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setCurrentView('journal');
                    }}
                />
                <NavItem
                    icon="auto_awesome_motion"
                    label={t('copy_trading')}
                    active={currentView === 'copy'}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setCurrentView('copy');
                    }}
                />

                <NavItem
                    icon="analytics"
                    label={t('analytics')}
                    active={currentView === 'analytics'}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setCurrentView('analytics');
                    }}
                />
                <NavItem
                    icon="date_range"
                    label={t('calendar')}
                    active={currentView === 'calendar'}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setCurrentView('calendar');
                    }}
                />
            </nav>

            <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800/60 space-y-2 mb-2">
                <NavItem
                    icon="auto_stories"
                    label={t('daily_journal')}
                    active={false}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setIsDailyJournalOpen(true);
                    }}
                />
                <NavItem
                    icon="settings"
                    label={t('settings')}
                    active={currentView === 'settings'}
                    isCollapsed={isSidebarCollapsed}
                    onClick={() => {
                        soundEngine.playClick();
                        setCurrentView('settings');
                    }}
                />
            </div>

            <div
                className={`p-6 border-t border-slate-100 dark:border-slate-800/60 transition-all duration-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.02] ${currentView === 'profile' ? 'bg-primary/5' : ''}`}
                onClick={() => {
                    soundEngine.playClick();
                    setCurrentView('profile');
                }}
            >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3'}`}>
                    <div className="relative">
                        <img
                            alt="User profile avatar"
                            className="w-10 h-10 rounded-2xl border-2 border-primary/20 object-cover shadow-lg"
                            src={userProfile.avatar}
                        />
                        {friendRequests?.length > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-lg border-2 border-white dark:border-surface-dark flex items-center justify-center animate-pulse">
                                <span className="text-[9px] font-black text-white leading-none">{friendRequests.length}</span>
                            </div>
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col truncate animate-in fade-in slide-in-from-left-2 duration-500">
                            <span className="text-xs font-black dark:text-white truncate uppercase tracking-tight">{userProfile.name}</span>
                            <span className="text-[10px] text-primary font-bold uppercase tracking-widest">{stats.rank?.name || 'Initiate'}</span>
                        </div>
                    )}
                </div>

                {!isSidebarCollapsed && (
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-100 transition-opacity">
                        <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">v1.0.9</span>
                    </div>
                )}
            </div>
        </aside>
    );
}

function NavItem({ icon, label, active = false, isCollapsed, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group
                ${active
                    ? 'bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }
                ${isCollapsed ? 'justify-center px-0 mx-2' : ''}
            `}
        >
            <span className={`material-symbols-outlined text-[24px] transition-transform duration-300 group-hover:scale-110 ${active ? 'fill-1' : ''}`}>
                {icon}
            </span>
            {!isCollapsed && (
                <span className="text-sm tracking-wide animate-in fade-in slide-in-from-left-2 duration-500">{label}</span>
            )}

            {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-[10px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 shadow-xl border border-white/10">
                    {label}
                </div>
            )}
        </button>
    );
}

