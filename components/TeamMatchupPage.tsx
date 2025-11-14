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

const TeamMatchupPage: React.FC = () => {
    const [rows, setRows] = useState<MatchupRow[]>([]);
    const [fileSummary, setFileSummary] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [probFilter, setProbFilter] = useState(0);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);

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
        }
    }, [rows, probStats.min]);

    const filteredRows = useMemo(() => {
        return rows.filter(row => row.Prob_Max >= probFilter);
    }, [rows, probFilter]);

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

                    <div className="content-card p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h3 className="text-lg font-semibold">Prob_Max Filter</h3>
                                <p className="text-secondary text-sm">
                                    Keep matches with Prob_Max greater than or equal to <span className="font-semibold text-primary">{probFilter.toFixed(2)}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <input
                                    type="range"
                                    min={probStats.min}
                                    max={sliderMax}
                                    step="0.01"
                                    value={probFilter}
                                    onChange={(event) => setProbFilter(Number(event.target.value))}
                                    className="flex-1 md:min-w-[240px]"
                                />
                                <div className="text-right">
                                    <p className="text-xs text-secondary">Range</p>
                                    <p className="font-semibold">{probStats.min.toFixed(2)} - {probStats.max.toFixed(2)}</p>
                                </div>
                            </div>
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
                                    Displaying {filteredRows.length} of {rows.length} records (Prob_Max ≥ {probFilter.toFixed(2)}).
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Team</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Opponent</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider">Predicted</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">Prob_Max</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">Lambda_Home</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider">Lambda_Away</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
                                    {filteredRows.map((row, index) => (
                                        <tr key={`${row.Team}-${row.Opponent}-${index}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/70 transition-colors">
                                            <td className="px-4 py-2 font-semibold">{row.Team}</td>
                                            <td className="px-4 py-2">{row.Opponent}</td>
                                            <td className="px-4 py-2">{row.Predicted}</td>
                                            <td className="px-4 py-2 text-right">{row.Prob_Max.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">{row.Lambda_Home.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right">{row.Lambda_Away.toFixed(2)}</td>
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
