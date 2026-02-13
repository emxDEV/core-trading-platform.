import React, { useMemo, useState, useRef } from 'react';
import { useData } from '../context/TradeContext';
import { SkeletonChart } from './SkeletonLoader';

export default function AnalyticsCharts() {
    const { filteredTrades: trades, isLoading, formatCurrency, formatPnL } = useData();
    const [hoveredPoint, setHoveredPoint] = useState(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const svgRef = useRef(null);

    const pnlData = useMemo(() => {
        if (!trades.length) return [];
        const sorted = [...trades].sort((a, b) => {
            const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateDiff !== 0) return dateDiff;
            return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        });

        let cumulative = 0;
        return sorted.map(t => {
            cumulative += (t.pnl || 0);
            return {
                id: t.id,
                equity: cumulative,
                pnl: t.pnl,
                date: t.date,
                symbol: t.symbol,
                model: t.model
            };
        });
    }, [trades]);

    const topStrategies = useMemo(() => {
        if (!trades.length) return [];

        const strategyStats = trades.reduce((acc, trade) => {
            const model = (trade.model || 'Unknown').trim();
            if (!acc[model]) {
                acc[model] = { total: 0, wins: 0 };
            }
            acc[model].total += 1;
            if (trade.pnl > 0) acc[model].wins += 1;
            return acc;
        }, {});

        return Object.entries(strategyStats)
            .map(([name, stats]) => ({
                name,
                winRate: Math.round((stats.wins / stats.total) * 100),
                total: stats.total
            }))
            .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
            .slice(0, 3);
    }, [trades]);

    // Graph calculation helpers with smoothing
    const chartSettings = useMemo(() => {
        if (pnlData.length < 2) return null;

        const padding = 20;
        const width = 1000;
        const height = 400;

        const points = pnlData.slice(-20); // Last 20 trades
        const values = points.map(d => d.equity);
        const minVal = Math.min(0, ...values);
        const maxVal = Math.max(0, ...values);
        const range = maxVal - minVal || 1;

        const getX = (i) => (i / (points.length - 1)) * width;
        const getY = (val) => height - ((val - minVal) / range) * (height - padding * 2) - padding;

        // Cubic Bézier smoothing
        let pathD = `M ${getX(0)} ${getY(points[0].equity)}`;
        for (let i = 0; i < points.length - 1; i++) {
            const x1 = getX(i);
            const y1 = getY(points[i].equity);
            const x2 = getX(i + 1);
            const y2 = getY(points[i + 1].equity);
            const cpX = (x1 + x2) / 2;
            pathD += ` C ${cpX} ${y1} ${cpX} ${y2} ${x2} ${y2}`;
        }

        const areaD = `${pathD} L ${getX(points.length - 1)} ${height} L ${getX(0)} ${height} Z`;

        return { pathD, areaD, width, height, points, minY: getY(minVal), zeroY: getY(0), getX, getY };
    }, [pnlData]);

    const handleMouseMove = (e) => {
        if (!chartSettings || !svgRef.current) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const xRel = e.clientX - rect.left;
        const yRel = e.clientY - rect.top;

        const svg = svgRef.current;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

        const x = svgP.x;
        const width = chartSettings.width;

        // Find closest point by x coordinate
        const index = Math.round((x / width) * (chartSettings.points.length - 1));
        const clampedIndex = Math.max(0, Math.min(index, chartSettings.points.length - 1));
        const point = chartSettings.points[clampedIndex];

        setHoveredPoint({ ...point, index: clampedIndex });
        setTooltipPos({ x: xRel, y: yRel });
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
                <SkeletonChart />
                <div className="bg-white dark:bg-surface-dark p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-8">
                    <div className="h-4 w-32 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                            <div className="flex justify-between">
                                <div className="h-3 w-20 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                                <div className="h-3 w-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse" />
                            </div>
                            <div className="h-2 w-full bg-slate-100 dark:bg-white/5 rounded-full animate-pulse" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
            {/* Equity Curve Optimization */}
            <div className="bg-slate-900/40 backdrop-blur-[45px] p-6 rounded-[2.5rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] flex flex-col relative overflow-hidden group transition-all duration-700 hover:border-white/20">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />

                <div className="flex items-center justify-between mb-3 relative z-10">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] block mb-1">Performance Hub</span>
                        <h3 className="text-sm font-black dark:text-white uppercase tracking-wider italic">Equity Curve</h3>
                    </div>
                </div>

                <div className="relative w-full aspect-[2.5/1] group/chart cursor-crosshair">
                    {chartSettings ? (
                        <>
                            <svg
                                ref={svgRef}
                                viewBox={`0 0 ${chartSettings.width} ${chartSettings.height}`}
                                className="w-full h-full overflow-visible drop-shadow-[0_0_15px_rgba(124,93,250,0.15)]"
                                onMouseMove={handleMouseMove}
                                onMouseLeave={() => setHoveredPoint(null)}
                            >
                                <defs>
                                    <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c5dfa" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#7c5dfa" stopOpacity="0" />
                                    </linearGradient>
                                </defs>

                                {/* Zero Axis */}
                                <line
                                    x1="0" y1={chartSettings.zeroY}
                                    x2={chartSettings.width} y2={chartSettings.zeroY}
                                    stroke="currentColor"
                                    className="text-slate-200 dark:text-white/10"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />

                                {/* Area Fill */}
                                <path
                                    d={chartSettings.areaD}
                                    fill="url(#equityGradient)"
                                    className="transition-all duration-1000"
                                />

                                {/* Main Line */}
                                <path
                                    d={chartSettings.pathD}
                                    fill="none"
                                    stroke="#7c5dfa"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="transition-all duration-1000"
                                />

                                {/* Hover Effects */}
                                {hoveredPoint && (
                                    <>
                                        <line
                                            x1={chartSettings.getX(hoveredPoint.index)}
                                            y1="0"
                                            x2={chartSettings.getX(hoveredPoint.index)}
                                            y2={chartSettings.height}
                                            stroke="currentColor"
                                            className="text-primary/30"
                                            strokeWidth="1"
                                            strokeDasharray="2 2"
                                        />
                                        <circle
                                            cx={chartSettings.getX(hoveredPoint.index)}
                                            cy={chartSettings.getY(hoveredPoint.equity)}
                                            r="5"
                                            fill="#7c5dfa"
                                            className="animate-pulse shadow-lg"
                                        />
                                        <circle
                                            cx={chartSettings.getX(hoveredPoint.index)}
                                            cy={chartSettings.getY(hoveredPoint.equity)}
                                            r="8"
                                            fill="none"
                                            stroke="#7c5dfa"
                                            strokeWidth="1"
                                            strokeOpacity="0.5"
                                        />
                                    </>
                                )}
                            </svg>

                            {/* Tooltip Overlay */}
                            {hoveredPoint && (
                                <div
                                    className="absolute z-50 pointer-events-none transition-transform duration-75"
                                    style={{
                                        left: tooltipPos.x,
                                        top: tooltipPos.y - 10,
                                        transform: 'translate(-50%, -100%)',
                                        willChange: 'transform'
                                    }}
                                >
                                    <div className="bg-white/80 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl min-w-[140px] overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                        <div className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-2">{new Date(hoveredPoint.date).toLocaleDateString()}</div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Trade PnL</span>
                                                <span className={`text-xs font-black ${hoveredPoint.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {formatPnL(hoveredPoint.pnl)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center gap-4">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">Equity</span>
                                                <span className="text-xs font-black dark:text-white">
                                                    {formatCurrency(hoveredPoint.equity)}
                                                </span>
                                            </div>
                                        </div>
                                        {hoveredPoint.symbol && (
                                            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-[9px] font-black text-primary uppercase tracking-widest">{hoveredPoint.symbol}</span>
                                                <span className="text-[8px] font-bold text-slate-400">{hoveredPoint.model}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-medium italic">
                            Awaiting trade data for visualization
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] border-t border-slate-100 dark:border-white/5 pt-5">
                    <span>Baseline Genesis</span>
                    <span className="text-primary">Current Trajectory</span>
                </div>
            </div>

            {/* Top Strategies Optimization */}
            <div className="bg-slate-900/40 backdrop-blur-[45px] p-6 rounded-[2.5rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative overflow-hidden group transition-all duration-700 hover:border-white/20">
                {/* Glass Reflection Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="flex items-center justify-between mb-3">
                    <div>
                        <span className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] block mb-1">Alpha Patterns</span>
                        <h3 className="text-sm font-black dark:text-white uppercase tracking-wider italic">Top Strategies</h3>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    {topStrategies.length > 0 ? (
                        topStrategies.map((strategy) => (
                            <div key={strategy.name} className="group/strategy">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary text-lg">psychology</span>
                                        </div>
                                        <div>
                                            <span className="text-sm font-black dark:text-white block leading-none mb-1">{strategy.name}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{strategy.total} Trades Logged</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-emerald-500 tracking-tighter leading-none block">{strategy.winRate}%</span>
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Success Rate</span>
                                    </div>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-white/5 rounded-full p-0.5 border border-slate-200 dark:border-white/10">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary via-primary to-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(124,93,250,0.3)]"
                                        style={{ width: `${strategy.winRate}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-400 text-xs font-medium italic h-48 flex items-center justify-center border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                            Insufficient behavioral data for strategy mapping
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
