import React, { useMemo, useState, useEffect } from 'react';
import { parseCSV } from '../services/csvParser';
import type { ParsedCSV } from '../types';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Brush,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar
} from 'recharts';

interface MatchupRow {
    Team: string;
    Opponent: string;
    Predicted: string;
    Prob_Max: number;
    Lambda_Home: number;
    Lambda_Away: number;
}

type ColumnKey = keyof MatchupRow;

const REQUIRED_COLUMNS: ColumnKey[] = [
    'Team',
    'Opponent',
    'Predicted',
    'Prob_Max',
    'Lambda_Home',
    'Lambda_Away'
];

const COLUMN_ALIASES: Partial<Record<ColumnKey, string[]>> = {
    Prob_Max: ['Prob Max', 'probability_max'],
    Lambda_Home: ['Lambda Home', 'lambda-home'],
    Lambda_Away: ['Lambda Away', 'lambda-away']
};

const normalizeHeader = (value: string) => value.replace(/[\s-]+/g, '_').toLowerCase();

const getColumnMap = (headers: string[]): Record<ColumnKey, string> => {
    const normalizedHeaders = headers.map(header => ({
        original: header,
        normalized: normalizeHeader(header)
    }));

    const columnMap = {} as Record<ColumnKey, string>;

    REQUIRED_COLUMNS.forEach(column => {
        const candidates = [column, ...(COLUMN_ALIASES[column] || [])].map(normalizeHeader);
        const match = normalizedHeaders.find(header => candidates.includes(header.normalized));
        if (!match) {
            throw new Error(`Missing required column: ${column}`);
        }
        columnMap[column] = match.original;
    });

    return columnMap;
};

