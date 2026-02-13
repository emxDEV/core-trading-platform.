import AppBackground from './AppBackground';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
            <AppBackground />

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
