import React from 'react';

interface LandingPageProps {
    onStart: () => void;
}

// FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
const FeatureCard: React.FC<{ icon: React.ReactElement, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="content-card p-8 flex flex-col items-center text-center">
        <div className="flex-shrink-0 mb-6 flex items-center justify-center h-16 w-16 rounded-full bg-teal-500 text-white">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-primary mb-3">{title}</h3>
        <p className="text-secondary">{children}</p>
    </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="min-h-screen">
            <main>
                {/* Hero Section */}
                <div className="relative pt-24 pb-32 flex content-center items-center justify-center">
                    <div className="absolute top-0 w-full h-full bg-center bg-cover bg-gradient-to-br from-teal-400 to-sky-500">
                    </div>
                    <div className="container relative mx-auto text-center">
                        <h1 className="text-white font-extrabold text-5xl md:text-6xl mb-4">
                            Unlock Your Betting Edge
                        </h1>
                        <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-8">
                            Turn your football prediction data into actionable insights. Analyze ROI, evaluate odds, and refine your strategy with our powerful dashboard.
                        </p>
                        <button onClick={onStart} className="px-8 py-3 text-lg font-bold text-teal-600 bg-white rounded-full hover:bg-slate-100 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                            Analyze Predictions Now
                        </button>
                    </div>
                </div>

                {/* Features Section */}
                <section className="-mt-24 pb-20">
                    <div className="container mx-auto px-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <FeatureCard
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                                title="Visualize ROI"
                            >
                                Track your performance with dynamic Return on Investment (ROI) graphs. Understand your profitability over time to make smarter decisions.
                            </FeatureCard>
                             <FeatureCard
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>}
                                title="Evaluate Odds"
                            >
                                Analyze the minimum and maximum odds for each prediction. Identify value bets and understand the risk-reward ratio of your model.
                            </FeatureCard>
                             <FeatureCard
                                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                                title="Refine Your Strategy"
                            >
                                Compare the performance of single bets versus accumulator bets. Discover which approach yields better results for your prediction model.
                            </FeatureCard>
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default LandingPage;