const toNumber = (value: unknown) => {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const scoringTips = [
    {
        score: '0-0',
        title: 'Zero digit lock',
        details: 'High Prob_Max score when both sides trend to the zero-digit grid; lean into stalemate hedges.',
        gradient: 'from-blue-600 via-indigo-500 to-slate-500'
    },
    {
        score: '0-1',
        title: 'Under 2.5 focus',
        details: 'For higher scores, play it safer with Under 2.5 and sprinkle correct score options.',
        gradient: 'from-sky-500 via-cyan-500 to-emerald-400'
    },
    {
        score: '2-0',
        title: 'Home win control',
        details: 'Higher scoring projection favors a confident Home Win outcome.',
        gradient: 'from-emerald-500 via-teal-500 to-lime-400'
    },
    {
        score: '3-1',
        title: 'Over 3.5 spark',
        details: 'Open matches trending aggressive lean heavily toward the Over 3.5 market.',
        gradient: 'from-orange-500 via-amber-500 to-yellow-400'
    },
    {
        score: '1-1',
        title: 'λHome 1.5 signal',
        details: 'When λHome hovers near 1.5, lean into Both Teams To Score plus the 1-1 correct score hedge.',
        gradient: 'from-fuchsia-500 via-purple-500 to-indigo-500'
    },
    {
        score: '1-0',
        title: 'Tight home edge',
        details: 'Back the home side to win by one or grind out a draw when their edge is slim.',
        gradient: 'from-rose-500 via-pink-500 to-red-500'
    }
];

const TeamMatchupPage: React.FC = () => {
    const [rows, setRows] = useState<MatchupRow[]>([]);
    const [fileSummary, setFileSummary] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [probFilter, setProbFilter] = useState(0);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [selectedPrediction, setSelectedPrediction] = useState<string>('All');

    const probStats = useMemo(() => {
        if (!rows.length) {
            return { min: 0, max: 1, average: 0 };
        }
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let total = 0;

        rows.forEach(row => {
            min = Math.min(min, row.Prob_Max);
            max = Math.max(max, row.Prob_Max);
            total += row.Prob_Max;
        });

        return {
            min: Number.isFinite(min) ? min : 0,
            max: Number.isFinite(max) ? max : 1,
            average: rows.length ? total / rows.length : 0
        };
    }, [rows]);

    useEffect(() => {
        if (rows.length) {
            setProbFilter(probStats.min);
        } else {
            setProbFilter(0);
            setSelectedPrediction('All');
        }
    }, [rows, probStats.min]);

    const predictionGroups = useMemo(() => {
        const unique = new Set<string>();
        rows.forEach(row => unique.add(row.Predicted || 'Unknown'));
        return Array.from(unique);
    }, [rows]);

    useEffect(() => {
        if (selectedPrediction !== 'All' && !predictionGroups.includes(selectedPrediction)) {
            setSelectedPrediction('All');
        }
    }, [predictionGroups, selectedPrediction]);

    const filteredRows = useMemo(() => {
        return rows.filter(row => {
            const matchesProb = row.Prob_Max >= probFilter;
            const matchesPrediction = selectedPrediction === 'All' || row.Predicted === selectedPrediction;
            return matchesProb && matchesPrediction;
        });
    }, [rows, probFilter, selectedPrediction]);

    const predictedDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredRows.forEach(row => {
            const key = row.Predicted || 'Unspecified';
            counts[key] = (counts[key] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, count }));
    }, [filteredRows]);

    const lambdaAverages = useMemo(() => {
        const grouped: Record<string, { home: number; away: number; count: number }> = {};
        filteredRows.forEach(row => {
            const key = row.Predicted || 'Unspecified';
            if (!grouped[key]) {
                grouped[key] = { home: 0, away: 0, count: 0 };
            }
            grouped[key].home += row.Lambda_Home;
            grouped[key].away += row.Lambda_Away;
            grouped[key].count += 1;
        });

        return Object.entries(grouped).map(([category, values]) => ({
            category,
            home: values.count ? values.home / values.count : 0,
            away: values.count ? values.away / values.count : 0
        }));
    }, [filteredRows]);

    const highlightMatch = useMemo(() => {
        if (!filteredRows.length) return null;
        return filteredRows.reduce((best, row) =>
            row.Prob_Max > best.Prob_Max ? row : best
        , filteredRows[0]);
    }, [filteredRows]);

    const sliderMax = useMemo(() => (
        probStats.max === probStats.min ? probStats.min + 1 : probStats.max
    ), [probStats.max, probStats.min]);

    const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setError(null);
        setRows([]);
        setFileSummary('');

        try {
            const parsed: ParsedCSV = await parseCSV(file);
            const columnMap = getColumnMap(parsed.headers);

            const normalizedRows: MatchupRow[] = parsed.data.map(row => ({
                Team: String(row[columnMap.Team] ?? ''),
                Opponent: String(row[columnMap.Opponent] ?? ''),
                Predicted: String(row[columnMap.Predicted] ?? 'Unknown'),
                Prob_Max: toNumber(row[columnMap.Prob_Max]),
                Lambda_Home: toNumber(row[columnMap.Lambda_Home]),
                Lambda_Away: toNumber(row[columnMap.Lambda_Away])
            }));

            setRows(normalizedRows);
            setFileSummary(`${file.name} · ${normalizedRows.length} rows`);
        } catch (csvError) {
            const message = csvError instanceof Error ? csvError.message : 'Unable to parse file.';
            setError(message);
        } finally {
            setIsParsing(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                setImagePreview(result);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="space-y-8">
            <div className="content-card p-6 space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold">Team Comparison Visualizer</h2>
                        <p className="text-secondary">
                            Upload a CSV with Team, Opponent, Predicted, Prob_Max, Lambda_Home, and Lambda_Away columns to unlock tailored insights.
                        </p>
                    </div>
                    {fileSummary && (
                        <span className="text-sm font-semibold accent-pill px-4 py-2 rounded-full">
                            {fileSummary}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="primary-button text-center cursor-pointer px-5 py-3">
                        Upload CSV
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleCSVUpload}
                            className="sr-only"
                        />
                    </label>
                    <label className="secondary-button text-center cursor-pointer px-5 py-3">
                        Upload Comparison Image
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="sr-only"
                        />
                    </label>
                </div>
                {error && <p className="text-red-500">{error}</p>}
                {isParsing && <p className="text-secondary">Parsing CSV...</p>}
            </div>

            {imagePreview && (
                <div className="content-card p-4">
                    <h3 className="text-lg font-semibold mb-4">Uploaded Chart</h3>
                    <div className="w-full overflow-hidden rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <img src={imagePreview} alt="Comparison chart" className="w-full object-contain max-h-[32rem] bg-slate-50 dark:bg-slate-900" />
                    </div>
                </div>
            )}

            {rows.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="content-card p-4">
                            <p className="text-secondary text-sm">Records loaded</p>
                            <p className="text-3xl font-bold">{rows.length.toLocaleString()}</p>
                        </div>
                        <div className="content-card p-4">
                            <p className="text-secondary text-sm">Average Prob_Max</p>
                            <p className="text-3xl font-bold">{probStats.average.toFixed(2)}</p>
                        </div>
                        <div className="content-card p-4">
                            <p className="text-secondary text-sm">Top Match (by Prob_Max)</p>
                            <p className="text-base font-semibold">
                                {highlightMatch ? `${highlightMatch.Team} vs ${highlightMatch.Opponent}` : 'N/A'}
                            </p>
                            {highlightMatch && (
                                <p className="text-sm text-secondary">
                                    Predicted: <span className="font-semibold text-primary">{highlightMatch.Predicted}</span>
                                </p>
                            )}
                            {highlightMatch && <p className="text-sm text-secondary mt-1">Prob_Max: {highlightMatch.Prob_Max.toFixed(2)}</p>}
                        </div>
                    </div>

                    <div className="content-card p-4 md:p-5 space-y-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-base font-semibold tracking-tight">Focused Filters</h3>
                                <p className="text-xs text-secondary">
                                    Dial in a compact slice of the data using just the essentials.
                                </p>
                            </div>
                            <span className="inline-flex items-center justify-center rounded-full bg-slate-100/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-secondary dark:bg-slate-900/50">
                                Active {filteredRows.length.toLocaleString()} / {rows.length.toLocaleString()}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/20">
                                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-secondary">
                                    <span>Prob_Max</span>
                                    <span className="text-sm text-primary">{probFilter.toFixed(2)}</span>
                                </div>
                                <input
                                    type="range"
                                    min={probStats.min}
                                    max={sliderMax}
                                    step="0.01"
                                    value={probFilter}
                                    onChange={(event) => setProbFilter(Number(event.target.value))}
                                    className="custom-slider mt-3"
                                />
                                <div className="mt-2 flex justify-between text-[11px] font-medium text-secondary">
                                    <span>Min {probStats.min.toFixed(2)}</span>
                                    <span>Max {probStats.max.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/20">
                                <label htmlFor="prediction-filter" className="text-[11px] font-semibold uppercase tracking-widest text-secondary">
                                    Predicted Group
                                </label>
                                <select
                                    id="prediction-filter"
                                    value={selectedPrediction}
                                    onChange={(event) => setSelectedPrediction(event.target.value)}
                                    className="themed-select mt-2 w-full px-4 py-2 text-sm"
                                >
                                    <option value="All">All Predictions</option>
                                    {predictionGroups.map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                                <p className="mt-3 text-xs text-secondary">
                                    Keep it lean by isolating one predicted outcome or scanning across the entire sheet.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="content-card p-4 md:p-5 space-y-4">
                        <div>
                            <h3 className="text-base font-semibold">Focused Tips</h3>
                            <p className="text-sm text-secondary">
                                Quick visual cheatsheet for the most common scoreline clusters.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                            {scoringTips.map(tip => (
                                <div
                                    key={tip.score}
                                    className={`rounded-2xl border border-white/40 bg-gradient-to-br ${tip.gradient} p-4 text-white shadow-lg`}
                                >
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs uppercase tracking-[0.35em] text-white/80">Group</span>
                                        <span className="text-2xl font-black">{tip.score}</span>
                                    </div>
                                    <p className="mt-2 text-sm font-semibold">{tip.title}</p>
                                    <p className="mt-1 text-xs text-white/90 leading-relaxed">{tip.details}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div className="content-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Predicted Distribution</h3>
                                    <p className="text-secondary text-sm">Number of entries per prediction after filtering.</p>
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 360 }}>
                                <ResponsiveContainer>
                                    <BarChart data={predictedDistribution} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Legend />
                                        <Brush dataKey="name" height={24} stroke="var(--primary-accent)" />
                                        <Bar dataKey="count" fill="var(--primary-accent)" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="content-card p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-lg font-semibold">Lambda Balance</h3>
                                    <p className="text-secondary text-sm">Average Lambda_Home vs Lambda_Away for each predicted outcome.</p>
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 360 }}>
                                <ResponsiveContainer>
                                    <RadarChart data={lambdaAverages}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="category" />
                                        <PolarRadiusAxis angle={45} />
                                        <Radar name="Home" dataKey="home" stroke="var(--primary-accent)" fill="var(--primary-accent)" fillOpacity={0.6} />
                                        <Radar name="Away" dataKey="away" stroke="var(--secondary-accent)" fill="var(--secondary-accent)" fillOpacity={0.3} />
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="content-card p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">Filtered Results</h3>
                                <p className="text-secondary text-sm">
                                    Displaying {filteredRows.length} of {rows.length} records (Prob_Max ≥ {probFilter.toFixed(2)}, {selectedPrediction === 'All' ? 'All predictions' : `${selectedPrediction} group`}).
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-700/60 text-sm">
                                <thead className="bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 text-xs font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Home</th>
                                        <th className="px-4 py-3 text-center">Predicted</th>
                                        <th className="px-4 py-3 text-left">Away</th>
                                        <th className="px-4 py-3 text-right">Prob_Max</th>
                                        <th className="px-4 py-3 text-right">Lambda_Home</th>
                                        <th className="px-4 py-3 text-right">Lambda_Away</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                    {filteredRows.map((row, index) => (
                                        <tr
                                            key={`${row.Team}-${row.Opponent}-${index}`}
                                            className="bg-white/70 dark:bg-slate-900/20 hover:bg-teal-50/80 dark:hover:bg-slate-800/70 transition-colors"
                                        >
                                            <td className="px-4 py-4 font-semibold text-primary">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-teal-400" />
                                                    {row.Team}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100 shadow-inner">
                                                    {row.Predicted}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-semibold text-primary">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex h-2 w-2 rounded-full bg-sky-400" />
                                                    {row.Opponent}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <span className="inline-flex items-center justify-end font-semibold text-emerald-600 dark:text-emerald-400">
                                                    {row.Prob_Max.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">
                                                {row.Lambda_Home.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">
                                                {row.Lambda_Away.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeamMatchupPage;
