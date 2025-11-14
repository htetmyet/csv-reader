import React from 'react';
import ThemeSwitcher from './ThemeSwitcher';

interface HeaderProps {
    onReset: () => void;
    onGoToLanding: () => void;
    hasData: boolean;
    onNavigate: (view: 'dashboard' | 'matchups') => void;
    currentView: 'dashboard' | 'matchups';
}

const Header: React.FC<HeaderProps> = ({ onReset, onGoToLanding, hasData, onNavigate, currentView }) => {
    const buildNavButton = (view: 'dashboard' | 'matchups', label: string) => {
        const isActive = currentView === view;
        return (
            <button
                onClick={() => onNavigate(view)}
                className={`px-4 py-2 text-sm font-semibold rounded-full transition-all ${
                    isActive
                        ? 'bg-teal-500 text-white shadow-lg shadow-teal-400/30'
                        : 'text-secondary hover:text-primary'
                }`}
            >
                {label}
            </button>
        );
    };

    return (
        <header className="app-header sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:p-8">
                <div className="flex items-center justify-between h-16">
                    <button onClick={onGoToLanding} className="flex items-center space-x-3 group">
                         <svg className="h-8 w-8 text-teal-500 group-hover:text-teal-600 transition-colors" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 21.4599C17.2132 21.4599 21.46 17.2131 21.46 11.9999C21.46 6.78671 17.2132 2.53992 12 2.53992C6.7868 2.53992 2.54001 6.78671 2.54001 11.9999C2.54001 17.2131 6.7868 21.4599 12 21.4599Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.5 14.5L12 12L8.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 12V16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                         </svg>
                        <h1 className="header-title text-xl font-bold transition-colors">Prediction Dashboard</h1>
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-slate-800/60 rounded-full px-2 py-1">
                            {buildNavButton('dashboard', 'Standard Dashboard')}
                            {buildNavButton('matchups', 'Team Visualizer')}
                        </div>
                        {hasData && (
                             <button
                                onClick={onReset}
                                className="inline-flex items-center px-6 py-2 text-sm primary-button"
                            >
                                 Analyze New Files
                            </button>
                        )}
                        <ThemeSwitcher />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
