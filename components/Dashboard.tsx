import React, { useState, useMemo, useEffect } from 'react';
import type { ParsedCSV, AnalysisResult } from '../types';
import StatCard from './StatCard';
import BarChartCard from './BarChartCard';
import PieChartCard from './PieChartCard';
import LineChartCard from './LineChartCard';
import ScatterChartCard from './ScatterChartCard';
import FilterControls from './FilterControls';
import FilteredResults from './FilteredResults';

interface DashboardProps {
    datasets: ParsedCSV[];
    analysisResults: Record<string, AnalysisResult>;
}

const REQUIRED_PROB_HEADERS = ['Prob_HomeWin', 'Prob_Draw', 'Prob_AwayWin'];

const Dashboard: React.FC<DashboardProps> = ({ datasets, analysisResults }) => {
    const [selectedFile, setSelectedFile] = useState<string>('');
    const [sureWinThreshold, setSureWinThreshold] = useState(0.8);
    const [drawThreshold, setDrawThreshold] = useState(0.5);

    // Effect to synchronize selectedFile with the datasets prop.
    useEffect(() => {
        const currentFileIsValid = datasets.some(d => d.fileName === selectedFile);
        if ((!currentFileIsValid || !selectedFile) && datasets.length > 0) {
            setSelectedFile(datasets[0].fileName);
        }
    }, [datasets, selectedFile]);
    
    const selectedData = useMemo(() => {
        if (!selectedFile) return undefined;
        return datasets.find(d => d.fileName === selectedFile);
    }, [datasets, selectedFile]);

    const selectedAnalysis = useMemo(() => {
        if (!selectedFile) return undefined;
        return analysisResults[selectedFile];
    }, [analysisResults, selectedFile]);
    
    const hasRequiredHeaders = useMemo(() => {
        if (!selectedData) return false;
        return REQUIRED_PROB_HEADERS.every(header => selectedData.headers.includes(header));
    }, [selectedData]);

    const { sureWins, draws } = useMemo(() => {
        if (!selectedData?.data || !hasRequiredHeaders) {
            return { sureWins: [], draws: [] };
        }
        
        const filteredSureWins = selectedData.data.filter(row => 
            row['Prob_HomeWin'] >= sureWinThreshold || row['Prob_AwayWin'] >= sureWinThreshold
        );

        const filteredDraws = selectedData.data.filter(row => 
            row['Prob_Draw'] >= drawThreshold
        );

        return { sureWins: filteredSureWins, draws: filteredDraws };

    }, [selectedData, sureWinThreshold, drawThreshold, hasRequiredHeaders]);

    if (!selectedData || !selectedAnalysis) {
        return <div className="text-center p-8 text-secondary">Loading analysis...</div>;
    }

    return (
        <div className="space-y-8">
            {/* File Selector and Summary */}
            <div className="content-card p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <label htmlFor="file-selector" className="block text-sm font-medium text-secondary mb-1">
                            Selected Dataset
                        </label>
                        <select
                            id="file-selector"
                            value={selectedFile}
                            onChange={(e) => setSelectedFile(e.target.value)}
                            className="themed-select appearance-none w-full md:w-auto pl-4 pr-10 py-2 text-base sm:text-sm"
                        >
                            {datasets.map(d => <option key={d.fileName} value={d.fileName}>{d.fileName}</option>)}
                        </select>
                    </div>
                    <p className="text-secondary md:text-right max-w-xl"><span className="font-semibold text-accent">Dataset Summary:</span> {selectedAnalysis.summary}</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard title="Total Records" value={selectedData.data.length.toLocaleString()} />
                <StatCard title="Columns" value={selectedData.headers.length} />
                <StatCard title="Files Analyzed" value={datasets.length} />
                <StatCard title="Key Statistics" value={selectedAnalysis.insights.length} />
            </div>

            {/* Filter Controls and Results (only if relevant columns exist) */}
            {hasRequiredHeaders ? (
                <div className="space-y-8">
                    <FilterControls 
                        sureWinThreshold={sureWinThreshold}
                        onSureWinChange={setSureWinThreshold}
                        drawThreshold={drawThreshold}
                        onDrawChange={setDrawThreshold}
                    />
                    <FilteredResults
                        sureWins={sureWins}
                        draws={draws}
                    />
                </div>
            ) : (
                <div className="content-card p-6 text-center">
                    <h3 className="text-lg font-semibold">Match Outcome Filters Not Available</h3>
                    <p className="text-secondary mt-2">To use the prediction filters, your CSV must contain the columns: <code className="code-block">Prob_HomeWin</code>, <code className="code-block">Prob_Draw</code>, and <code className="code-block">Prob_AwayWin</code>.</p>
                </div>
            )}

            {/* Main Content: Insights & Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Insights */}
                <div className="lg:col-span-1 content-card p-6">
                    <h3 className="text-lg font-semibold">Data Overview</h3>
                    <ul className="space-y-4">
                        {selectedAnalysis.insights.map((insight, index) => (
                             <li key={index} className="flex items-start">
                                <svg className="flex-shrink-0 h-5 w-5 text-accent mr-3 mt-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="text-secondary">{insight}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                
                {/* Charts */}
                <div className="lg:col-span-2 space-y-8">
                    {selectedAnalysis.chartSuggestions.length > 0 ? (
                        selectedAnalysis.chartSuggestions.map((suggestion, index) => {
                            switch (suggestion.type) {
                                case 'bar':
                                    return <BarChartCard key={index} data={selectedData.data} suggestion={suggestion} />;
                                case 'pie':
                                    return <PieChartCard key={index} data={selectedData.data} suggestion={suggestion} />;
                                case 'line':
                                    return <LineChartCard key={index} data={selectedData.data} suggestion={suggestion} />;
                                case 'scatter':
                                    return <ScatterChartCard key={index} data={selectedData.data} suggestion={suggestion} />;
                                default:
                                    return null;
                            }
                        })
                    ) : (
                        <div className="content-card p-6 flex items-center justify-center h-full min-h-[20rem]">
                            <p className="text-secondary">No suitable columns found for automatic chart generation.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
