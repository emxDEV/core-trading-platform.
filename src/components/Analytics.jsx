import React, { useMemo, useEffect } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useData } from '../context/TradeContext';


const Analytics = () => {
    const { filteredTrades: trades, accounts, analyticsFilters } = useData();

    useEffect(() => {
        // Debug logging to help identify why it might be blank
        console.log('Analytics Component Mounted');
        console.log('Trades available:', trades?.length);
    }, [trades]);

    // -------------------------------------------------------------------------
    // 1. DATA PROCESSING & INSIGHTS GENERATION
    // -------------------------------------------------------------------------
    const analytics = useMemo(() => {
        try {
            if (!trades || trades.length === 0) return null;

            // Filter trades based on Analytics-specific filters (Account & Type)
            let processedTrades = trades;

            if (analyticsFilters?.accountId && analyticsFilters.accountId !== 'all') {
                processedTrades = processedTrades.filter(t => String(t.account_id) === String(analyticsFilters.accountId));
            }

            if (analyticsFilters?.type && analyticsFilters.type !== 'all') {
                processedTrades = processedTrades.filter(t => {
                    const acc = accounts.find(a => String(a.id) === String(t.account_id));
                    return acc && acc.type === analyticsFilters.type;
                });
            }

            // Filter for valid closed trades
            const closedTrades = processedTrades.filter(t => (t.status === 'CLOSED' || !t.status) && typeof t.pnl === 'number');

            if (closedTrades.length === 0) return null;

            // --- Basic KPIs ---
            const totalTrades = closedTrades.length;
            const winningTrades = closedTrades.filter(t => t.pnl > 0);
            const losingTrades = closedTrades.filter(t => t.pnl <= 0);
            const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

            const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
            const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
            const netPnL = grossProfit - grossLoss;

            // Safe division for profit factor
            const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 100 : 0) : grossProfit / grossLoss;

            const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
            const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

            // Safe division for RR
            const riskReward = avgLoss === 0 ? (avgWin > 0 ? 10 : 0) : avgWin / avgLoss;

            // --- Equity Curve (Cumulative PnL) ---
            let runningPnL = 0;
            const sortedTrades = closedTrades.sort((a, b) => {
                const d1 = new Date(a.close_date || a.date);
                const d2 = new Date(b.close_date || b.date);
                return (d1.getTime() || 0) - (d2.getTime() || 0);
            });

            const equityCurve = sortedTrades.map((t, i) => {
                runningPnL += t.pnl;
                const dateObj = new Date(t.close_date || t.date);
                return {
                    id: i + 1,
                    date: !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : 'N/A',
                    pnl: runningPnL,
                    rawPnl: t.pnl
                };
            });

            // --- Drawdown Calculation ---
            let maxPeak = -Infinity;
            let currentDrawdown = 0;
            let runningBalanceForDD = 0; // Assuming 0 start for relative drawdown

            const drawdownData = sortedTrades.map((t, i) => {
                runningBalanceForDD += t.pnl;
                if (runningBalanceForDD > maxPeak) maxPeak = runningBalanceForDD;

                // Calculate absolute drawdown from peak
                const absDD = runningBalanceForDD - maxPeak;

                return {
                    id: i + 1,
                    date: equityCurve[i].date,
                    drawdown: absDD // Viz negative value
                };
            });




            // --- Bias Analysis ---
            const biasStats = {};
            closedTrades.forEach(t => {
                const bias = (t.bias || 'Neutral').charAt(0).toUpperCase() + (t.bias || 'Neutral').slice(1).toLowerCase();
                if (!biasStats[bias]) biasStats[bias] = { name: bias, pnl: 0, wins: 0, total: 0 };
                biasStats[bias].pnl += t.pnl;
                if (t.pnl > 0) biasStats[bias].wins++;
                biasStats[bias].total++;
            });
            const biasPerformance = Object.values(biasStats).map(b => ({
                ...b,
                winRate: (b.wins / b.total) * 100
            }));

            // --- Symbol Distribution ---
            const symbolCounts = {};
            closedTrades.forEach(t => {
                const sym = (t.symbol || 'Unknown').toUpperCase();
                symbolCounts[sym] = (symbolCounts[sym] || 0) + 1;
            });
            const symbolDistribution = Object.entries(symbolCounts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            // --- Daily Performance (Calendar Heatmap Prep) ---
            const dailyPnL = {};
            sortedTrades.forEach(t => {
                const d = new Date(t.date);
                if (isNaN(d.getTime())) return;
                const dateKey = d.toISOString().split('T')[0];
                if (!dailyPnL[dateKey]) dailyPnL[dateKey] = { date: dateKey, pnl: 0, count: 0 };
                dailyPnL[dateKey].pnl += t.pnl;
                dailyPnL[dateKey].count++;
            });

            // Generate full year grid (simplified for now to last 365 days or range)
            const calendarData = Object.values(dailyPnL).sort((a, b) => new Date(a.date) - new Date(b.date));


            // --- Daily Performance (Bar Chart) ---
            const dailyBarData = {}; // Aggregate by day of week
            sortedTrades.forEach(t => {
                const d = new Date(t.date);
                if (isNaN(d.getTime())) return;
                const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                if (!dailyBarData[day]) dailyBarData[day] = { day, pnl: 0, wins: 0, total: 0 };
                dailyBarData[day].pnl += t.pnl;
                if (t.pnl > 0) dailyBarData[day].wins++;
                dailyBarData[day].total++;
            });
            const dailyPerformance = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({
                day,
                ...(dailyBarData[day] || { pnl: 0, wins: 0, total: 0 }),
                winRate: dailyBarData[day] ? (dailyBarData[day].wins / dailyBarData[day].total) * 100 : 0
            }));

            // --- Session Performance (Radar) ---
            const sessionStats = {};
            closedTrades.forEach(t => {
                const session = t.session || t.trade_session || 'Unknown';
                if (!sessionStats[session]) sessionStats[session] = { name: session, pnl: 0, wins: 0, total: 0 };
                sessionStats[session].pnl += t.pnl;
                if (t.pnl > 0) sessionStats[session].wins++;
                sessionStats[session].total++;
            });
            const sessionPerformance = Object.values(sessionStats).map(s => ({
                ...s,
                winRate: (s.wins / s.total) * 100
            }));

            // --- Setup/Model Performance ---
            const modelStats = {};
            closedTrades.forEach(t => {
                const model = t.model || 'No Model';
                if (!modelStats[model]) modelStats[model] = { name: model, pnl: 0, wins: 0, total: 0 };
                modelStats[model].pnl += t.pnl;
                if (t.pnl > 0) modelStats[model].wins++;
                modelStats[model].total++;
            });
            const modelPerformance = Object.values(modelStats)
                .sort((a, b) => b.pnl - a.pnl)
                .slice(0, 5);

            // --- Insights calculation ---
            let bestDay = { day: 'N/A', pnl: 0 };
            let worstDay = { day: 'N/A', pnl: 0 };
            if (dailyPerformance.some(d => d.total > 0)) {
                bestDay = dailyPerformance.reduce((a, b) => a.pnl > b.pnl ? a : b);
                worstDay = dailyPerformance.reduce((a, b) => a.pnl < b.pnl ? a : b);
            }

            const bestModel = modelPerformance.length > 0 ? modelPerformance[0] : null;

            const consistencyScore = Math.min(100, Math.max(0, (winRate * 0.5) + (Math.min(profitFactor, 3) * 16)));

            return {
                totalTrades,
                winRate,
                netPnL,
                profitFactor,
                avgWin,
                avgLoss,
                riskReward,
                equityCurve,
                drawdownData,

                calendarData,
                dailyPerformance,
                sessionPerformance: sessionPerformance.length > 0 ? sessionPerformance : [{ name: 'No Data', winRate: 0 }],
                biasPerformance,
                symbolDistribution,
                modelPerformance,
                insights: {
                    bestDay: bestDay.day,
                    worstDay: worstDay.day,
                    bestModel: bestModel ? bestModel.name : 'N/A',
                    consistencyScore: Math.round(consistencyScore) || 0
                }
            };
        } catch (err) {
            console.error("Error calculating analytics:", err);
            return null;
        }
    }, [trades, accounts, analyticsFilters]);

    if (!analytics) {
        const totalLoaded = trades ? trades.length : 0;
        const closedCount = trades ? trades.filter(t => (t.status === 'CLOSED' || !t.status) && typeof t.pnl === 'number').length : 0;

        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
                    <span className="material-symbols-outlined text-4xl text-primary/40">analytics</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-300 mb-2">
                    {totalLoaded === 0 ? "No Trades Yet" : "No Analytic Data"}
                </h2>
                <p className="text-slate-500 max-w-md mb-6">
                    {totalLoaded === 0
                        ? "Start journaling your trades to unlock powerful insights about your performance."
                        : `Found ${totalLoaded} trades, but couldn't generate analytics. Ensure trades have valid P&L data.`}
                </p>


            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-primary">Analytics</span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                            Beta
                        </span>
                    </h1>
                    <p className="text-slate-400 mt-1 font-medium">Deep dive into your trading performance metrics</p>
                </div>

                {/* Consistency Score Badge */}
                <div className="flex items-center gap-4 bg-[#0f111a] border border-white/5 p-4 rounded-2xl shadow-xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Consistency Score</span>
                        <span className={`text-2xl font-black ${analytics.insights.consistencyScore >= 70 ? 'text-emerald-400' : analytics.insights.consistencyScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {analytics.insights.consistencyScore}
                        </span>
                    </div>
                    <div className="w-12 h-12 relative flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                className={`${analytics.insights.consistencyScore >= 70 ? 'text-emerald-500' : analytics.insights.consistencyScore >= 40 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000 ease-out`}
                                strokeDasharray={125.6}
                                strokeDashoffset={125.6 - (125.6 * analytics.insights.consistencyScore) / 100}
                                strokeLinecap="round"
                            />
                        </svg>
                        <span className="material-symbols-outlined absolute text-sm text-slate-500">verified</span>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Net P&L"
                    value={`$${analytics.netPnL.toLocaleString()}`}
                    subValue={`${analytics.totalTrades} Trades`}
                    color={analytics.netPnL >= 0 ? "emerald" : "rose"}
                    icon="payments"
                />
                <KPICard
                    title="Win Rate"
                    value={`${analytics.winRate.toFixed(1)}%`}
                    subValue={`PF: ${analytics.profitFactor.toFixed(2)}`}
                    color="cyan"
                    icon="donut_large"
                />
                <KPICard
                    title="Avg R:R"
                    value={analytics.riskReward.toFixed(2)}
                    subValue={`Avg Win: $${Math.round(analytics.avgWin)}`}
                    color="violet"
                    icon="balance"
                />
                <KPICard
                    title="Best Setup"
                    value={analytics.insights.bestModel}
                    subValue="Most Profitable"
                    color="amber"
                    icon="stars"
                />
            </div>

            {/* Main Chart Section - Equity Curve & Drawdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Equity Curve */}
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-xl">show_chart</span>
                                    Equity Curve
                                </h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Cumulative Performance</p>
                            </div>
                        </div>

                        <div className="h-[300px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.equityCurve}>
                                    <defs>
                                        <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        formatter={(val) => [`$${val.toLocaleString()}`, 'Net Equity']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="pnl"
                                        stroke="#8b5cf6"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorPnL)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Drawdown Visualizer (New Placement) */}
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-400 text-xl">trending_down</span>
                            Drawdown from Peak
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Capital Protection</p>

                        <div className="h-[200px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.drawdownData}>
                                    <defs>
                                        <linearGradient id="colorDD" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#f43f5e' }}
                                        formatter={(val) => [`$${val.toFixed(2).toLocaleString()}`, 'Drawdown']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="drawdown"
                                        stroke="#f43f5e"
                                        strokeWidth={2}
                                        fill="url(#colorDD)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Daily & Heatmap & R-mult */}
                <div className="space-y-6">
                    {/* Daily Performance Bar Chart */}
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-bl from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-400 text-xl">calendar_view_week</span>
                            Daily P&L
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Performance by Day of Week</p>

                        <div className="h-[200px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.dailyPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: '#ffffff05' }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
                                        {analytics.dailyPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bias Performance (Radar/Pie) */}
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-violet-400 text-xl">psychology</span>
                            Bias Efficiency
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Win Rate by Market Bias</p>

                        <div className="h-[180px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.biasPerformance}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                    <Radar
                                        name="Win Rate"
                                        dataKey="winRate"
                                        stroke="#8b5cf6"
                                        strokeWidth={2}
                                        fill="#8b5cf6"
                                        fillOpacity={0.3}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => `${value.toFixed(1)}%`}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Symbol Distribution (Pie) */}
                    <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 backdrop-blur-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-400 text-xl">pie_chart</span>
                            Symbol Matrix
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Trade Volume by Asset</p>

                        <div className="h-[180px] w-full min-w-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={analytics.symbolDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {analytics.symbolDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#06b6d4', '#8b5cf6', '#10b981', '#f59e0b', '#f43f5e'][index % 5]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>


                </div>
            </div>



            {/* Bottom Row - Radar & Models (Original) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {/* Session Radar Analysis */}
                <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-1">Session Dominance</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Win Rate by Trading Session</p>

                    <div className="h-[300px] flex items-center justify-center min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.sessionPerformance}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="Win Rate"
                                    dataKey="winRate"
                                    stroke="#06b6d4"
                                    strokeWidth={2}
                                    fill="#06b6d4"
                                    fillOpacity={0.3}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    formatter={(value) => `${value.toFixed(1)}%`}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Performance List */}
                <div className="bg-[#0f111a]/50 border border-white/5 rounded-3xl p-6">
                    <h3 className="text-lg font-bold text-white mb-1">Model Performance</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Top Strategies by P&L</p>

                    <div className="space-y-4">
                        {analytics.modelPerformance.map((model, i) => (
                            <div key={model.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-slate-500 text-xs font-bold border border-white/10">
                                        {i + 1}
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">{model.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{model.wins}/{model.total} wins ({((model.wins / model.total) * 100).toFixed(0)}%)</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-sm font-black ${model.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ${model.pnl.toLocaleString()}
                                    </p>
                                    <div className="w-20 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden ml-auto">
                                        <div
                                            className={`h-full rounded-full ${model.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                            style={{ width: `${Math.min(100, Math.abs(model.pnl) / Math.max(...analytics.modelPerformance.map(m => Math.abs(m.pnl))) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reusable KPI Card Component
const KPICard = ({ title, value, subValue, color, icon }) => {
    const colorClasses = {
        emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20",
        rose: "from-rose-500/10 to-rose-500/5 text-rose-400 border-rose-500/20",
        cyan: "from-cyan-500/10 to-cyan-500/5 text-cyan-400 border-cyan-500/20",
        violet: "from-violet-500/10 to-violet-500/5 text-violet-400 border-violet-500/20",
        amber: "from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20"
    };

    const iconColors = {
        emerald: "bg-emerald-500 text-white shadow-emerald-500/20",
        rose: "bg-rose-500 text-white shadow-rose-500/20",
        cyan: "bg-cyan-500 text-white shadow-cyan-500/20",
        violet: "bg-violet-500 text-white shadow-violet-500/20",
        amber: "bg-amber-500 text-white shadow-amber-500/20"
    };

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${colorClasses[color]} border rounded-3xl p-5 hover:scale-[1.02] transition-transform duration-300 shadow-xl`}>
            {/* Background Pattern */}
            <div className="absolute right-0 top-0 opacity-10 transform translate-x-1/3 -translate-y-1/3">
                <span className="material-symbols-outlined text-[120px]">{icon}</span>
            </div>

            <div className="flex justify-between items-start mb-4">
                <div className={`rounded-xl p-2.5 shadow-lg ${iconColors[color]} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
            </div>

            <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
                <h3 className="text-3xl font-black tracking-tight text-white mb-1">{value}</h3>
                <p className="text-[11px] font-bold opacity-80 flex items-center gap-1">
                    {subValue}
                </p>
            </div>
        </div>
    );
};

export default Analytics;
