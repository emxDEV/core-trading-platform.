import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useData } from './TradeContext';

const AIContext = createContext();

export const useAI = () => useContext(AIContext);

export const AIProvider = ({ children }) => {
    const {
        trades, accounts, userProfile, stats, appSettings,
        setCurrentView, setDateFilter, setAnalyticsFilters
    } = useData();
    const [messages, setMessages] = useState([]);
    const [isThinking, setIsThinking] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [insights, setInsights] = useState([]);

    const getGeminiKey = () => {
        return localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;
    };

    const extractTradingContext = useCallback(() => {
        // Extract a condensed version of trades to stay within context window and privacy
        const condensedTrades = trades.map(t => ({
            date: t.date,
            symbol: t.symbol,
            side: t.side,
            pnl: t.pnl,
            mistakes: t.mistakes,
            notes: t.notes?.substring(0, 100), // Limit notes length
            session: t.trade_session
        })).slice(-50); // Take last 50 trades for context

        const condensedAccounts = accounts.map(a => ({
            name: a.name,
            type: a.type,
            balance: a.balance,
            capital: a.capital
        }));

        return {
            user: userProfile.name,
            stats: {
                winRate: stats.winRate,
                totalPnL: stats.totalPnL,
                totalTrades: stats.totalTrades,
                rank: stats.rank?.name
            },
            trades: condensedTrades,
            accounts: condensedAccounts
        };
    }, [trades, accounts, userProfile, stats]);

    const detectPatterns = useCallback(async () => {
        const apiKey = getGeminiKey();
        if (!apiKey || trades.length < 5) return;

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const context = extractTradingContext();

            const detectionPrompt = `
            Analyze the following trading history for significant positive or negative patterns.
            Look for correlations between Win/Loss and: Session, Day of Week, Time, Symbol, or documented Mistakes.
            
            Data: ${JSON.stringify(context.trades)}
            
            Output format: A JSON array of objects with:
            - type: "positive" | "negative" | "neutral"
            - title: Short catchy title (e.g., "Golden Tuesdays")
            - description: "Hey, I've noticed you have a 80% loss rate on Tuesdays after 10 AM. Want to see the data?"
            - signalLevel: 1-10
            
            ONLY return the JSON array. Limit to 1-2 most significant insights.
            `.trim();

            const result = await model.generateContent(detectionPrompt);
            const text = result.response.text();

            // Clean markdown blocks if present
            const cleanedText = text.replace(/```json|```/g, '').trim();
            const newInsights = JSON.parse(cleanedText);

            setInsights(newInsights);
        } catch (error) {
            console.error("Pattern Detection Error:", error);
        }
    }, [trades, extractTradingContext]);

    // Run pattern detection when trades change (debounced)
    // Increased debounce to 15s and added checks to reduce quota usage
    React.useEffect(() => {
        if (trades.length >= 5) {
            const timer = setTimeout(() => {
                const lastCheck = localStorage.getItem('last_pattern_check');
                const lastCount = localStorage.getItem('last_pattern_trade_count');
                const now = Date.now();
                const currentCount = trades.length;

                // Only run if:
                // 1. Data has changed (different trade count)
                // 2. AND at least 5 minutes have passed since last run
                if (!lastCheck || currentCount !== parseInt(lastCount) || (now - parseInt(lastCheck)) > 300000) {
                    detectPatterns();
                    localStorage.setItem('last_pattern_check', now.toString());
                    localStorage.setItem('last_pattern_trade_count', currentCount.toString());
                }
            }, 15000);
            return () => clearTimeout(timer);
        }
    }, [trades.length, detectPatterns]);

    const executeAIAction = useCallback((action) => {
        console.log("[AI Action Executing]", action);
        try {
            switch (action.type) {
                case 'SET_VIEW':
                    if (action.params?.view) setCurrentView(action.params.view);
                    break;
                case 'SET_DATE_FILTER':
                    if (action.params?.rangeType) setDateFilter(action.params.rangeType);
                    break;
                case 'SET_ANALYTICS_FILTER':
                    if (action.params) {
                        setAnalyticsFilters(prev => ({
                            ...prev,
                            symbol: action.params.symbol || prev.symbol,
                            accountId: action.params.accountId || prev.accountId
                        }));
                    }
                    break;
                default:
                    console.warn("Unknown AI Action Type:", action.type);
            }
        } catch (e) {
            console.error("Execute AI Action Error:", e);
        }
    }, [setCurrentView, setDateFilter, setAnalyticsFilters]);

    const sendMessage = async (userMessage) => {
        const apiKey = getGeminiKey();
        if (!apiKey) {
            setMessages(prev => [...prev,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: "Please configure your Gemini API Key in Settings to enable the AI Agent." }
            ]);
            return;
        }

        setIsThinking(true);
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const context = extractTradingContext();

            const systemPrompt = `You are the CORE Trading Assistant, a fact-based AI agent. 
            You analyze the user's trading data to provide precise, objective feedback.
            
            Current User: ${context.user}
            Performance Stats: ${JSON.stringify(context.stats)}
            Active Accounts (General): ${JSON.stringify(context.accounts)}
            Recent History: ${JSON.stringify(context.trades)}
            
            UNIFIED COMMAND CENTER CAPABILITY:
            You can perform UI actions by appending a JSON block at the end of your response using the format: [[ACTION: { "type": "COMMAND", "params": {} }]]
            Supported Actions:
            1. SET_VIEW: { "view": "dashboard" | "journal" | "analytics" | "calendar" | "social" | "settings" }
            2. SET_DATE_FILTER: { "rangeType": "today" | "yesterday" | "this_week" | "last_week" | "this_month" | "last_month" | "all" }
            3. SET_ANALYTICS_FILTER: { "symbol": "string" | "all", "accountId": "string" | "all" }
            
            Guidelines:
            1. Be concise and professional.
            2. If the user provides data for a SPECIFIC trade in their message, prioritize that data for the analysis.
            3. Use markdown for formatting.
            4. If the user asks to "show", "filter", or "navigate", use the ACTION syntax.
            5. Don't give financial advice; provide data analysis.`;

            const chat = model.startChat({
                history: [
                    {
                        role: "user",
                        parts: [{ text: systemPrompt }],
                    },
                    {
                        role: "model",
                        parts: [{ text: "Understood. I am the CORE Trading Assistant. I have analyzed your data and am ready to provide fact-based insights on your trading performance." }],
                    },
                    ...messages.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }]
                    }))
                ],
            });

            const result = await chat.sendMessage(userMessage);
            const response = await result.response;
            const text = response.text();

            // Action Parser
            const actionMatch = text.match(/\[\[ACTION:\s*({.*?})\]\]/s);
            if (actionMatch) {
                try {
                    const action = JSON.parse(actionMatch[1]);
                    executeAIAction(action);
                    // playSuccess sound to indicate AI did something in the UI
                    soundEngine.playSuccess();
                } catch (e) {
                    console.error("Action Parse Error:", e);
                }
            }

            setMessages(prev => [...prev, { role: 'assistant', content: text.replace(/\[\[ACTION:.*?\]\]/gs, '').trim() }]);
        } catch (error) {
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Protocol error: Failed to connect to the neural network. Please check your API key and connection." }]);
        } finally {
            setIsThinking(false);
        }
    };

    const analyzeTrade = useCallback(async (trade) => {
        setIsPanelOpen(true);
        const tradeContext = `
Symbol: ${trade.symbol}
Side: ${trade.side}
PnL: ${trade.pnl}
Date: ${trade.date}
Account: ${trade.account_name} (${trade.account_type})
Model: ${trade.model || 'N/A'}
Session: ${trade.trade_session || 'N/A'}
Mistakes: ${trade.mistakes || 'None'}
Notes: ${trade.notes || 'No notes provided.'}
        `.trim();

        const userMessage = `ACTION: PERFORM STRATEGIC DEEP-DIVE\n\nAnalyze the following tactical execution data:\n\n${tradeContext}\n\nPlease provide a breakdown of the entry, outcome, and any potential improvements based on this specific data.`;
        await sendMessage(userMessage);
    }, [sendMessage]);

    const suggestMistakes = useCallback(async (notes) => {
        const apiKey = getGeminiKey();
        if (!apiKey || !notes || notes.trim().length < 10) return [];

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
            Analyze the following trading notes and identify 1-3 behavioral mistakes or technical protocol violations mentioned.
            Examples: "FOMO", "Over-leveraged", "Revenge Trading", "Early Exit", "No Stop Loss", "Greed", "Poor Risk Management".
            
            Notes: "${notes}"
            
            Output format: A JSON array of strings (the tag names).
            ONLY return the JSON array.
            `.trim();

            const result = await model.generateContent(prompt);
            const text = result.response.text();
            const cleanedText = text.replace(/```json|```/g, '').trim();
            return JSON.parse(cleanedText);
        } catch (error) {
            console.error("Suggest Mistakes Error:", error);
            return [];
        }
    }, []);

    const summarizeBraindump = useCallback(async (text) => {
        const apiKey = getGeminiKey();
        if (!apiKey || !text || text.trim().length < 10) return null;

        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

            const prompt = `
            You are a professional trading analyst. Transform the following informal voice "braindump" into structured, professional trade notes.
            Focus on: Sentiment, Technical Reasoning, Execution Quality, and Emotional State.
            
            Informal Notes: "${text}"
            
            Output format: A professional markdown summary. Keep it concise.
            `.trim();

            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            console.error("Summarize Braindump Error:", error);
            return null;
        }
    }, []);

    const clearHistory = () => setMessages([]);

    return (
        <AIContext.Provider value={{
            messages,
            sendMessage,
            isThinking,
            isPanelOpen,
            setIsPanelOpen,
            analyzeTrade,
            suggestMistakes,
            summarizeBraindump,
            insights,
            setInsights,
            clearHistory
        }}>
            {children}
        </AIContext.Provider>
    );
};
