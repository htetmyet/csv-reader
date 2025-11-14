import React, { useState, useCallback } from 'react';
import { parseCSV } from './services/csvParser';
import { getAnalysis } from './services/geminiService';
import type { ParsedCSV, AnalysisResult } from './types';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Loader from './components/Loader';
import LandingPage from './components/LandingPage';
import TeamMatchupPage from './components/TeamMatchupPage';

const App: React.FC = () => {
    const [view, setView] = useState<'landing' | 'dashboard' | 'matchups'>('landing');
    const [datasets, setDatasets] = useState<ParsedCSV[]>([]);
    const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleFiles = useCallback(async (files: FileList) => {
        if (files.length === 0) return;
        setIsLoading(true);
        setError(null);
        setDatasets([]);
        setAnalysisResults({});

        try {
            const parsedPromises = Array.from(files).map(file => parseCSV(file));
            const parsedData = await Promise.all(parsedPromises);
            setDatasets(parsedData);

            const results: Record<string, AnalysisResult> = {};
            // Use a for...of loop to handle potential analysis errors individually.
            for (const data of parsedData) {
                try {
                    results[data.fileName] = getAnalysis(data);
                } catch (analysisErr) {
                    const message = analysisErr instanceof Error ? analysisErr.message : "An unknown error occurred.";
                    // Throw a more specific error to be caught by the outer catch block.
                    throw new Error(`Analysis failed for file "${data.fileName}": ${message}`);
                }
            }
            setAnalysisResults(results);

        } catch (err) {
            console.error("Error processing files:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred during file processing.");
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleReset = () => {
        setDatasets([]);
        setAnalysisResults({});
        setError(null);
    };

    const handleGoToLanding = () => {
        handleReset();
        setView('landing');
    };
    
    const handleStartAnalysis = () => {
        setView('dashboard');
    };

    const handleOpenTeamVisualizer = () => {
        setView('matchups');
    };

    const handleNavigate = (targetView: 'dashboard' | 'matchups') => {
        setView(targetView);
    };

    if (view === 'landing') {
        return <LandingPage onStart={handleStartAnalysis} onOpenTeamPage={handleOpenTeamVisualizer} />;
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header
                onReset={handleReset}
                onGoToLanding={handleGoToLanding}
                hasData={view === 'dashboard' && datasets.length > 0}
                onNavigate={handleNavigate}
                currentView={view === 'dashboard' ? 'dashboard' : 'matchups'}
            />
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                {view === 'dashboard' ? (
                    <>
                        {isLoading && <Loader message="Analyzing your prediction data..." />}
                        
                        {!isLoading && error && (
                            <div className="text-center p-8 content-card max-w-2xl mx-auto">
                                <h2 className="text-2xl font-bold text-red-500 mb-4">Processing Error</h2>
                                <p className="text-secondary text-lg">{error}</p>
                                <button 
                                    onClick={handleReset}
                                    className="mt-6 px-6 py-2 text-sm font-semibold primary-button"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && datasets.length === 0 && (
                            <FileUpload onFilesSelected={handleFiles} />
                        )}

                        {!isLoading && !error && datasets.length > 0 && (
                            <Dashboard datasets={datasets} analysisResults={analysisResults} />
                        )}
                    </>
                ) : (
                    <TeamMatchupPage />
                )}
            </main>
        </div>
    );
};

export default App;
