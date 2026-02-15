import React, { useMemo, useEffect } from 'react';
import ViewHeader from './ViewHeader';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { useData } from '../context/TradeContext';

const Analytics = () => {
    const { filteredTrades: trades, accounts, analyticsFilters, setAnalyticsFilters, formatCurrency } = useData();

    useEffect(() => {
        console.log('Analytics Component Mounted');
        console.log('Trades available:', trades?.length);
    }, [trades]);

    // -------------------------------------------------------------------------
    // 1. DATA PROCESSING & INSIGHTS GENERATION
    // -------------------------------------------------------------------------
    const analytics = useMemo(() => {
        try {
            if (!trades || trades.length === 0) return null;

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
            if (analyticsFilters?.symbol && analyticsFilters.symbol !== 'all') {
                processedTrades = processedTrades.filter(t => (t.symbol || '').toUpperCase() === analyticsFilters.symbol.toUpperCase());
            }

            const closedTrades = processedTrades.filter(t => (t.status === 'CLOSED' || !t.status) && typeof t.pnl === 'number');
            if (closedTrades.length === 0) return null;

            const totalTrades = closedTrades.length;
            const winningTrades = closedTrades.filter(t => t.pnl > 0);
            const losingTrades = closedTrades.filter(t => t.pnl <= 0);
            const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
            const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0);
            const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0));
            const netPnL = grossProfit - grossLoss;
            const profitFactor = grossLoss === 0 ? (grossProfit > 0 ? 100 : 0) : grossProfit / grossLoss;
            const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
            const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
            const riskReward = avgLoss === 0 ? (avgWin > 0 ? 10 : 0) : avgWin / avgLoss;

            let runningPnL = 0;
            const sortedTrades = closedTrades.sort((a, b) => {
                const d1 = new Date(a.close_date || a.date);
                const d2 = new Date(b.close_date || b.date);
                return (d1.getTime() || 0) - (d2.getTime() || 0);
            });

            const equityCurve = sortedTrades.map((t, i) => {
                runningPnL += t.pnl;
                const d = new Date(t.close_date || t.date);
                return {
                    id: i + 1,
                    date: !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A',
                    pnl: runningPnL,
                    rawPnl: t.pnl
                };
            });

            let maxPeak = -Infinity;
            let runningBalanceForDD = 0;
            const drawdownData = sortedTrades.map((t, i) => {
                runningBalanceForDD += t.pnl;
                if (runningBalanceForDD > maxPeak) maxPeak = runningBalanceForDD;
                return {
                    id: i + 1,
                    date: equityCurve[i].date,
                    drawdown: runningBalanceForDD - maxPeak
                };
            });

            const biasStats = {};
            closedTrades.forEach(t => {
                const b = (t.bias || 'Neutral').charAt(0).toUpperCase() + (t.bias || 'Neutral').slice(1).toLowerCase();
                if (!biasStats[b]) biasStats[b] = { name: b, pnl: 0, wins: 0, total: 0 };
                biasStats[b].pnl += t.pnl;
                if (t.pnl > 0) biasStats[b].wins++;
                biasStats[b].total++;
            });
            const biasPerformance = Object.values(biasStats).map(b => ({ ...b, winRate: (b.wins / b.total) * 100 }));

            const symbolCounts = {};
            closedTrades.forEach(t => {
                const sym = (t.symbol || 'Unknown').toUpperCase();
                symbolCounts[sym] = (symbolCounts[sym] || 0) + 1;
            });
            const symbolDistribution = Object.entries(symbolCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

            const dailyBarData = {};
            sortedTrades.forEach(t => {
                const d = new Date(t.date);
                if (!isNaN(d.getTime())) {
                    const day = d.toLocaleDateString('en-US', { weekday: 'short' });
                    if (!dailyBarData[day]) dailyBarData[day] = { day, pnl: 0, wins: 0, total: 0 };
                    dailyBarData[day].pnl += t.pnl;
                    if (t.pnl > 0) dailyBarData[day].wins++;
                    dailyBarData[day].total++;
                }
            });
            const dailyPerformance = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => ({
                day,
                ...(dailyBarData[day] || { pnl: 0, wins: 0, total: 0 }),
                trades: dailyBarData[day] ? dailyBarData[day].total : 0
            }));

            const sessionStats = {};
            closedTrades.forEach(t => {
                const s = t.session || t.trade_session || 'Unknown';
                if (!sessionStats[s]) sessionStats[s] = { name: s, pnl: 0, wins: 0, total: 0 };
                sessionStats[s].pnl += t.pnl;
                if (t.pnl > 0) sessionStats[s].wins++;
                sessionStats[s].total++;
            });
            const sessionPerformance = Object.values(sessionStats).map(s => ({ ...s, winRate: (s.wins / s.total) * 100 }));

            const modelStats = {};
            closedTrades.forEach(t => {
                const m = t.model || 'No Model';
                if (!modelStats[m]) modelStats[m] = { name: m, pnl: 0, wins: 0, total: 0 };
                modelStats[m].pnl += t.pnl;
                if (t.pnl > 0) modelStats[m].wins++;
                modelStats[m].total++;
            });
            const modelPerformance = Object.values(modelStats).sort((a, b) => b.pnl - a.pnl).slice(0, 5);

            const sentimentStats = {};
            const emotionMap = {
                disciplined: '🧘', focused: '🎯', nervous: '😨', aggressive: '😤',
                gratified: '😊', fomo: '😤', revenge: '🎢', regret: '😔'
            };
            closedTrades.forEach(t => {
                const sentiment = t.sentiment_pre || t.sentiment_post || 'Neutral';
                if (!sentimentStats[sentiment]) {
                    sentimentStats[sentiment] = { name: sentiment, icon: emotionMap[sentiment] || '😶', pnl: 0, wins: 0, total: 0 };
                }
                sentimentStats[sentiment].pnl += t.pnl;
                if (t.pnl > 0) sentimentStats[sentiment].wins++;
                sentimentStats[sentiment].total++;
            });
            const moodPerformance = Object.values(sentimentStats).map(s => ({
                ...s,
                label: s.name.charAt(0).toUpperCase() + s.name.slice(1),
                winRate: (s.total > 0) ? (s.wins / s.total) * 100 : 0
            })).sort((a, b) => b.pnl - a.pnl);

            const bestModel = modelPerformance.length > 0 ? modelPerformance[0] : null;
            const consistencyScore = Math.min(100, Math.max(0, (winRate * 0.5) + (Math.min(profitFactor, 3) * 16)));

            return {
                totalTrades, winRate, netPnL, profitFactor, avgWin, avgLoss, riskReward, equityCurve, drawdownData,
                dailyPerformance, sessionPerformance: sessionPerformance.length ? sessionPerformance : [{ name: 'No Data', winRate: 0 }],
                biasPerformance, symbolDistribution, modelPerformance, moodPerformance,
                insights: { bestModel: bestModel ? bestModel.name : 'N/A', consistencyScore: Math.round(consistencyScore) || 0 }
            };
        } catch (err) {
            console.error('Error calculating analytics:', err);
            return null;
        }
    }, [trades, accounts, analyticsFilters]);

    if (!analytics) {
        const totalLoaded = trades ? trades.length : 0;
        return (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mb-6 border border-primary/10">
                    <span className="material-symbols-outlined text-4xl text-primary/40">analytics</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-300 mb-2">
                    {totalLoaded === 0 ? 'No Trades Yet' : 'No Analytic Data'}
                </h2>
                <p className="text-slate-500 max-w-md mb-6">
                    {totalLoaded === 0 ? 'Start journaling your trades.' : `Found ${totalLoaded} trades, but couldn't generate analytics.`}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <ViewHeader title="Analytics" accent="Center" subtitle="Deep level fleet intelligence & performance metrics" icon="analytics">
                <div className="flex items-center gap-6 bg-slate-900/40 border border-white/10 p-5 rounded-[2.5rem] backdrop-blur-[45px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Consistency Score</span>
                        <span className={`text-3xl font-black tracking-tighter italic ${analytics.insights.consistencyScore >= 70 ? 'text-emerald-400' : analytics.insights.consistencyScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                            {analytics.insights.consistencyScore}%
                        </span>
                    </div>
                    <div className="w-14 h-14 relative flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="28" cy="28" r="23" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-white/5" />
                            <circle cx="28" cy="28" r="23" stroke="currentColor" strokeWidth="5" fill="transparent"
                                className={`${analytics.insights.consistencyScore >= 70 ? 'text-emerald-500' : analytics.insights.consistencyScore >= 40 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000`}
                                strokeDasharray={144.5} strokeDashoffset={144.5 - (144.5 * analytics.insights.consistencyScore) / 100} strokeLinecap="round" />
                        </svg>
                        <span className="material-symbols-outlined absolute text-[20px] text-primary/40">radar</span>
                    </div>
                </div>
            </ViewHeader>

            {analyticsFilters?.symbol && analyticsFilters.symbol !== 'all' && (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-3 flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(124,93,250,0.8)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Tactical Focus Mode Engaged: </span>
                        <span className="text-sm font-black text-white italic tracking-tighter uppercase">{analyticsFilters.symbol}</span>
                    </div>
                    <button
                        onClick={() => setAnalyticsFilters(prev => ({ ...prev, symbol: 'all' }))}
                        className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10 transition-all active:scale-95"
                    >
                        Reset Sensors
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Net P&L" value={formatCurrency(analytics.netPnL)} subValue={`${analytics.totalTrades} Trades`} color={analytics.netPnL >= 0 ? 'emerald' : 'rose'} icon="payments" />
                <KPICard title="Win Rate" value={`${analytics.winRate.toFixed(1)}%`} subValue={`PF: ${analytics.profitFactor.toFixed(2)}`} color="cyan" icon="donut_large" />
                <KPICard title="Avg R:R" value={analytics.riskReward.toFixed(2)} subValue={`Avg Win: ${formatCurrency(analytics.avgWin)}`} color="violet" icon="balance" />
                <KPICard title="Best Setup" value={analytics.insights.bestModel} subValue="Most Profitable" color="amber" icon="stars" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Global Equity Curve */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border-primary/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                        <div className="mb-6 flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-xl">account_balance_wallet</span> Fleet-wide Equity
                                </h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mt-1">Unified Multi-Account Growth</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Total AUM P&L</span>
                                <span className={`text-xl font-black italic tracking-tighter ${analytics.netPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(analytics.netPnL)}
                                </span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={useMemo(() => {
                                    const { allTrades } = useData();
                                    const sorted = [...allTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
                                    let cum = 0;
                                    return sorted.map(t => {
                                        cum += (t.pnl || 0);
                                        return { date: new Date(t.date).toLocaleDateString(), pnl: cum };
                                    });
                                }, [trades])}>
                                    <defs>
                                        <linearGradient id="colorGlobal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrency(val)} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '12px' }} formatter={(val) => [formatCurrency(val), 'Fleet P&L']} />
                                    <Area type="monotone" dataKey="pnl" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorGlobal)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Confluence Correlation Matrix */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-cyan-400 text-xl">Hub</span> Confluence Edge correlation
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Probability per Factor</p>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={useMemo(() => {
                                    const confs = {};
                                    trades.forEach(t => {
                                        if (!t.confluences) return;
                                        t.confluences.split(',').forEach(c => {
                                            const name = c.trim();
                                            if (!name) return;
                                            if (!confs[name]) confs[name] = { name, wins: 0, total: 0 };
                                            if (t.pnl > 0) confs[name].wins++;
                                            confs[name].total++;
                                        });
                                    });
                                    return Object.values(confs).map(c => ({ name: c.name, score: (c.wins / c.total) * 100 })).sort((a, b) => b.score - a.score).slice(0, 6);
                                }, [trades])}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                    <Radar name="Edge %" dataKey="score" stroke="#06b6d4" strokeWidth={2} fill="#06b6d4" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} formatter={(val) => [`${val.toFixed(1)}%`, 'Probability']} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Drawdown Visualizer */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-400 text-xl">trending_down</span> Drawdown from Peak
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Capital Protection</p>
                        <div className="h-[180px] w-full">
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
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#f43f5e' }} formatter={(val) => [formatCurrency(val), 'Drawdown']} />
                                    <Area type="monotone" dataKey="drawdown" stroke="#f43f5e" strokeWidth={2} fill="url(#colorDD)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Mindset Matrix */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] hover:border-indigo-500/40 transition-all duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <div className="relative z-10">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-indigo-400 text-xl">psychology</span> Mindset Matrix
                                </h3>
                                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Emotional Correlation by P&L</p>
                            </div>
                            <div className="h-[240px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analytics.moodPerformance} layout="vertical" margin={{ left: 20, right: 30 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={80} tick={({ x, y, payload }) => {
                                            const item = analytics.moodPerformance.find(m => m.label === payload.value);
                                            return (
                                                <g transform={`translate(${x},${y})`}>
                                                    <text x={-10} y={0} dy={4} textAnchor="end" fill="white" fontSize={10} fontWeight="900" className="uppercase tracking-widest">
                                                        {item?.icon} {payload.value}
                                                    </text>
                                                </g>
                                            );
                                        }} />
                                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-[#1e293b]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-2xl shadow-2xl ring-1 ring-white/10">
                                                        <div className="flex items-center justify-between gap-8 mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl shadow-inner">{data.icon}</div>
                                                                <div>
                                                                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Mindset</div>
                                                                    <div className="text-sm font-black text-white uppercase tracking-wider">{data.label}</div>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">Execution</div>
                                                                <div className="text-sm font-black text-white tracking-tighter">{data.total} <span className="text-[10px] text-slate-500">TRADES</span></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Period P&L</span>
                                                                <span className={`text-base font-black tracking-tight ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.pnl)}</span>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                                    <span className="text-slate-500">Efficiency</span>
                                                                    <span className="text-white">{data.winRate.toFixed(1)}%</span>
                                                                </div>
                                                                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                    <div className={`h-full rounded-full transition-all duration-1000 ${data.winRate >= 50 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]'}`} style={{ width: `${data.winRate}%` }} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }} />
                                        <Bar dataKey="pnl" radius={[0, 4, 4, 0]} barSize={24}>
                                            {analytics.moodPerformance.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'} stroke={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} strokeWidth={1} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Daily PnL */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group hover:border-blue-500/40 transition-all duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-blue-400 text-xl">bar_chart</span> Daily P&L
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Performance by Day</p>
                        <div className="h-[280px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.dailyPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff08" />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} tickFormatter={(value) => `$${value / 1000}k`} />
                                    <Tooltip cursor={{ fill: '#ffffff05' }} content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-[#1e293b] border border-white/10 p-4 rounded-xl shadow-2xl">
                                                    <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-1">{data.day}</p>
                                                    <p className={`text-lg font-black tracking-tight ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(data.pnl)}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-1">{data.trades} trades executed</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }} />
                                    <Bar dataKey="pnl" radius={[6, 6, 6, 6]}>
                                        {analytics.dailyPerformance.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} opacity={0.6} stroke={entry.pnl >= 0 ? '#10b981' : '#f43f5e'} strokeWidth={1} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bias Efficiency */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden group shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-violet-400 text-xl">psychology</span> Bias Efficiency
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Win Rate by Bias</p>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={analytics.biasPerformance}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                    <Radar name="Win Rate" dataKey="winRate" stroke="#8b5cf6" strokeWidth={2} fill="#8b5cf6" fillOpacity={0.3} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }} formatter={(value) => `${value.toFixed(1)}%`} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Symbol Matrix */}
                    <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group hover:border-emerald-500/40 transition-all duration-700">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                        <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-emerald-400 text-xl">pie_chart</span> Symbol Matrix
                        </h3>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Trade Volume by Asset</p>
                        <div className="h-[180px] flex items-center gap-4">
                            <div className="w-[120px] h-[120px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={analytics.symbolDistribution} innerRadius={40} outerRadius={60} paddingAngle={4} cornerRadius={4} dataKey="value" stroke="none">
                                            {analytics.symbolDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e'][index % 5]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-full custom-scrollbar pr-2">
                                {analytics.symbolDistribution.map((entry, index) => (
                                    <div key={index} className="flex justify-between items-center text-[10px]">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#f43f5e'][index % 5] }} />
                                            {entry.name}
                                        </div>
                                        <span className="text-white font-black">{entry.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                {/* Session Analysis */}
                <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group hover:border-primary/40 transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-xl">radar</span> Session Dominance
                    </h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-6">Win Rate by Trading Session</p>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={analytics.sessionPerformance}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }} />
                                <Radar name="Win Rate" dataKey="winRate" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.4} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px' }} formatter={(val) => [`${val.toFixed(1)}%`, 'Win Rate']} />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Performance */}
                <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-[45px] relative overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group hover:border-amber-500/40 transition-all duration-700">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-amber-400 text-xl">model_training</span> Model Performance
                            </h3>
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Top Strategies by P&L</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {analytics.modelPerformance.map((model, i) => (
                            <div key={model.name} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] transition-all relative overflow-hidden group/item">
                                <div className="flex items-center gap-4">
                                    <div className={`flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black border ${i === 0 ? 'bg-amber-500' : 'bg-slate-800'} text-white`}>{i + 1}</div>
                                    <div>
                                        <p className="text-sm font-black text-white">{model.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{model.wins}/{model.total} Wins - {((model.wins / model.total) * 100).toFixed(0)}% WR</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-base font-black ${model.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(model.pnl)}</p>
                                    <div className="w-24 h-1 bg-slate-800 rounded-full mt-2 overflow-hidden ml-auto">
                                        <div className={`h-full ${model.pnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'} transition-all duration-1000`} style={{ width: `${(model.wins / model.total) * 100}%` }} />
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

const KPICard = ({ title, value, subValue, color, icon }) => {
    const colorClasses = {
        emerald: 'text-emerald-400', rose: 'text-rose-400', cyan: 'text-cyan-400', violet: 'text-violet-400', amber: 'text-amber-400'
    };
    const iconColors = {
        emerald: 'bg-emerald-500/10 text-emerald-400', rose: 'bg-rose-500/10 text-rose-400', cyan: 'bg-cyan-500/10 text-cyan-400', violet: 'bg-violet-500/10 text-violet-400', amber: 'bg-amber-500/10 text-amber-400'
    };

    return (
        <div className="relative overflow-hidden bg-slate-900/40 backdrop-blur-[45px] border border-white/10 rounded-[2.5rem] p-6 hover:-translate-y-1 transition-all duration-700 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group">
            {/* Glass Reflection Highlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${iconColors[color]} flex items-center justify-center border border-white/5`}>
                        <span className="material-symbols-outlined text-[24px]">{icon}</span>
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.25em] mb-2">{title}</h3>
                    <div className="flex items-baseline gap-3">
                        <span className="text-2xl font-black text-white tracking-tighter italic leading-none">{value}</span>
                    </div>
                    <p className={`text-[11px] font-bold uppercase tracking-widest mt-3 opacity-60 ${colorClasses[color]}`}>{subValue}</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
