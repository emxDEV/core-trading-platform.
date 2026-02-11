import lucidLogo from '../assets/firms/lucid_trading.png';
import tradeifyLogo from '../assets/firms/tradeify.png';
import alphaFuturesLogo from '../assets/firms/alpha_futures.png';
import topstepLogo from '../assets/firms/topstep.png';

export const ACCOUNT_TYPES = ['Live', 'Evaluation', 'Funded', 'Demo', 'Backtesting'];

export const PROP_FIRMS = [
    { name: 'Lucid Trading', logo: lucidLogo, color: '#6366f1', className: 'rounded-full' },
    { name: 'Tradeify', logo: tradeifyLogo, color: '#10b981' },
    { name: 'Alpha Futures', logo: alphaFuturesLogo, color: '#f59e0b' },
    { name: 'TopStep', logo: topstepLogo, color: '#ef4444' },
];

export const TYPE_COLORS = {
    'Live': { border: 'border-emerald-500/40 bg-emerald-500/5', dot: 'bg-emerald-500', active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
    'Evaluation': { border: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-500', active: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
    'Funded': { border: 'border-cyan-500/40 bg-cyan-500/5', dot: 'bg-cyan-500', active: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
    'Demo': { border: 'border-sky-500/40 bg-sky-500/5', dot: 'bg-sky-500', active: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
    'Backtesting': { border: 'border-violet-500/40 bg-violet-500/5', dot: 'bg-violet-500', active: 'bg-violet-500/15 text-violet-400 border-violet-500/30' },
};
