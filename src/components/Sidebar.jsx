import React from 'react';
import { useData } from '../context/TradeContext';
import { useAI } from '../context/AIContext';
import { soundEngine } from '../utils/SoundEngine';

export default function Sidebar() {
    const { isSidebarCollapsed, toggleSidebar, currentView, setCurrentView, userProfile, stats, setIsDailyJournalOpen, t, friendRequests } = useData();
    const { setIsPanelOpen, isPanelOpen } = useAI();

    return (
        <aside className={`${isSidebarCollapsed ? 'w-24' : 'w-64'} flex-shrink-0 border-r border-white/10 bg-slate-900/10 backdrop-blur-[45px] flex flex-col h-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden relative`}>
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
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
                        <span className="font-bold text-2xl tracking-tighter text-slate-800 dark:text-white animate-in fade-in slide-in-from-left-4 duration-700 shimmer-text">core</span>
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

            <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800/60 mb-2">
                <div className={`flex items-center gap-2 ${isSidebarCollapsed ? 'flex-col' : 'justify-between px-2'}`}>
                    <IconButton
                        icon="psychology"
                        label="AI Assistant"
                        active={isPanelOpen}
                        onClick={() => {
                            soundEngine.playClick();
                            setIsPanelOpen(!isPanelOpen);
                        }}
                    />
                    <IconButton
                        icon="auto_stories"
                        label={t('daily_journal')}
                        active={false}
                        onClick={() => {
                            soundEngine.playClick();
                            setIsDailyJournalOpen(true);
                        }}
                    />
                    <IconButton
                        icon="settings"
                        label={t('settings')}
                        active={currentView === 'settings'}
                        onClick={() => {
                            soundEngine.playClick();
                            setCurrentView('settings');
                        }}
                    />
                </div>
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
                            <span className="text-[10px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-400">
                                {stats.rank?.name || 'Initiate'}
                            </span>
                        </div>
                    )}
                </div>

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
            <span className={`material-symbols-outlined text-[24px] transition-transform duration-300 group-hover:scale-110 ${active ? 'fill-1 drop-shadow-glow' : ''}`}>
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

function IconButton({ icon, label, active = false, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center p-3 rounded-xl transition-all duration-300 group relative
                ${active
                    ? 'bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white'
                }
            `}
        >
            <span className={`material-symbols-outlined text-[22px] transition-transform duration-300 group-hover:scale-110 ${active ? 'fill-1 drop-shadow-glow' : ''}`}>
                {icon}
            </span>

            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 px-2 py-1 bg-slate-800 text-white text-[9px] font-bold rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap z-50 border border-white/10 pointer-events-none">
                {label}
            </div>
        </button>
    );
}

