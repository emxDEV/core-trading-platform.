import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '../context/AIContext';
import { soundEngine } from '../utils/SoundEngine';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AIAgentPanel() {
    const { messages, sendMessage, isThinking, isPanelOpen, setIsPanelOpen, clearHistory, insights, setInsights, summarizeBraindump } = useAI();
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isBraindumpMode, setIsBraindumpMode] = useState(false);
    const recognitionRef = useRef(null);
    const scrollRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let transcript = '';
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setInput(transcript);
            };

            recognitionRef.current.onend = () => {
                setIsRecording(false);
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech Recognition Error:", event.error);
                setIsRecording(false);
                if (event.error === 'network') {
                    const errorMsg = "PROTOCOL ERROR: Neural Link interruption. This usually occurs if the environment blocks voice-to-text cloud services or if no internet connection is present.";
                    sendMessage(`SYSTEM NOTIFICATION: ${errorMsg}`);
                    setIsRecording(false);
                } else if (event.error === 'not-allowed') {
                    sendMessage("NEURAL LINK FAILURE: Acoustic sensor access was denied. Please check your system's microphone permissions.");
                }
            };
        }
    }, []);

    const toggleRecording = async () => {
        if (isRecording) {
            recognitionRef.current?.stop();
        } else {
            soundEngine.playClick();

            // Re-check permission before starting
            if (window.electron) {
                const granted = await window.electron.ipcRenderer.invoke('request-mic-permission');
                if (!granted) {
                    sendMessage("NEURAL LINK FAILURE: The system was denied access to your acoustic sensor (Microphone). Please enable permissions in your System Settings.");
                    return;
                }
            }

            setInput('');
            setIsBraindumpMode(true); // Auto-enable braindump mode on voice
            try {
                recognitionRef.current?.start();
                setIsRecording(true);
            } catch (e) {
                console.error("Failed to start speech recognition:", e);
                setIsRecording(false);
            }
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;
        soundEngine.playClick();

        const finalInput = input;
        setInput('');

        if (isBraindumpMode) {
            const summary = await summarizeBraindump(finalInput);
            if (summary) {
                sendMessage(`ACTION: SUMMARIZE BRAINDUMP\n\nInput: ${finalInput}\n\nPlease transform this into professional trade notes.`);
            } else {
                sendMessage(finalInput);
            }
            setIsBraindumpMode(false);
        } else {
            sendMessage(finalInput);
        }
    };

    return (
        <>
            {/* Backdrop Overlay */}
            <div
                className={`fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm transition-opacity duration-500 ease-in-out ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsPanelOpen(false)}
            />

            <div className={`fixed inset-y-0 right-0 w-[400px] z-[100] bg-slate-900/40 backdrop-blur-[60px] border-l border-white/10 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Glass Highlight */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent pointer-events-none" />

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-lg shadow-purple-500/10">
                            <span className="material-symbols-outlined text-purple-500 text-[24px]">psychology</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Neural Assistant</h3>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Fact-based Analysis</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { soundEngine.playClick(); clearHistory(); }}
                            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                            title="Clear History"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                        </button>
                        <button
                            onClick={() => { soundEngine.playClick(); setIsPanelOpen(false); }}
                            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Chat Content */}
                <div
                    ref={scrollRef}
                    className="flex-1 h-[calc(100vh-180px)] overflow-y-auto p-6 space-y-6 custom-scrollbar"
                >
                    {/* Neural Insights Section */}
                    {insights && insights.length > 0 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em] italic">Neural Insights</span>
                                <button onClick={() => setInsights([])} className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase font-bold tracking-widest">Dismiss</button>
                            </div>
                            {insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border backdrop-blur-md relative overflow-hidden group/insight cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${insight.type === 'positive'
                                        ? 'bg-emerald-500/5 border-emerald-500/20'
                                        : insight.type === 'negative'
                                            ? 'bg-rose-500/5 border-rose-500/20'
                                            : 'bg-white/5 border-white/10'
                                        }`}
                                    onClick={() => {
                                        soundEngine.playClick();
                                        sendMessage(`Tell me more about the insight: "${insight.title}"`);
                                    }}
                                >
                                    <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20 pointer-events-none ${insight.type === 'positive' ? 'bg-emerald-500' : 'bg-rose-500'
                                        }`} />

                                    <div className="flex items-start gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-lg ${insight.type === 'positive'
                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                            : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                            }`}>
                                            <span className="material-symbols-outlined text-[20px]">
                                                {insight.type === 'positive' ? 'trending_up' : 'warning_amber'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{insight.title}</h4>
                                            <p className="text-[10px] text-slate-300 font-medium leading-relaxed mt-1">{insight.description}</p>
                                        </div>
                                        <div className="opacity-0 group-hover/insight:opacity-100 transition-opacity">
                                            <span className="material-symbols-outlined text-[16px] text-slate-400">arrow_forward</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {messages.length === 0 && (!insights || insights.length === 0) && (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6 opacity-40">
                            <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-[32px] text-white">chat_bubble</span>
                            </div>
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-widest mb-2">Neural Link Ready</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
                                    Ask about your mistakes, performance stats, or best symbols.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-2 w-full pt-4">
                                {['What are my biggest mistakes?', 'Analyze my win rate', 'Which symbol is most profitable?'].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => { setInput(q); handleSend(); }}
                                        className="px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all text-left"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`max-w-[85%] p-4 rounded-2xl ${msg.role === 'user'
                                ? 'bg-primary/20 border border-primary/20 text-white rounded-tr-none'
                                : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-none'
                                }`}>
                                {msg.role === 'user' ? (
                                    <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap">{msg.content}</p>
                                ) : (
                                    <div className="text-xs leading-relaxed font-medium markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {msg.content}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isThinking && (
                        <div className="flex justify-start animate-pulse">
                            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 inset-x-0 p-6 bg-slate-900/60 backdrop-blur-md border-t border-white/5">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => setIsBraindumpMode(!isBraindumpMode)}
                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] transition-all border ${isBraindumpMode
                                ? 'bg-purple-500/20 border-purple-500/30 text-purple-400'
                                : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {isBraindumpMode ? 'Braindump Active' : 'Normal Chat'}
                        </button>
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={isRecording ? 'Listening to your braindump...' : "Type your query..."}
                            className={`w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-28 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 transition-all ${isRecording ? 'ring-2 ring-purple-500/30 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : ''
                                }`}
                        />
                        <div className="absolute right-2 top-2 bottom-2 flex gap-1">
                            <button
                                onClick={toggleRecording}
                                className={`w-10 rounded-xl flex items-center justify-center transition-all ${isRecording
                                    ? 'bg-purple-500 text-white animate-pulse'
                                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                                    }`}
                                title="Voice Braindump"
                            >
                                <span className="material-symbols-outlined text-[20px]">
                                    {isRecording ? 'mic' : 'mic_none'}
                                </span>
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || isThinking}
                                className={`w-10 rounded-xl flex items-center justify-center transition-all ${input.trim() && !isThinking ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-600'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-[20px]">send</span>
                            </button>
                        </div>
                    </div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center mt-4 italic opacity-50">
                        Proprietary Analysis Engine • CORE Trading v1.1.9
                    </p>
                </div>
            </div>
        </>
    );
}
