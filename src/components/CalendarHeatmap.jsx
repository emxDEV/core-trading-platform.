import React, { useState, useMemo } from 'react';

const toLocalDateString = (date) => {
    if (!date) return null;
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};


const CalendarHeatmap = ({ data = [], onDateSelect, selectedDate }) => {
    // Current view state (starts at current date)
    const [currentDate, setCurrentDate] = useState(new Date());

    const selectedDateString = toLocalDateString(selectedDate);

    // Helper to get days in month
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Last day of the month
        const lastDay = new Date(year, month + 1, 0);

        // Days to show (including padding)
        const days = [];

        // Padding for days before the 1st (Monday start)
        // new Date().getDay() returns 0 for Sunday. We want 0 for Monday, 6 for Sunday.
        let firstDayIndex = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

        // Add previous month's padding days
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

        // Add current month's days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const date = new Date(year, month, i);
            const dateString = toLocalDateString(date);
            const isToday = new Date().toDateString() === date.toDateString();

            // Find data for this day
            // Expecting data to have format { date: 'YYYY-MM-DD', pnl: 123, ... }
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

        // Add next month's padding days to complete the grid (optional, but looks better)
        // We want a full 6-row grid usually (42 cells) or just fill the last week
        const remainingCells = 42 - days.length; // Ensure 6 rows for consistency
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
    }, [currentDate, data, selectedDate]);

    const navigateMonth = (direction) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculate monthly stats
    const monthStats = useMemo(() => {
        const currentMonthData = calendarDays.filter(d => d.isCurrentMonth && d.hasData);
        const totalPnL = currentMonthData.reduce((acc, curr) => acc + curr.pnl, 0);
        const winDays = currentMonthData.filter(d => d.pnl > 0).length;
        const lossDays = currentMonthData.filter(d => d.pnl < 0).length;
        return { totalPnL, winDays, lossDays };
    }, [calendarDays]);

    return (
        <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-xl">calendar_month</span>
                        Monthly Performance
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${monthStats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatCurrency(monthStats.totalPnL)}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/20"></span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {monthStats.winDays}W - {monthStats.lossDays}L
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="text-xs font-bold text-slate-300 min-w-[100px] text-center">
                        {monthName}
                    </span>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-fr flex-1">
                {calendarDays.map((day, i) => (
                    <div
                        key={i}
                        onClick={() => day.isCurrentMonth && onDateSelect && onDateSelect(day.date)}
                        className={`aspect-square relative rounded-xl border transition-all duration-300 group
                            ${!day.isCurrentMonth ? 'opacity-20 grayscale border-transparent cursor-default' : 'border-white/5 cursor-pointer'}
                            ${day.hasData
                                ? (day.pnl > 0
                                    ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                                    : 'bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20')
                                : 'bg-white/[0.02] hover:bg-white/[0.05] border-transparent'}
                            ${day.isToday ? 'ring-1 ring-primary ring-offset-2 ring-offset-[#0f111a]' : ''}
                            ${selectedDateString === day.dateString ? 'ring-2 ring-primary border-primary shadow-lg shadow-primary/20 bg-primary/10' : ''}
                        `}
                    >
                        {/* Date Number */}
                        <span className={`absolute top-2 left-2 text-[10px] font-bold ${!day.isCurrentMonth ? 'text-slate-600' : ''
                            } ${day.isToday ? 'text-primary' : 'text-slate-500'}`}>
                            {day.date.getDate()}
                        </span>

                        {/* PnL Value */}
                        {day.hasData && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-[10px] md:text-xs font-black tracking-tight ${day.pnl > 0 ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                    {/* Short format for space: +$1.2k */}
                                    {Math.abs(day.pnl) >= 1000
                                        ? (day.pnl > 0 ? '+' : '-') + (Math.abs(day.pnl) / 1000).toFixed(1) + 'k'
                                        : (day.pnl > 0 ? '+' : '-') + Math.abs(day.pnl)}
                                </span>
                            </div>
                        )}

                        {/* Hover Tooltip (Simple) */}
                        {day.hasData && (
                            <div className="absolute inset-0 bg-transparent" title={`${day.date.toLocaleDateString()}: ${formatCurrency(day.pnl)} (${day.count} trades)`} />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CalendarHeatmap;
