import React, { useState, useRef } from 'react';
import { COUNTRIES } from '../constants/countries';

const STEPS = [
    { id: 'identity', title: 'Identity', icon: 'badge', subtitle: 'Who are you, Operator?' },
    { id: 'location', title: 'Base', icon: 'public', subtitle: 'Where do you operate from?' },
    { id: 'philosophy', title: 'Philosophy', icon: 'psychology', subtitle: 'What drives your trading?' },
    { id: 'avatar', title: 'Visual ID', icon: 'photo_camera', subtitle: 'Upload your operator image' },
    { id: 'protocol', title: 'Protocol', icon: 'shield', subtitle: 'Define your risk parameters' },
    { id: 'missions', title: 'Missions', icon: 'target', subtitle: 'Set your 3 key objectives' },
];

export default function OnboardingWizard({ onComplete }) {
    const [step, setStep] = useState(0);
    const [data, setData] = useState({
        name: '',
        codename: '',
        location: '',
        bio: '',
        avatar: '',
        riskAppetite: 'Balanced',
        dailyPnLGoal: 1000,
        goals: [
            { id: 1, text: '', completed: false },
            { id: 2, text: '', completed: false },
            { id: 3, text: '', completed: false },
        ]
    });
    const fileInputRef = useRef(null);
    const [countryOpen, setCountryOpen] = useState(false);
    const [countrySearch, setCountrySearch] = useState('');

    const currentStep = STEPS[step];
    const progress = ((step + 1) / STEPS.length) * 100;

    const canProceed = () => {
        switch (currentStep.id) {
            case 'identity': return data.name.trim() && data.codename.trim();
            case 'location': return data.location.trim();
            case 'philosophy': return data.bio.trim();
            case 'avatar': return true; // optional
            case 'protocol': return data.dailyPnLGoal > 0;
            case 'missions': return data.goals.filter(g => g.text.trim()).length >= 1;
            default: return true;
        }
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            // Complete onboarding
            const profile = {
                name: data.codename || data.name,
                bio: data.bio,
                avatar: data.avatar || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDU5qbxeGZ1q28nET6V7_0hQ4NxoH7ud3tqcYDgp50RVdhrWsKMQ-nfmoPpypW9CovWtV4x_lsU7cH6JTocjzbiQd-pCplppt1p8_U3OZofiYP_PbnYuJqoSsSyVkhTy0L0aS5QDQCxFYMo4nDBwT_sC42NgRYVFmicT5HIEtL2k1tTOBNwxJMhTxkTbL1JlyEze52t2DVfFeCgVE0AmzHGfVTRNYDq3l8HKz41Kgw3ilX39_5Q9fYqC1dpEqRqIZFXaItdbIomvGLr',
                location: data.location,
                riskAppetite: data.riskAppetite,
                dailyPnLGoal: data.dailyPnLGoal,
                goals: data.goals.filter(g => g.text.trim()),
                memberSince: new Date().getFullYear().toString(),
                realName: data.name,
            };
            onComplete(profile);
        }
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) return;
            const reader = new FileReader();
            reader.onloadend = () => {
                setData(prev => ({ ...prev, avatar: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const filteredCountries = COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
    );

    const selectedCountry = COUNTRIES.find(c => c.name === data.location);

    return (
        <div className="min-h-screen bg-background-dark flex items-center justify-center relative overflow-hidden" style={{ WebkitAppRegion: 'drag' }}>
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[150px]" />

                {/* Grid */}
                <div className="absolute inset-0 opacity-[0.02]" style={{
                    backgroundImage: `
                        linear-gradient(rgba(124,93,250,0.3) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(124,93,250,0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: '60px 60px'
                }} />
            </div>

            <div className="relative z-10 w-full max-w-2xl mx-4" style={{ WebkitAppRegion: 'no-drag' }}>
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30">
                            <span className="material-symbols-outlined text-white text-[24px]">monitoring</span>
                        </div>
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                        Operator Setup
                    </h1>
                    <p className="text-xs text-slate-500 font-bold mt-1 tracking-wide">
                        Configure your trading identity
                    </p>
                </div>

                {/* Step Indicators */}
                <div className="flex items-center gap-2 mb-6 px-4">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex-1 flex items-center gap-2">
                            <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-primary shadow-[0_0_8px_rgba(124,93,250,0.4)]' : 'bg-white/5'}`} />
                        </div>
                    ))}
                </div>

                {/* Card */}
                <div className="bg-surface-dark/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-10 shadow-2xl">
                    {/* Step Header */}
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <span className="material-symbols-outlined text-primary text-[24px]">{currentStep.icon}</span>
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Step {step + 1} of {STEPS.length}</div>
                            <h2 className="text-xl font-black text-white tracking-tight">{currentStep.subtitle}</h2>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="min-h-[280px] flex flex-col justify-center" key={step}>
                        {currentStep.id === 'identity' && (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Real Name</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={e => setData({ ...data, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="Your full name"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Operator Codename</label>
                                    <input
                                        type="text"
                                        value={data.codename}
                                        onChange={e => setData({ ...data, codename: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-black uppercase tracking-widest placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="e.g. PHANTOM, VIPER, NOVA"
                                    />
                                    <p className="text-[9px] text-slate-600 font-bold pl-1">This is how you'll be known in the system</p>
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'location' && (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Base of Operations</label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setCountryOpen(!countryOpen)}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white font-medium flex items-center justify-between transition-all focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                                        >
                                            <div className="flex items-center gap-3">
                                                {selectedCountry ? (
                                                    <>
                                                        <span className="text-2xl">{selectedCountry.flag}</span>
                                                        <span>{selectedCountry.name}</span>
                                                    </>
                                                ) : (
                                                    <span className="text-slate-600">Select your country</span>
                                                )}
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-500 transition-transform duration-300 ${countryOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>

                                        {countryOpen && (
                                            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-[#1A1D26] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease]">
                                                <div className="p-3 border-b border-white/5">
                                                    <input
                                                        autoFocus
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none text-white placeholder-slate-500"
                                                        placeholder="Search..."
                                                        value={countrySearch}
                                                        onChange={e => setCountrySearch(e.target.value)}
                                                    />
                                                </div>
                                                <div className="max-h-[220px] overflow-y-auto custom-scrollbar p-1.5">
                                                    {filteredCountries.map(c => (
                                                        <button
                                                            key={c.code}
                                                            onClick={() => {
                                                                setData({ ...data, location: c.name });
                                                                setCountryOpen(false);
                                                                setCountrySearch('');
                                                            }}
                                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-left transition-all ${c.name === data.location ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/5'}`}
                                                        >
                                                            <span className="text-lg">{c.flag}</span>
                                                            <span className="font-medium">{c.name}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {selectedCountry && (
                                    <div className="flex items-center gap-4 p-5 bg-primary/5 border border-primary/10 rounded-2xl">
                                        <span className="text-4xl">{selectedCountry.flag}</span>
                                        <div>
                                            <div className="text-white font-black text-sm tracking-tight">{selectedCountry.name}</div>
                                            <div className="text-[9px] text-primary/60 font-black uppercase tracking-widest">HQ Authorized</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep.id === 'philosophy' && (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Trading Philosophy Statement</label>
                                    <textarea
                                        rows="5"
                                        value={data.bio}
                                        onChange={e => setData({ ...data, bio: e.target.value })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium italic placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed resize-none"
                                        placeholder="Describe your trading approach, beliefs, and what drives your execution..."
                                        autoFocus
                                    />
                                    <p className="text-[9px] text-slate-600 font-bold pl-1">This appears on your operator profile</p>
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'avatar' && (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="relative group">
                                        <div className="w-32 h-32 rounded-[2rem] overflow-hidden border-2 border-primary/20 bg-white/5 relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                            {data.avatar ? (
                                                <img src={data.avatar} className="w-full h-full object-cover" alt="Avatar" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                                                    <span className="material-symbols-outlined text-[40px] mb-2">add_a_photo</span>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">Upload</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-[2rem]">
                                                <span className="material-symbols-outlined text-white text-[32px]">photo_camera</span>
                                            </div>
                                        </div>
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black text-slate-400 hover:text-white uppercase tracking-[0.2em] transition-all"
                                    >
                                        Choose File
                                    </button>
                                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">PNG, JPG up to 2MB • Optional</p>
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'protocol' && (
                            <div className="space-y-8 animate-[fadeIn_0.4s_ease]">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Risk Protocol</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['Conservative', 'Balanced', 'Aggressive'].map(risk => (
                                            <button
                                                key={risk}
                                                onClick={() => setData({ ...data, riskAppetite: risk })}
                                                className={`py-4 rounded-2xl text-xs font-black uppercase tracking-[0.15em] transition-all border ${data.riskAppetite === risk
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                                                    : 'bg-white/5 text-slate-500 border-white/10 hover:border-primary/30 hover:text-white'}`}
                                            >
                                                {risk}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Daily Capital Goal ($)</label>
                                    <input
                                        type="number"
                                        value={data.dailyPnLGoal}
                                        onChange={e => setData({ ...data, dailyPnLGoal: parseFloat(e.target.value) || 0 })}
                                        className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-2xl text-white font-black placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                        placeholder="1000"
                                    />
                                    <p className="text-[9px] text-slate-600 font-bold pl-1">Your daily PnL target — tracked on the dashboard</p>
                                </div>
                            </div>
                        )}

                        {currentStep.id === 'missions' && (
                            <div className="space-y-6 animate-[fadeIn_0.4s_ease]">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Your 3 Key Missions</label>
                                    <p className="text-[9px] text-slate-600 font-bold pl-1 mb-4">Define the milestones you want to achieve</p>
                                </div>
                                {data.goals.map((goal, idx) => (
                                    <div key={goal.id} className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-black">
                                            0{idx + 1}
                                        </div>
                                        <input
                                            type="text"
                                            value={goal.text}
                                            onChange={e => {
                                                const updated = data.goals.map((g, i) => i === idx ? { ...g, text: e.target.value } : g);
                                                setData({ ...data, goals: updated });
                                            }}
                                            className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-sm text-white font-medium placeholder-slate-600 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                                            placeholder={
                                                idx === 0 ? 'e.g. Pass 3 evaluations this quarter' :
                                                    idx === 1 ? 'e.g. Maintain 60%+ win rate' :
                                                        'e.g. Scale to $500k in funded capital'
                                            }
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-4 mt-8 pt-6 border-t border-white/5">
                        {step > 0 && (
                            <button
                                onClick={handleBack}
                                className="px-6 py-4 bg-white/5 border border-white/10 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/10 hover:text-white transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!canProceed()}
                            className="flex-1 py-4 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.25em] shadow-xl shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {step === STEPS.length - 1 ? (
                                <>
                                    <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                    Launch Terminal
                                </>
                            ) : (
                                <>
                                    Continue
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Progress Text */}
                <p className="text-center mt-6 text-[10px] text-slate-700 font-bold uppercase tracking-[0.3em]">
                    {Math.round(progress)}% Complete
                </p>
            </div>
        </div>
    );
}
