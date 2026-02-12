import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
            {/* Background Orbs */}
            <div className="fixed top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-float-slow pointer-events-none" />
            <div className="fixed bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-indigo-500/5 blur-[100px] rounded-full animate-float-slow pointer-events-none" style={{ animationDelay: '-7s' }} />
            <div className="fixed top-[40%] left-[60%] w-[25%] h-[25%] bg-violet-500/5 blur-[80px] rounded-full animate-float-slow pointer-events-none" style={{ animationDelay: '-13s' }} />

            <Sidebar />
            <main className="flex-1 flex flex-col overflow-hidden relative z-10">
                <Header />
                <div className="flex-1 overflow-y-auto py-8 custom-scrollbar">
                    <div className="px-8 lg:px-12 h-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
