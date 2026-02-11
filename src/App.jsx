import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Analytics from './components/Analytics';
import CopyCockpit from './components/CopyCockpit';
import NewTradeModal from './components/NewTradeModal';
import DailyPnLModal from './components/DailyPnLModal';
import ImportModal from './components/ImportModal';
import { TradeProvider, useData } from './context/TradeContext';
import { NotificationProvider } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Toaster from './components/Toaster';
import Profile from './components/Profile';
import Settings from './components/Settings';
import UpgradeModal from './components/UpgradeModal';
import AuthPage from './components/AuthPage';
import OnboardingWizard from './components/OnboardingWizard';
import AppTutorial from './components/AppTutorial';

import Calendar from './components/Calendar';
import TitleBar from './components/TitleBar';
import ErrorBoundary from './components/ErrorBoundary';

import { useShortcuts } from './hooks/useShortcuts';
import { useState, useEffect } from 'react';

import { soundEngine } from './utils/SoundEngine';

function App() {
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.init();
      if (soundEngine.context?.state === 'suspended') {
        soundEngine.context.resume();
      }
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <AuthGate />
          <Toaster />
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

function AuthGate() {
  const { isAuthenticated, loading, user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsTutorial, setNeedsTutorial] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [profileName, setProfileName] = useState('');

  useEffect(() => {
    if (user) {
      const onboardingDone = localStorage.getItem(`onboarding_complete_${user.id}`);
      const tutorialDone = localStorage.getItem(`tutorial_complete_${user.id}`);
      setNeedsOnboarding(!onboardingDone);
      setNeedsTutorial(!onboardingDone || !tutorialDone);
      setOnboardingChecked(true);

      // Get profile name for tutorial greeting
      try {
        const saved = localStorage.getItem('userProfile');
        if (saved) setProfileName(JSON.parse(saved).name || '');
      } catch (e) { }
    } else {
      setOnboardingChecked(false);
      setNeedsOnboarding(false);
      setNeedsTutorial(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-dark flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30 animate-pulse">
            <span className="material-symbols-outlined text-white text-[32px]">monitoring</span>
          </div>
          <div className="w-6 h-6 mx-auto border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">Initializing</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  if (!onboardingChecked) {
    return null;
  }

  if (needsOnboarding) {
    return (
      <OnboardingWizard
        onComplete={(profile) => {
          localStorage.setItem('userProfile', JSON.stringify(profile));
          localStorage.setItem(`onboarding_complete_${user.id}`, 'true');
          setProfileName(profile.name || '');
          setNeedsOnboarding(false);
          setNeedsTutorial(true); // Show tutorial after onboarding
        }}
      />
    );
  }

  return (
    <TradeProvider>
      <TitleBar />
      <ShortcutManager />
      <MainContent />
      <GlobalModal />
      <UpgradeContainer />
      {needsTutorial && (
        <AppTutorial
          userName={profileName}
          onComplete={() => {
            localStorage.setItem(`tutorial_complete_${user.id}`, 'true');
            setNeedsTutorial(false);
          }}
        />
      )}
    </TradeProvider>
  );
}

function ShortcutManager() {
  const { setCurrentView, openModal, closeModal, isModalOpen, setIsDailyPnLOpen, appSettings } = useData();

  useShortcuts({
    onNewTrade: () => {
      openModal();
    },
    onViewSwitch: (view) => {
      setCurrentView(view);
    },
    onSettings: () => {
      setCurrentView('settings');
    },
    onEscape: () => {
      closeModal();
      setIsDailyPnLOpen(false);
    },
    onCommandCenter: () => {
      console.log('Command Center activation...');
    }
  }, appSettings.enableShortcuts);

  return null;
}

function UpgradeContainer() {
  const { passedAccounts, setPassedAccounts } = useData();
  return <UpgradeModal accounts={passedAccounts} onClose={() => setPassedAccounts([])} />;
}

function MainContent() {
  const { currentView } = useData();
  return (
    <Layout>
      <div key={currentView} className="page-fade-in h-full overflow-y-auto pr-2 custom-scrollbar">
        {currentView === 'journal' ? <Dashboard /> :
          currentView === 'copy' ? <CopyCockpit /> :
            currentView === 'analytics' ? <Analytics /> :
              currentView === 'calendar' ? <Calendar /> :
                currentView === 'settings' ? <Settings /> :
                  currentView === 'profile' ? <Profile /> :
                    <Dashboard />}
      </div>
    </Layout>
  );
}

function GlobalModal() {
  const { isModalOpen, closeModal, tradeToEdit, isDailyPnLOpen, setIsDailyPnLOpen } = useData();
  return (
    <>
      <NewTradeModal isOpen={isModalOpen} onClose={closeModal} tradeToEdit={tradeToEdit} />
      <DailyPnLModal isOpen={isDailyPnLOpen} onClose={() => setIsDailyPnLOpen(false)} />
      <ImportModal />
    </>
  );
}

export default App;
