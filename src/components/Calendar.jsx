import React, { useState, useMemo } from 'react';
import ViewHeader from './ViewHeader';
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
    const {
        filteredTrades,
        accounts,
        getPillColor,
        openModal,
        dailyJournals,
        saveDailyJournal,
        setIsDailyJournalOpen,
        formatCurrency,
        t,
        appSettings
    } = useData();

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

    const selectedDayJournal = useMemo(() => {
        if (!selectedDate) return null;
        const dateStr = toLocalDateString(selectedDate);
        const journal = dailyJournals.find(j => j.date === dateStr);
        if (journal) {
            return {
                ...journal,
                goals: typeof journal.goals === 'string' ? JSON.parse(journal.goals) : (journal.goals || [])
            };
        }
        return null;
    }, [selectedDate, dailyJournals]);

    return (
        <div className="flex flex-col h-full space-y-6">
            <ViewHeader
                title="Trade"
                accent="Calendar"
                subtitle={t('visualize_performance')}
                icon="calendar_month"
            >
                <div className="bg-[#0f111a] border border-white/5 p-4 rounded-2xl flex gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('monthly_pnl')}</p>
                        <p className={`text-xl font-black ${dailyData.reduce((acc, curr) => acc + curr.pnl, 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {appSettings.maskBalances ? '****' : formatCurrency(dailyData.reduce((acc, curr) => acc + curr.pnl, 0))}
                        </p>
                    </div>
                    <div className="w-px bg-white/5" />
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('win_rate')}</p>
                        <p className="text-xl font-black text-white">
                            {dailyData.length > 0 ? ((dailyData.filter(d => d.pnl > 0).length / dailyData.length) * 100).toFixed(1) : 0}%
                        </p>
                    </div>
                    <div className="w-px bg-white/5" />
                    <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('winning_days')}</p>
                        <p className="text-xl font-black text-white">
                            {dailyData.filter(d => d.pnl > 0).length} / {dailyData.length}
                        </p>
                    </div>
                </div>
            </ViewHeader>

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
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tighter flex items-center gap-2 uppercase italic">
                                    <span className="material-symbols-outlined text-primary text-2xl">event_note</span>
                                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'Select Day'}
                                </h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Operational Summary</p>
                            </div>
                            {selectedDate && (
                                <div className="flex gap-2">
                                    <Badge
                                        label={selectedDayJournal?.is_completed ? 'Protocol Closed' : 'Protocol Open'}
                                        bg={selectedDayJournal?.is_completed ? 'bg-emerald-500/10' : 'bg-primary/10'}
                                        color={selectedDayJournal?.is_completed ? 'text-emerald-500' : 'text-primary'}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Daily Journal / Protocol Section */}
                        {selectedDate && (
                            <div className="mb-10 space-y-6">
                                <div className="bg-[#0f111a]/40 border border-white/5 rounded-[2rem] p-6 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-lg">description</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Operational Journal</span>
                                        </div>
                                        {selectedDayJournal && (
                                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                                                {selectedDayJournal.goals.filter(g => g.completed).length} / {selectedDayJournal.goals.length} Goals
                                            </span>
                                        )}
                                    </div>

                                    {selectedDayJournal ? (
                                        <div className="space-y-4">
                                            <p className="text-sm text-slate-400 italic font-medium leading-relaxed line-clamp-3">
                                                "{selectedDayJournal.reflection || "No reflection logged for this cycle."}"
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        const dateStr = toLocalDateString(selectedDate);
                                                        setIsDailyJournalOpen(dateStr);
                                                    }}
                                                    className="text-[9px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors"
                                                >
                                                    View Full Log ➤
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="py-4 text-center">
                                            <p className="text-xs font-black text-slate-600 uppercase tracking-widest italic mb-3">No protocol logged for this date</p>
                                            <button
                                                onClick={() => {
                                                    const dateStr = toLocalDateString(selectedDate);
                                                    saveDailyJournal({
                                                        date: dateStr,
                                                        goals: [
                                                            { id: 1, text: "Execute according to plan", completed: false },
                                                            { id: 2, text: "Wait for High Probability setup", completed: false },
                                                            { id: 3, text: "Control emotions post-trade", completed: false }
                                                        ],
                                                        reflection: '',
                                                        is_completed: false
                                                    });
                                                    setIsDailyJournalOpen(dateStr);
                                                }}
                                                className="px-6 py-2.5 bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:text-white transition-all"
                                            >
                                                Initialize Protocol
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-3 mb-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Results</h4>
                            <div className="h-px flex-1 bg-white/5" />
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
function Badge({ label, bg, color }) {
    return (
        <div className={`px-4 py-1.5 rounded-xl ${bg} border border-white/5 text-[9px] font-black ${color} uppercase tracking-widest`}>
            {label}
        </div>
    );
}
