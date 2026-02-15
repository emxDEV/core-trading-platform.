import React, { useState, useEffect, useRef } from 'react';
import { SmartPortal } from '../utils/uiUtils';
import { PROP_FIRMS, TYPE_COLORS } from '../constants/firms';
import { useData } from '../context/TradeContext';
import { useNotifications } from '../context/NotificationContext';

export const PropFirmPicker = ({ selectedFirm, onSelect, isOpen, setOpen }) => {
    const selected = PROP_FIRMS.find(f => f.name === selectedFirm);
    const buttonRef = useRef(null);
    const [coords, setCoords] = useState(null);

    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setCoords({ x: rect.left, y: rect.bottom + 4, width: rect.width });
        }
    }, [isOpen]);

    return (
        <div className="relative">
            <button
                ref={buttonRef}
                type="button"
                data-dropdown-trigger="prop-firm"
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!isOpen);
                }}
                className="w-full flex items-center gap-3 bg-slate-900/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-left transition-all hover:border-white/20 focus:outline-none focus:ring-4 focus:ring-primary/10 backdrop-blur-md"
            >
                {selected ? (
                    <>
                        <img src={selected.logo} alt={selected.name} className={`w-6 h-6 object-cover ${selected.className || 'rounded-md'}`} />
                        <span className="text-white font-black uppercase tracking-tight">{selected.name}</span>
                    </>
                ) : (
                    <span className="text-slate-500 font-bold">Select Prop Firm...</span>
                )}
                <span className="material-symbols-outlined text-[14px] text-slate-500 ml-auto">{isOpen ? 'expand_less' : 'expand_more'}</span>
            </button>
            {isOpen && coords && (
                <SmartPortal coords={coords} className="bg-slate-900/95 border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden focus:outline-none backdrop-blur-[45px] relative" style={{ width: coords.width }}>
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    <div style={{ width: coords.width }} className="relative z-10">
                        {PROP_FIRMS.map(firm => (
                            <button
                                key={firm.name}
                                type="button"
                                onClick={() => { onSelect(firm.name); setOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/5 ${selectedFirm === firm.name ? 'bg-primary/5' : ''}`}
                            >
                                <img src={firm.logo} alt={firm.name} className={`w-7 h-7 object-cover shadow-sm ${firm.className || 'rounded-lg'}`} style={{ boxShadow: `0 0 8px ${firm.color}30` }} />
                                <span className="dark:text-white font-semibold">{firm.name}</span>
                                {selectedFirm === firm.name && <span className="material-symbols-outlined text-[14px] text-emerald-400 ml-auto">check</span>}
                            </button>
                        ))}
                    </div>
                </SmartPortal>
            )}
        </div>
    );
};

export const AccountPicker = ({ selectedId, onSelect, isOpen, setOpen, onAddAccount, accounts, setHoveredAccount, setAccountContextMenu }) => {
    const { trades, getAccountStats, copyGroups } = useData();
    const selectedAccRaw = accounts.find(a => String(a.id) === String(selectedId));
    const selectedAcc = selectedAccRaw ? { ...selectedAccRaw, stats: getAccountStats(selectedAccRaw.id, accounts, trades) } : null;
    const isMainBreached = selectedAcc?.stats?.isBreached;
    const anchorRef = useRef(null);
    const [coords, setCoords] = useState(null);

    const updateCoords = () => {
        if (anchorRef.current) {
            const rect = anchorRef.current.getBoundingClientRect();
            setCoords({
                x: rect.left,
                y: rect.bottom + 8,
                width: rect.width,
                anchorHeight: rect.height
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            const scrollParent = anchorRef.current?.closest('.overflow-y-auto');
            if (scrollParent) {
                scrollParent.addEventListener('scroll', updateCoords);
                return () => scrollParent.removeEventListener('scroll', updateCoords);
            }
        }
    }, [isOpen]);

    return (
        <div className="relative" ref={anchorRef}>
            {selectedAcc ? (
                <button
                    type="button"
                    data-dropdown-trigger="account"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(!isOpen);
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setAccountContextMenu({ acc: selectedAccRaw, x: e.clientX, y: e.clientY });
                    }}
                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${isMainBreached ? 'border-rose-500/30 bg-rose-500/5' : (TYPE_COLORS[selectedAcc.type]?.border || 'border-primary/40 bg-primary/5')} dark:text-white shadow-sm font-bold`}
                >
                    <div className="relative">
                        {selectedAcc.prop_firm && PROP_FIRMS.find(f => f.name === selectedAcc.prop_firm) ? (
                            <img src={PROP_FIRMS.find(f => f.name === selectedAcc.prop_firm).logo} alt="" className={`w-5 h-5 object-cover ${PROP_FIRMS.find(f => f.name === selectedAcc.prop_firm)?.className || 'rounded-md'} ${isMainBreached ? 'grayscale opacity-50' : ''}`} />
                        ) : (
                            <span className={`w-2.5 h-2.5 rounded-full ${isMainBreached ? 'bg-slate-500' : (TYPE_COLORS[selectedAcc.type]?.dot || 'bg-primary')}`}></span>
                        )}
                        {copyGroups.find(g => g.is_active && String(g.leader_account_id) === String(selectedAcc.id)) && (
                            <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-white w-3 h-3 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10">
                                <span className="material-symbols-outlined text-[8px] font-black">crown</span>
                            </div>
                        )}
                        {copyGroups.find(g => g.is_active && g.members && g.members.some(m => String(m.follower_account_id) === String(selectedAcc.id))) && (
                            <div className="absolute -top-1.5 -left-1.5 bg-primary text-white w-3 h-3 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10">
                                <span className="material-symbols-outlined text-[8px] font-black">sync</span>
                            </div>
                        )}
                    </div>
                    <span className={isMainBreached ? 'line-through text-slate-400' : ''}>{selectedAcc.name}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${isMainBreached ? 'bg-rose-500/10 text-rose-400' : 'opacity-60'}`}>
                        {selectedAcc.type}
                    </span>
                    <span className="material-symbols-outlined text-[14px] text-slate-500 ml-1">unfold_more</span>
                </button>
            ) : (
                <button
                    type="button"
                    data-dropdown-trigger="account-select"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(!isOpen);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 text-slate-400 hover:border-primary/50 hover:text-primary text-sm font-black uppercase tracking-tight transition-all"
                >
                    <span className="material-symbols-outlined text-[16px]">account_balance</span>
                    Select Tactical Unit
                    <span className="material-symbols-outlined text-[14px]">unfold_more</span>
                </button>
            )}

            {isOpen && coords && (
                <SmartPortal coords={coords} className="bg-slate-900/95 border border-white/10 rounded-xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden focus:outline-none backdrop-blur-[45px] relative" style={{ minWidth: Math.max(260, coords.width) }}>
                    {/* Glass Reflection Highlight */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    <div className="px-5 py-4 border-b border-white/5 bg-white/5 relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tactical Fleet</span>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto relative z-10 custom-scrollbar">
                        {accounts.map(acc => {
                            const isCurrent = String(acc.id) === String(selectedId);
                            const stats = getAccountStats(acc.id, accounts, trades);
                            const isBreached = stats?.isBreached;
                            const firm = acc.prop_firm ? PROP_FIRMS.find(f => f.name === acc.prop_firm) : null;

                            return (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onMouseEnter={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredAccount({ acc, x: rect.right, y: rect.top + rect.height / 2 });
                                    }}
                                    onMouseLeave={() => setHoveredAccount(null)}
                                    onClick={() => {
                                        onSelect(acc.id);
                                        setOpen(false);
                                    }}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        setAccountContextMenu({ acc, x: e.clientX, y: e.clientY });
                                    }}
                                    className={`w-full flex items-center gap-3 px-5 py-4 text-xs transition-all ${isCurrent ? 'bg-primary/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'} ${isBreached ? 'opacity-40' : ''}`}
                                >
                                    <div className="relative">
                                        {firm ? (
                                            <img src={firm.logo} alt="" className={`w-5 h-5 object-cover ${firm?.className || 'rounded-md'} ${isBreached ? 'grayscale' : ''}`} />
                                        ) : (
                                            <span className={`w-2 h-2 rounded-full ${isBreached ? 'bg-slate-600' : (TYPE_COLORS[acc.type]?.dot || 'bg-primary')}`}></span>
                                        )}
                                        {copyGroups.find(g => g.is_active && String(g.leader_account_id) === String(acc.id)) && (
                                            <div className="absolute -top-1.5 -left-1.5 bg-amber-400 text-white w-3 h-3 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10">
                                                <span className="material-symbols-outlined text-[8px] font-black">crown</span>
                                            </div>
                                        )}
                                        {copyGroups.find(g => g.is_active && g.members && g.members.some(m => String(m.follower_account_id) === String(acc.id))) && (
                                            <div className="absolute -top-1.5 -left-1.5 bg-primary text-white w-3 h-3 rounded-full flex items-center justify-center shadow-sm border border-white dark:border-slate-900 z-10">
                                                <span className="material-symbols-outlined text-[8px] font-black">sync</span>
                                            </div>
                                        )}
                                    </div>
                                    <span className={`font-black uppercase tracking-tight ${isCurrent ? 'text-white' : 'text-slate-300'} ${isBreached ? 'line-through opacity-50' : ''}`}>
                                        {acc.name}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-wider opacity-50 ml-auto font-black">{acc.type}</span>
                                    {isCurrent && <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => {
                                onAddAccount();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            Add New Account
                        </button>
                    </div>
                </SmartPortal>
            )}
        </div>
    );
};
