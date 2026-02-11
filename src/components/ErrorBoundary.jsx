import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        // Log to console or telemetry
        console.error("Neural Shield caught a critical failure:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-[999999] bg-[#100e1a] flex items-center justify-center p-6 select-none overflow-hidden">
                    {/* Background Orbs (Reusing our design tokens) */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-float-slow" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full animate-float-slow" style={{ animationDelay: '-5s' }} />

                    <div className="relative max-w-lg w-full text-center space-y-8 animate-in zoom-in-95 duration-700">
                        <div className="relative inline-block">
                            <div className="absolute inset-0 bg-rose-500/20 blur-3xl rounded-full animate-pulse" />
                            <div className="relative w-24 h-24 rounded-[2rem] bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto shadow-2xl">
                                <span className="material-symbols-outlined text-5xl text-rose-500">terminal</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                <h2 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.5em]">System Failure</h2>
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Neural Shield <br /> <span className="text-rose-500">Breached</span>
                            </h1>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm mx-auto">
                                The tactical engine encountered an unhandled exception. State recovery is recommended to prevent data corruption.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-left overflow-hidden">
                                <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mb-2">Error Logs</p>
                                <div className="text-[10px] text-slate-500 font-mono break-all line-clamp-2 italic">
                                    {this.state.error.toString()}
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 pt-4">
                            <button
                                onClick={this.handleReset}
                                className="w-full py-4 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-opacity-90 hover:shadow-[0_0_30px_rgba(124,93,250,0.3)] transition-all transform active:scale-95"
                            >
                                Initiate Soft Reset
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full py-4 bg-white/5 border border-white/10 text-slate-400 text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:text-white transition-all"
                            >
                                Return to Origin
                            </button>
                        </div>

                        <div className="pt-8 opacity-20">
                            <span className="text-[8px] font-black text-white uppercase tracking-[0.5em]">Protocol Error: Code 0xNEURAL_C_01</span>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
