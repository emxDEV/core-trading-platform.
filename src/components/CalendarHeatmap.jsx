import React, { useState, useMemo } from 'react';
import { useData } from '../context/TradeContext';

const toLocalDateString = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CalendarHeatmap = ({ data = [], onDateSelect, selectedDate }) => {
    const { appSettings, formatCurrency } = useData();
    const [currentDate, setCurrentDate] = useState(new Date());

    const selectedDateString = toLocalDateString(selectedDate);

    // Get max PnL for intensity scaling
    const maxMagnitude = useMemo(() => {
        if (!data.length) return 1000;
        return Math.max(...data.map(d => Math.abs(d.pnl)), 1000);
    }, [data]);

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        const weekStart = appSettings.weekStart || 'MO';
        let firstDayIndex;
        if (weekStart === 'MO') {
            firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
        } else {
            firstDayIndex = firstDay.getDay();
        }

        for (let i = firstDayIndex; i > 0; i--) {
            const paddingDate = new Date(year, month, 1 - i);
            days.push({
                date: paddingDate,
                isCurrentMonth: false,
                isToday: false,
                pnl: 0,
                count: 0,
                dateString: toLocalDateString(paddingDate)
            });
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateString = toLocalDateString(date);
            const isToday = new Date().toDateString() === date.toDateString();
            const dayData = data.find(d => d.date === dateString);

            days.push({
                date: date,
                isCurrentMonth: true,
                isToday: isToday,
                pnl: dayData ? dayData.pnl : 0,
                count: dayData ? dayData.count : 0,
                hasData: !!dayData,
                dateString
            });
        }

        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const paddingDate = new Date(year, month + 1, i);
            days.push({
                date: paddingDate,
                isCurrentMonth: false,
                isToday: false,
                pnl: 0,
                count: 0,
                dateString: toLocalDateString(paddingDate)
            });
        }

        return days;
    }, [currentDate, data, selectedDate, appSettings.weekStart]);

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const monthName = currentDate.toLocaleString(appSettings.language === 'German' ? 'de-DE' : (appSettings.language === 'Spanish' ? 'es-ES' : 'default'), { month: 'long', year: 'numeric' });

    const monthStats = useMemo(() => {
        const currentMonthData = calendarDays.filter(d => d.isCurrentMonth && d.hasData);
        const totalPnL = currentMonthData.reduce((acc, curr) => acc + curr.pnl, 0);
        const winDays = currentMonthData.filter(d => d.pnl > 0).length;
        const lossDays = currentMonthData.filter(d => d.pnl < 0).length;
        const totalTrades = currentMonthData.reduce((acc, curr) => acc + curr.count, 0);
        return { totalPnL, winDays, lossDays, totalTrades };
    }, [calendarDays]);

    const getIntensity = (pnl) => {
        if (!pnl) return 0.05;
        const magnitude = Math.abs(pnl);
        const ratio = magnitude / maxMagnitude;
        return 0.1 + (ratio * 0.4); // 10% to 50% opacity range
    };

    return (
        <div className="bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col h-full group hover:border-primary/40 transition-all duration-700">
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            {/* Background Glows */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-primary/5 blur-[100px] rounded-full -translate-y-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* Header Synchronization */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="text-left">
                    <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Operational Performance</span>
                    </div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none mb-3">
                        Monthly <span className={`${monthStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-glow`}>Snapshot</span>
                    </h3>
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className={`text-lg font-black tracking-tighter leading-none ${monthStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {appSettings.maskBalances ? '••••••' : formatCurrency(monthStats.totalPnL)}
                            </span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5 ml-0.5">Net Yield</span>
                        </div>
                        <div className="w-px h-8 bg-white/5" />
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5 leading-none">
                                <span className="text-sm font-black text-emerald-400">{monthStats.winDays}W</span>
                                <span className="text-[10px] text-slate-600 font-black">/</span>
                                <span className="text-sm font-black text-rose-400">{monthStats.lossDays}L</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1.5 ml-0.5">Status Quo</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/[0.03] p-2 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-md">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="w-12 h-12 bg-white/5 hover:bg-primary/20 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center justify-center border border-transparent hover:border-primary/30 active:scale-90"
                    >
                        <span className="material-symbols-outlined text-2xl">chevron_left</span>
                    </button>
                    <div className="px-6 flex flex-col items-center min-w-[140px]">
                        <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Mission Range</span>
                        <span className="text-xs font-black text-white uppercase tracking-widest italic">{monthName}</span>
                    </div>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="w-12 h-12 bg-white/5 hover:bg-primary/20 rounded-2xl text-slate-400 hover:text-white transition-all flex items-center justify-center border border-transparent hover:border-primary/30 active:scale-90"
                    >
                        <span className="material-symbols-outlined text-2xl">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid Header */}
            <div className="grid grid-cols-7 gap-4 mb-4 relative z-10 px-2">
                {(appSettings.weekStart === 'SU'
                    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                ).map(day => (
                    <div key={day} className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-center">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-3 auto-rows-fr flex-1 relative z-10">
                {calendarDays.map((day, i) => {
                    const bgOpacity = getIntensity(day.pnl);
                    const isSelected = selectedDateString === day.dateString;

                    return (
                        <div
                            key={i}
                            onClick={() => day.isCurrentMonth && onDateSelect && onDateSelect(day.date)}
                            className={`relative rounded-[1.5rem] border transition-all duration-500 group/cell overflow-hidden min-h-[80px]
                                ${!day.isCurrentMonth ? 'opacity-5 grayscale pointer-events-none' : 'cursor-pointer border-white/5'}
                                ${day.hasData
                                    ? (day.pnl > 0
                                        ? `border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,${bgOpacity * 0.3})]`
                                        : `border-rose-500/20 shadow-[0_0_30px_rgba(244,63,94,${bgOpacity * 0.3})]`)
                                    : 'bg-white/[0.02] hover:bg-white/[0.05]'}
                                ${isSelected ? 'ring-2 ring-primary border-primary bg-primary/10 scale-[1.03] z-20 shadow-[0_0_40px_rgba(99,102,241,0.2)]' : 'hover:scale-[1.02]'}
                                ${day.isToday && !isSelected ? 'ring-1 ring-primary/40 p-0.5' : ''}
                            `}
                        >
                            {/* Inner Content to handle the relative p-0.5 correctly for today */}
                            <div className="absolute inset-0 flex flex-col items-center justify-between p-4">
                                {/* Heatmap Background layer */}
                                {day.hasData && (
                                    <div
                                        className={`absolute inset-0 transition-opacity duration-700 ${day.pnl > 0 ? 'bg-gradient-to-br from-emerald-500/40 to-emerald-500/10' : 'bg-gradient-to-br from-rose-500/40 to-rose-500/10'}`}
                                        style={{ opacity: bgOpacity * 1.5 }}
                                    />
                                )}

                                {/* Date Number */}
                                <div className="w-full flex justify-between items-start relative z-10">
                                    <span className={`text-[10px] font-black transition-colors duration-500 
                                        ${day.isToday ? 'text-primary' : (day.hasData ? 'text-emerald-50' : 'text-slate-600')}
                                    `}>
                                        {day.date.getDate().toString().padStart(2, '0')}
                                    </span>
                                    {day.isToday && (
                                        <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                                    )}
                                </div>

                                {/* PnL Value with Polish */}
                                {day.hasData && day.isCurrentMonth && (
                                    <div className="w-full flex flex-col items-center relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
                                        <span className={`text-sm font-black tracking-tighter italic ${day.pnl > 0 ? 'text-emerald-400 drop-shadow-glow' : 'text-rose-400 drop-shadow-glow'}`}>
                                            {appSettings.maskBalances ? '••••' : (
                                                Math.abs(day.pnl) >= 1000
                                                    ? (day.pnl > 0 ? '+' : '-') + (Math.abs(day.pnl) / 1000).toFixed(1) + 'k'
                                                    : (day.pnl > 0 ? '+' : '-') + Math.floor(Math.abs(day.pnl))
                                            )}
                                        </span>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className={`w-1 h-1 rounded-full ${day.pnl > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                            <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">{day.count} OPS</span>
                                        </div>
                                    </div>
                                )}

                                {/* Active Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover/cell:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarHeatmap;
