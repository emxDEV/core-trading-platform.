import React, { useState, useMemo } from 'react';
import { useData } from '../context/TradeContext';
import CalendarHeatmap from './CalendarHeatmap';

const toLocalDateString = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


const COLOR_MAP = {
    primary: 'bg-primary/15 text-primary border-primary/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    violet: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    pink: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    lime: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
};

export default function Calendar() {
    const { filteredTrades, accounts, getPillColor, openModal } = useData();

    const [selectedDate, setSelectedDate] = useState(null);

    // Process trades into daily buckets for the calendar
    const dailyData = useMemo(() => {
        const stats = {};
        filteredTrades.forEach(t => {
            const dateStr = toLocalDateString(t.date);
            if (!stats[dateStr]) {
                stats[dateStr] = { date: dateStr, pnl: 0, count: 0, trades: [] };
            }
            stats[dateStr].pnl += t.pnl || 0;
            stats[dateStr].count += 1;
            stats[dateStr].trades.push(t);
        });
        return Object.values(stats);
    }, [filteredTrades]);

    const selectedDayTrades = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = toLocalDateString(selectedDate);
        const day = dailyData.find(d => d.date === dateStr);
        return day ? day.trades : [];
    }, [selectedDate, dailyData]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(val);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Trade Calendar</span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            Live
                        </span>
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium">Visualize your performance on a timeline</p>
                </div>

                <div className="flex gap-4">
                    <div className="bg-[#0f111a] border border-white/5 p-4 rounded-2xl flex gap-6">
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Monthly P&L</p>
                            <p className={`text-xl font-black ${dailyData.reduce((acc, curr) => acc + curr.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatCurrency(dailyData.reduce((acc, curr) => acc + curr.pnl, 0))}
                            </p>
                        </div>
                        <div className="w-px bg-white/5" />
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Win Rate</p>
                            <p className="text-xl font-black text-white">
                                {dailyData.length > 0 ? ((dailyData.filter(d => d.pnl > 0).length / dailyData.length) * 100).toFixed(1) : 0}%
                            </p>
                        </div>
                        <div className="w-px bg-white/5" />
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Winning Days</p>
                            <p className="text-xl font-black text-white">
                                {dailyData.filter(d => d.pnl > 0).length} / {dailyData.length}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Left: Huge Calendar */}
                <div className="xl:col-span-2 flex flex-col min-h-0">
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm flex-1 flex flex-col min-h-0">
                        <CalendarHeatmap
                            data={dailyData}
                            onDateSelect={(date) => setSelectedDate(date)}
                            selectedDate={selectedDate}
                        />
                    </div>
                </div>

                {/* Right: Day Detail */}
                <div className="flex flex-col space-y-6 min-h-0">
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-sm flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-xl">event_available</span>
                                {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Select a day'}
                            </h3>
                        </div>

                        {selectedDayTrades.length > 0 ? (
                            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
                                {selectedDayTrades.map((trade, i) => {
                                    const account = accounts.find(a => String(a.id) === String(trade.account_id));
                                    const isWin = trade.pnl >= 0;

                                    // Calculate duration if times are present
                                    let duration = '';
                                    if (trade.open_time && trade.close_time) {
                                        try {
                                            const [oH, oM] = trade.open_time.split(':').map(Number);
                                            const [cH, cM] = trade.close_time.split(':').map(Number);
                                            let mins = (cH * 60 + cM) - (oH * 60 + oM);
                                            if (mins < 0) mins += 1440; // Next day
                                            if (mins >= 60) {
                                                duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
                                            } else {
                                                duration = `${mins}m`;
                                            }
                                        } catch (e) { }
                                    }

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => openModal(trade)}
                                            className="group relative bg-[#0f111a]/40 border border-white/5 rounded-2xl p-4 hover:border-primary/40 transition-all overflow-hidden cursor-pointer active:scale-[0.98]"
                                        >
                                            {/* Result Stripe */}
                                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${isWin ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">
                                                        {account?.name || 'Deleted Account'}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="text-sm font-black text-white">{trade.instrument || trade.symbol}</h4>
                                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tighter ${trade.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                            {trade.side}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-black ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {formatCurrency(trade.pnl)}
                                                    </p>
                                                    {trade.rr && (
                                                        <p className="text-[10px] font-bold text-slate-400">{(trade.rr).toFixed(2)}R</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-white/5">
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Entry Signal</span>
                                                    <div>
                                                        {trade.entry_signal ? (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${COLOR_MAP[getPillColor('entry_signal', trade.entry_signal) || 'amber']}`}>
                                                                {trade.entry_signal}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] font-black text-slate-600">—</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bias</span>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${trade.bias === 'Bullish' ? 'bg-emerald-400' : trade.bias === 'Bearish' ? 'bg-rose-400' : 'bg-slate-500'}`}></span>
                                                        <span className={`text-[11px] font-black ${trade.bias === 'Bullish' ? 'text-emerald-400' : trade.bias === 'Bearish' ? 'text-rose-400' : 'text-slate-500'}`}>
                                                            {trade.bias || 'No Bias'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="col-span-2 flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Confluences</span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {trade.confluences ? (
                                                            (Array.isArray(trade.confluences) ? trade.confluences : trade.confluences.split(',')).map((c, idx) => {
                                                                const color = getPillColor('confluences', c.trim()) || 'primary';
                                                                return (
                                                                    <span key={idx} className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${COLOR_MAP[color]}`}>
                                                                        {c.trim()}
                                                                    </span>
                                                                );
                                                            })
                                                        ) : (
                                                            <span className="text-[11px] font-black text-slate-600 italic">No confluences</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Model</span>
                                                    <span className="text-[11px] font-black text-primary/80 truncate">
                                                        {trade.model || '—'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col text-right">
                                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Session</span>
                                                    <span className="text-[11px] font-black text-slate-400 truncate">
                                                        {trade.trade_session || trade.session || '—'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <span className="material-symbols-outlined text-5xl mb-4">history</span>
                                <p className="text-sm font-medium">No trades executed on this day</p>
                            </div>
                        )}

                        {selectedDayTrades.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Daily Result</span>
                                    <span className={`text-xl font-black ${selectedDayTrades.reduce((acc, t) => acc + t.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatCurrency(selectedDayTrades.reduce((acc, t) => acc + t.pnl, 0))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
