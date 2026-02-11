import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/TradeContext';
import DateRangePicker from './DateRangePicker';

const FilterDropdown = ({ label, options, active, onChange, icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        const clickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setIsOpen(false);
        };
        window.addEventListener('mousedown', clickOutside);
        return () => window.removeEventListener('mousedown', clickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${active !== 'All' && active !== label
                    ? 'bg-primary/20 border-primary/40 text-primary'
                    : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
            >
                <span className="material-symbols-outlined text-[16px] opacity-70">{icon}</span>
                <span>{(active === 'All' || active === 'all') ? label : active}</span>
                <span className="material-symbols-outlined text-[14px] opacity-40">expand_more</span>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-[100] min-w-[160px] bg-white dark:bg-[#0F172A]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl py-2 animate-in zoom-in slide-in-from-top-2 duration-200">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => { onChange(opt); setIsOpen(false); }}
                            className={`w-full text-left px-4 py-2 text-[11px] font-bold transition-colors ${active === opt ? 'text-primary bg-primary/10' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function Header() {
    const { openModal, currentView, setIsCopyGroupModalOpen, setIsDailyPnLOpen, dateFilter, analyticsFilters, setAnalyticsFilters, accounts } = useData();
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const getLabel = () => {
        if (dateFilter.type === 'all') return 'All Time';
        if (dateFilter.type === 'today') return 'Today';
        if (dateFilter.startDate && dateFilter.endDate) {
            const start = new Date(dateFilter.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const end = new Date(dateFilter.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `${start} - ${end}`;
        }
        return dateFilter.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <header className="h-20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-10 bg-white dark:bg-background-dark/50 backdrop-blur-sm sticky top-0 z-10">
            <h1 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">
                {currentView === 'journal' ? 'Journal Overview' :
                    currentView === 'copy' ? 'Copy Cockpit' :
                        currentView === 'analytics' ? 'Analytics' :
                            currentView === 'calendar' ? 'Trade Calendar' :
                                currentView === 'settings' ? 'Settings' :
                                    'Global Profile'}
            </h1>
            <div className="flex items-center gap-4">
                {currentView === 'analytics' && (
                    <div className="flex items-center gap-2 mr-2">
                        {/* Account Filter */}
                        <FilterDropdown
                            label="Account"
                            icon="account_circle"
                            options={['All', ...accounts.map(a => a.name)]}
                            active={analyticsFilters.accountId === 'all' ? 'All' : accounts.find(a => String(a.id) === String(analyticsFilters.accountId))?.name || 'All'}
                            onChange={(val) => {
                                const accId = val === 'All' ? 'all' : accounts.find(a => a.name === val)?.id;
                                setAnalyticsFilters(prev => ({ ...prev, accountId: accId }));
                            }}
                        />

                        {/* Type Filter */}
                        <FilterDropdown
                            label="Type"
                            icon="category"
                            options={['All', 'Evaluation', 'Funded', 'Live', 'Demo', 'Backtesting']}
                            active={analyticsFilters.type === 'all' ? 'All' : analyticsFilters.type}
                            onChange={(val) => setAnalyticsFilters(prev => ({ ...prev, type: val === 'All' ? 'all' : val }))}
                        />

                        <div className="h-4 w-px bg-slate-300 dark:bg-white/10 mx-2" />
                    </div>
                )}

                {(currentView === 'journal' || currentView === 'analytics' || currentView === 'calendar') && (
                    <div className="relative">
                        <button
                            onClick={() => setIsDatePickerOpen(true)}
                            className="flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                            <span>{getLabel()}</span>
                        </button>
                        <DateRangePicker isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} />
                    </div>
                )}

                <button
                    onClick={() => setIsDailyPnLOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/5"
                >
                    <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    Daily PNL
                </button>
                <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-outlined">notifications</span>
                </button>

                {currentView === 'journal' && (
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        New Trade
                    </button>
                )}
                {currentView === 'copy' && (
                    <button
                        onClick={() => setIsCopyGroupModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-opacity-90 hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        New Group
                    </button>
                )}
            </div>
        </header>
    );
}
