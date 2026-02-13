import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/TradeContext';

export default function CommandCenter() {
    const {
        isCommandCenterOpen,
        setIsCommandCenterOpen,
        setIsImportModalOpen,
        accounts,
        trades,
        setCurrentView,
        setAnalyticsFilters,
        openModal,
        addTrade
    } = useData();

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Sync input focus
    useEffect(() => {
        if (isCommandCenterOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isCommandCenterOpen]);

    // Derived Symbols from trades
    const symbols = useMemo(() => {
        const unique = new Set();
        trades.forEach(t => {
            if (t.symbol) unique.add(t.symbol.toUpperCase());
        });
        return Array.from(unique);
    }, [trades]);

    // Search Results Logic
    const results = useMemo(() => {
        if (!query.trim()) {
            return [
                { id: 'view-journal', type: 'View', title: 'Switch to Journal', icon: 'dashboard', action: () => setCurrentView('journal') },
                { id: 'view-analytics', type: 'View', title: 'Switch to Analytics', icon: 'analytics', action: () => setCurrentView('analytics') },
                { id: 'view-calendar', type: 'View', title: 'Switch to Calendar', icon: 'calendar_month', action: () => setCurrentView('calendar') },
                { id: 'action-new', type: 'Action', title: 'New Trade Directive', icon: 'add_circle', action: () => openModal() },
                { id: 'action-import', type: 'Action', title: 'CSV Intelligence Upload', icon: 'upload_file', action: () => setIsImportModalOpen(true) },
            ];
        }

        const q = query.toLowerCase();
        let list = [];

        // 1. Navigation / Actions
        if ('journal'.includes(q)) list.push({ id: 'view-journal', type: 'View', title: 'Switch to Journal', icon: 'dashboard', action: () => setCurrentView('journal') });
        if ('analytics'.includes(q)) list.push({ id: 'view-analytics', type: 'View', title: 'Switch to Analytics', icon: 'analytics', action: () => setCurrentView('analytics') });
        if ('calendar'.includes(q)) list.push({ id: 'view-calendar', type: 'View', title: 'Switch to Calendar', icon: 'calendar_month', action: () => setCurrentView('calendar') });
        if ('new trade'.includes(q) || 'add'.includes(q)) list.push({ id: 'action-new', type: 'Action', title: 'New Trade Directive', icon: 'add_circle', action: () => openModal() });
        if ('import'.includes(q) || 'csv'.includes(q) || 'upload'.includes(q)) list.push({ id: 'action-import', type: 'Action', title: 'CSV Intelligence Upload', icon: 'upload_file', action: () => setIsImportModalOpen(true) });

        // 2. Accounts
        accounts.forEach(acc => {
            if (acc.name.toLowerCase().includes(q)) {
                list.push({
                    id: `acc-${acc.id}`,
                    type: 'Account',
                    title: `Switch Account: ${acc.name}`,
                    icon: 'account_balance_wallet',
                    action: () => {
                        setCurrentView('analytics');
                        setAnalyticsFilters(prev => ({ ...prev, accountId: acc.id, symbol: 'all' }));
                    }
                });
            }
        });

        // 3. Analytics Jumps (Symbols)
        symbols.forEach(sym => {
            if (sym.toLowerCase().includes(q)) {
                list.push({
                    id: `sym-${sym}`,
                    type: 'Analytics Jump',
                    title: `Analyze Performance: ${sym}`,
                    icon: 'query_stats',
                    action: () => {
                        setCurrentView('analytics');
                        setAnalyticsFilters(prev => ({ ...prev, symbol: sym, accountId: 'all' }));
                    }
                });
            }
        });

        // 4. Quick New Trade with Symbol
        if (symbols.some(s => s.toLowerCase().startsWith(q)) || q.length >= 3) {
            const sym = q.toUpperCase();
            list.push({
                id: `new-${sym}`,
                type: 'Direct Entry',
                title: `Open New Trade for ${sym}`,
                icon: 'rocket_launch',
                action: () => {
                    openModal({ symbol: sym });
                }
            });
        }

        return list;
    }, [query, accounts, symbols, setCurrentView, setAnalyticsFilters, openModal]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % results.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
                setIsCommandCenterOpen(false);
            }
        } else if (e.key === 'Escape') {
            setIsCommandCenterOpen(false);
        }
    };

    if (!isCommandCenterOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4 bg-[#020617]/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setIsCommandCenterOpen(false)}
        >
            <div
                ref={containerRef}
                className="w-full max-w-2xl bg-[#0F172A]/90 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_32px_128px_-12px_rgba(0,0,0,0.8)] overflow-hidden scale-in-center animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Header */}
                <div className="relative border-b border-white/5 p-2">
                    <div className="flex items-center gap-4 px-4 h-14">
                        <span className="material-symbols-outlined text-primary text-2xl animate-pulse">terminal</span>
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type a command or signal..."
                            className="flex-1 bg-transparent border-none outline-none text-lg text-white font-medium placeholder:text-slate-500"
                        />
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">ESC</span>
                        </div>
                    </div>
                    {/* Shadow Accent */}
                    <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto py-2 custom-scrollbar">
                    {results.length > 0 ? (
                        <div className="px-2 space-y-1">
                            {results.map((item, idx) => (
                                <button
                                    key={item.id}
                                    onMouseEnter={() => setSelectedIndex(idx)}
                                    onClick={() => {
                                        item.action();
                                        setIsCommandCenterOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 group ${idx === selectedIndex ? 'bg-primary/20 border border-primary/30' : 'bg-transparent border border-transparent'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${idx === selectedIndex ? 'bg-primary text-white border-primary-light shadow-[0_0_15px_rgba(124,58,237,0.4)]' : 'bg-white/5 text-slate-400 border-white/5'}`}>
                                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1 font-mono">{item.type}</div>
                                            <div className={`text-base font-black tracking-tight italic uppercase ${idx === selectedIndex ? 'text-white' : 'text-slate-300'}`}>{item.title}</div>
                                        </div>
                                    </div>
                                    {idx === selectedIndex && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-primary uppercase tracking-widest font-mono">EXECUTE</span>
                                            <span className="material-symbols-outlined text-sm text-primary">keyboard_return</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                                <span className="material-symbols-outlined text-3xl text-slate-600">search_off</span>
                            </div>
                            <p className="text-slate-500 font-medium italic">No matches found for "{query}"</p>
                        </div>
                    )}
                </div>

                {/* Tactical Footer */}
                <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-600 text-sm">keyboard_arrow_up</span>
                            <span className="material-symbols-outlined text-slate-600 text-sm">keyboard_arrow_down</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Navigate</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-600 text-sm">keyboard_return</span>
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Select</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">OMNI-SEARCH SYSTEM V1.0</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
