import React from 'react';

interface FilteredResultsProps {
    sureWins: Record<string, any>[];
    draws: Record<string, any>[];
    sureWinThreshold: number;
    drawThreshold: number;
}

const DISPLAY_KEYS = ['Date', 'Team', 'Opponent', 'Predicted Result', 'Prob_HomeWin', 'Prob_Draw', 'Prob_AwayWin'];
const PROBABILITY_KEYS = ['Prob_HomeWin', 'Prob_Draw', 'Prob_AwayWin'];

interface ResultsTableProps {
    data: Record<string, any>[];
    category: 'win' | 'draw';
    sureWinThreshold: number;
    drawThreshold: number;
}

const ResultsTable: React.FC<ResultsTableProps> = ({ data, category, sureWinThreshold, drawThreshold }) => {
    if (data.length === 0) {
        return <p className="text-secondary text-center py-8">No matches meet the criteria.</p>;
    }

    const getPredictedResult = (row: Record<string, any>): { text: string; color: string; } => {
        if (category === 'draw') {
            return { text: 'Draw', color: 'text-amber' };
        }
        
        const homeWinProb = row['Prob_HomeWin'] || 0;
        const awayWinProb = row['Prob_AwayWin'] || 0;

        if (homeWinProb >= awayWinProb) {
            return { text: 'Home Win', color: 'text-sky' };
        } else {
            return { text: 'Away Win', color: 'text-teal' };
        }
    };

    return (
        <div className="table-container overflow-auto max-h-96 rounded-lg">
            <table className="min-w-full divide-y divide-transparent">
                <thead className="table-header sticky top-0 z-10">
                    <tr>
                        {DISPLAY_KEYS.map(key => (
                            <th key={key} scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                                {key.replace(/_/g, ' ')}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="table-body divide-y">
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="table-row">
                            {DISPLAY_KEYS.map(key => {
                                let cellContent: React.ReactNode = 'N/A';
                                let cellClass = 'text-secondary';

                                if (key === 'Predicted Result') {
                                    const result = getPredictedResult(row);
                                    cellContent = result.text;
                                    cellClass = `${result.color} font-semibold`;
                                } else {
                                    const value = row[key];
                                    if (value !== undefined && value !== null) {
                                        if (PROBABILITY_KEYS.includes(key) && typeof value === 'number') {
                                            const formattedValue = value.toFixed(3);
                                            const meetsThreshold =
                                                (key === 'Prob_Draw' && value >= drawThreshold) ||
                                                (key !== 'Prob_Draw' && value >= sureWinThreshold);

                                            if (meetsThreshold) {
                                                let highlightClass = 'probability-pill';
                                                if (key === 'Prob_HomeWin') {
                                                    highlightClass += ' probability-pill--home';
                                                } else if (key === 'Prob_AwayWin') {
                                                    highlightClass += ' probability-pill--away';
                                                } else {
                                                    highlightClass += ' probability-pill--draw';
                                                }
                                                cellContent = <span className={highlightClass}>{formattedValue}</span>;
                                                cellClass = 'text-primary';
                                            } else {
                                                cellContent = formattedValue;
                                            }
                                        } else {
                                            cellContent = String(value);
                                        }
                                    }
                                }

                                return (
                                    <td key={`${rowIndex}-${key}`} className={`px-4 py-3 whitespace-nowrap text-sm ${cellClass}`}>
                                        {cellContent}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FilteredResults: React.FC<FilteredResultsProps> = ({ sureWins, draws, sureWinThreshold, drawThreshold }) => {
    return (
        <div className="flex flex-col gap-8">
            {/* Sure Wins Card */}
            <div className="content-card p-6 flex flex-col">
                <h3 className="text-lg font-semibold mb-4">
                    High-Confidence Wins <span className="text-sm font-normal text-secondary">({sureWins.length} matches)</span>
                </h3>
                <div className="flex-grow">
                    <ResultsTable
                        data={sureWins}
                        category="win"
                        sureWinThreshold={sureWinThreshold}
                        drawThreshold={drawThreshold}
                    />
                </div>
            </div>

            {/* Draws Card */}
            <div className="content-card p-6 flex flex-col">
                 <h3 className="text-lg font-semibold mb-4">
                    Potential Draws <span className="text-sm font-normal text-secondary">({draws.length} matches)</span>
                </h3>
                 <div className="flex-grow">
                    <ResultsTable
                        data={draws}
                        category="draw"
                        sureWinThreshold={sureWinThreshold}
                        drawThreshold={drawThreshold}
                    />
                </div>
            </div>
        </div>
    );
};

export default FilteredResults;
