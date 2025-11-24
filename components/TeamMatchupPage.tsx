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
    Date: string;
    Div: string;
}

type ColumnKey = keyof MatchupRow;

const REQUIRED_COLUMNS: ColumnKey[] = [
    'Team',
    'Opponent',
    'Predicted',
    'Prob_Max',
    'Lambda_Home',
    'Lambda_Away',
    'Date',
    'Div'
];

const COLUMN_ALIASES: Partial<Record<ColumnKey, string[]>> = {
    Prob_Max: ['Prob Max', 'probability_max'],
    Lambda_Home: ['Lambda Home', 'lambda-home'],
    Lambda_Away: ['Lambda Away', 'lambda-away']
};

const DIVISION_LABELS: Record<string, string> = {
    E0: 'Eng Premier League',
    E1: 'Eng Championship',
    E2: 'Eng League 1',
    E3: 'Eng League 2',
    EC: 'Eng Conference',
    SC0: 'Sct Premier League',
    SC1: 'Sct Division 1',
    SC2: 'Sct Division 2',
    SC3: 'Sct Division 3',
    D1: 'Bundesliga',
    D2: 'Bundesliga 2',
    I1: 'Serie A',
    I2: 'Serie B',
    SP1: 'La Liga',
    SP2: 'La Liga Segunda',
    F1: 'Le Championnat',
    F2: 'Fr Division 2',
    N1: 'Eredivisie',
    B1: 'Bel Jupiler League',
    P1: 'Por Liga I',
    T1: 'Tur Futbol Ligi 1',
    G1: 'Greek Ethniki Katigoria'
};

const normalizeHeader = (value: string) => value.replace(/[\s-]+/g, '_').toLowerCase();

const formatDivision = (value: unknown) => {
    const code = typeof value === 'string' ? value.trim().toUpperCase() : String(value || '').toUpperCase();
    if (!code) return '';
    return DIVISION_LABELS[code] ?? code;
};

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
        title: 'Team 2 strikes',
        details: 'Build the plan around Team 2 finding the net once instead of defaulting to an Under 2.5 hedge.',
        gradient: 'from-sky-500 via-cyan-500 to-emerald-400'
    },
    {
        score: '0-2',
        title: 'Away Pro_Max surge',
        details: 'High Prob_Max readings scream for the clean Away win—double down on those Team 2 exact-score combos.',
        gradient: 'from-emerald-600 via-teal-500 to-cyan-400'
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

interface BetCriteriaSetting {
    id: string;
    title: string;
    market: string;
    groups: string[];
    probMin?: number;
    lambdaHomeTarget?: number;
    lambdaTolerance?: number;
}

interface BetSlipGroup {
    setting: BetCriteriaSetting;
    selections: MatchupRow[];
    total: number;
}

const MAX_SELECTIONS_PER_CRITERIA = 5;

const DEFAULT_ACCUMULATOR_SETTINGS: BetCriteriaSetting[] = [
    {
        id: 'acc-under-25',
        title: 'Tight Totals',
        market: 'Under 2.5',
        groups: ['0-0', '0-1', '1-0'],
        probMin: 0.13
    },
    {
        id: 'acc-over35-btts',
        title: 'Aggressive Tilt',
        market: 'Over 3.5 / BTTS',
        groups: ['3-1']
    },
    {
        id: 'acc-btts',
        title: 'Mutual Strike',
        market: 'Both Teams To Score',
        groups: ['1-1'],
        lambdaHomeTarget: 1.5,
        lambdaTolerance: 0.05
    },
    {
        id: 'acc-home-edge',
        title: 'Home Edge',
        market: 'W1',
        groups: ['2-0'],
        probMin: 0.13
    }
];

const DEFAULT_SINGLE_SETTINGS: BetCriteriaSetting[] = [
    {
        id: 'single-correct-score',
        title: 'Exact Signal',
        market: 'Correct Score 1-1',
        groups: ['1-1'],
        lambdaHomeTarget: 1.5,
        lambdaTolerance: 0.05
    },
    {
        id: 'single-slim-win',
        title: 'Slim Margin',
        market: 'Win by Exactly 1 Goal / Draw',
        groups: ['1-0'],
        probMin: 0.13
    },
    {
        id: 'single-zero-digit',
        title: 'Zero Digit Grid',
        market: 'Zero digit in scoreline',
        groups: ['0-0'],
        probMin: 0.11
    }
];

const RESULTS_PER_PAGE = 35;

const rowMatchesSetting = (row: MatchupRow, setting: BetCriteriaSetting) => {
    if (setting.groups.length && !setting.groups.includes(row.Predicted)) {
        return false;
    }

    if (typeof setting.probMin === 'number' && row.Prob_Max < setting.probMin) {
        return false;
    }

    if (typeof setting.lambdaHomeTarget === 'number') {
        const tolerance = typeof setting.lambdaTolerance === 'number' ? setting.lambdaTolerance : 0.05;
        if (Math.abs(row.Lambda_Home - setting.lambdaHomeTarget) > tolerance) {
            return false;
        }
    }

    return true;
};

const describeSettingCriteria = (setting: BetCriteriaSetting) => {
    const parts: string[] = [];
    if (typeof setting.probMin === 'number') {
        parts.push(`Prob_Max ≥ ${setting.probMin.toFixed(2)}`);
    }
    if (typeof setting.lambdaHomeTarget === 'number') {
        const tolerance = typeof setting.lambdaTolerance === 'number' ? setting.lambdaTolerance : 0.05;
        parts.push(`λHome ≈ ${setting.lambdaHomeTarget.toFixed(2)} ± ${tolerance.toFixed(2)}`);
    }
    if (setting.groups.length) {
        parts.push(`Groups: ${setting.groups.join(', ')}`);
    }
    return parts.join(' • ');
};

const TeamMatchupPage: React.FC = () => {
    const [rows, setRows] = useState<MatchupRow[]>([]);
    const [fileSummary, setFileSummary] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [probFilter, setProbFilter] = useState(0);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [selectedPrediction, setSelectedPrediction] = useState<string>('All');
    const [accumulatorSettings, setAccumulatorSettings] = useState<BetCriteriaSetting[]>(
        () => DEFAULT_ACCUMULATOR_SETTINGS.map(setting => ({ ...setting }))
    );
    const [singleSettings, setSingleSettings] = useState<BetCriteriaSetting[]>(
        () => DEFAULT_SINGLE_SETTINGS.map(setting => ({ ...setting }))
    );
    const [resultsPage, setResultsPage] = useState(1);

    const parseGroupsInput = (value: string) => value.split(',').map(entry => entry.trim()).filter(Boolean);
    const parseNumberInput = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : undefined;
    };

    const updateAccumulatorSetting = (id: string, partial: Partial<BetCriteriaSetting>) => {
        setAccumulatorSettings(prev => prev.map(setting => (
            setting.id === id ? { ...setting, ...partial } : setting
        )));
    };

    const updateSingleSetting = (id: string, partial: Partial<BetCriteriaSetting>) => {
        setSingleSettings(prev => prev.map(setting => (
            setting.id === id ? { ...setting, ...partial } : setting
        )));
    };

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

    const totalPages = Math.max(1, Math.ceil(filteredRows.length / RESULTS_PER_PAGE));
    useEffect(() => {
        setResultsPage(prev => (prev > totalPages ? totalPages : prev));
    }, [totalPages]);

    const pageStartIndex = (resultsPage - 1) * RESULTS_PER_PAGE;
    const pageEndIndex = Math.min(filteredRows.length, pageStartIndex + RESULTS_PER_PAGE);
    const paginatedRows = useMemo(() => (
        filteredRows.slice(pageStartIndex, pageEndIndex)
    ), [filteredRows, pageStartIndex, pageEndIndex]);
    const showingFrom = filteredRows.length ? pageStartIndex + 1 : 0;
    const showingTo = filteredRows.length ? pageEndIndex : 0;

    const goToNextPage = () => setResultsPage(prev => Math.min(totalPages, prev + 1));
    const goToPreviousPage = () => setResultsPage(prev => Math.max(1, prev - 1));

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

    const accumulatorSlip = useMemo<BetSlipGroup[]>(() => (
        accumulatorSettings
            .map(setting => {
                const selections = filteredRows.filter(row => rowMatchesSetting(row, setting));
                if (!selections.length) return null;
                return {
                    setting,
                    selections: selections.slice(0, MAX_SELECTIONS_PER_CRITERIA),
                    total: selections.length
                };
            })
            .filter((group): group is BetSlipGroup => Boolean(group))
    ), [accumulatorSettings, filteredRows]);

    const singleSlip = useMemo<BetSlipGroup[]>(() => (
        singleSettings
            .map(setting => {
                const selections = filteredRows.filter(row => rowMatchesSetting(row, setting));
                if (!selections.length) return null;
                return {
                    setting,
                    selections: selections.slice(0, MAX_SELECTIONS_PER_CRITERIA),
                    total: selections.length
                };
            })
            .filter((group): group is BetSlipGroup => Boolean(group))
    ), [filteredRows, singleSettings]);

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
                Lambda_Away: toNumber(row[columnMap.Lambda_Away]),
                Date: String(row[columnMap.Date] ?? ''),
                Div: formatDivision(row[columnMap.Div])
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
                            Upload a CSV with Team, Opponent, Predicted, Prob_Max, Lambda_Home, Lambda_Away, Date, and Div columns to unlock tailored insights.
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

                    <div className="content-card p-6 space-y-6">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-base font-semibold">Bet Slip Settings</h3>
                                <p className="text-sm text-secondary">
                                    Tune the thresholds driving the automatic Accumulator and Single slips.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-secondary uppercase tracking-widest">Accumulator Criteria</h4>
                                {accumulatorSettings.map(setting => (
                                    <div key={setting.id} className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-secondary">{setting.title}</p>
                                                <p className="text-sm font-semibold">{setting.market}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {typeof setting.probMin === 'number' && (
                                                <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                    Min Prob_Max
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="themed-input mt-1 w-full"
                                                        value={setting.probMin}
                                                        onChange={(event) => updateAccumulatorSetting(setting.id, { probMin: parseNumberInput(event.target.value) ?? 0 })}
                                                    />
                                                </label>
                                            )}
                                            {typeof setting.lambdaHomeTarget === 'number' && (
                                                <>
                                                    <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                        λHome Target
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="themed-input mt-1 w-full"
                                                            value={setting.lambdaHomeTarget}
                                                            onChange={(event) => updateAccumulatorSetting(setting.id, { lambdaHomeTarget: parseNumberInput(event.target.value) ?? 0 })}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                        λHome Range
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="themed-input mt-1 w-full"
                                                            value={setting.lambdaTolerance ?? 0}
                                                            onChange={(event) => updateAccumulatorSetting(setting.id, { lambdaTolerance: parseNumberInput(event.target.value) ?? 0 })}
                                                        />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                        <label className="text-xs font-semibold uppercase tracking-widest text-secondary block">
                                            Groups
                                            <input
                                                type="text"
                                                className="themed-input mt-1 w-full"
                                                value={setting.groups.join(', ')}
                                                onChange={(event) => updateAccumulatorSetting(setting.id, { groups: parseGroupsInput(event.target.value) })}
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-secondary uppercase tracking-widest">Singles Criteria</h4>
                                {singleSettings.map(setting => (
                                    <div key={setting.id} className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-inner dark:border-slate-800/70 dark:bg-slate-900/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-secondary">{setting.title}</p>
                                                <p className="text-sm font-semibold">{setting.market}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {typeof setting.probMin === 'number' && (
                                                <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                    Min Prob_Max
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="themed-input mt-1 w-full"
                                                        value={setting.probMin}
                                                        onChange={(event) => updateSingleSetting(setting.id, { probMin: parseNumberInput(event.target.value) ?? 0 })}
                                                    />
                                                </label>
                                            )}
                                            {typeof setting.lambdaHomeTarget === 'number' && (
                                                <>
                                                    <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                        λHome Target
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="themed-input mt-1 w-full"
                                                            value={setting.lambdaHomeTarget}
                                                            onChange={(event) => updateSingleSetting(setting.id, { lambdaHomeTarget: parseNumberInput(event.target.value) ?? 0 })}
                                                        />
                                                    </label>
                                                    <label className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                                        λHome Range
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            className="themed-input mt-1 w-full"
                                                            value={setting.lambdaTolerance ?? 0}
                                                            onChange={(event) => updateSingleSetting(setting.id, { lambdaTolerance: parseNumberInput(event.target.value) ?? 0 })}
                                                        />
                                                    </label>
                                                </>
                                            )}
                                        </div>
                                        <label className="text-xs font-semibold uppercase tracking-widest text-secondary block">
                                            Groups
                                            <input
                                                type="text"
                                                className="themed-input mt-1 w-full"
                                                value={setting.groups.join(', ')}
                                                onChange={(event) => updateSingleSetting(setting.id, { groups: parseGroupsInput(event.target.value) })}
                                            />
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="content-card p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Accumulator Bet Slip</h3>
                                    <p className="text-sm text-secondary">Built from Focused Tips signals and your thresholds.</p>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                    {accumulatorSlip.reduce((sum, entry) => sum + entry.total, 0)} picks
                                </span>
                            </div>
                            {accumulatorSlip.length === 0 && (
                                <p className="text-sm text-secondary">No qualifying entries yet. Adjust thresholds or upload a richer CSV.</p>
                            )}
                            <div className="space-y-4">
                                {accumulatorSlip.map(entry => (
                                    <div key={entry.setting.id} className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-secondary">{entry.setting.title}</p>
                                                <p className="text-base font-semibold">{entry.setting.market}</p>
                                            </div>
                                            <span className="text-xs font-semibold text-primary">
                                                {entry.total} match{entry.total === 1 ? '' : 'es'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary">{describeSettingCriteria(entry.setting)}</p>
                                        <ul className="space-y-2 text-sm">
                                            {entry.selections.map((selection, index) => (
                                                <li key={`${entry.setting.id}-${selection.Team}-${selection.Opponent}-${index}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/60">
                                                    <div>
                                                        <p className="font-semibold text-primary">{selection.Team} vs {selection.Opponent}</p>
                                                        <p className="text-xs text-secondary">Predicted: {selection.Predicted}</p>
                                                    </div>
                                                    <div className="text-right text-xs">
                                                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Prob {selection.Prob_Max.toFixed(2)}</p>
                                                        <p className="text-secondary">λHome {selection.Lambda_Home.toFixed(2)}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {entry.total > entry.selections.length && (
                                            <p className="text-[11px] text-secondary italic">
                                                +{entry.total - entry.selections.length} more match{entry.total - entry.selections.length === 1 ? '' : 'es'} available
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="content-card p-6 space-y-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Single Bet Slip</h3>
                                    <p className="text-sm text-secondary">Targeted singles ready to lift straight from the grid.</p>
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
                                    {singleSlip.reduce((sum, entry) => sum + entry.total, 0)} picks
                                </span>
                            </div>
                            {singleSlip.length === 0 && (
                                <p className="text-sm text-secondary">No single selections just yet.</p>
                            )}
                            <div className="space-y-4">
                                {singleSlip.map(entry => (
                                    <div key={entry.setting.id} className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 dark:border-slate-800/70 dark:bg-slate-900/20 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-widest text-secondary">{entry.setting.title}</p>
                                                <p className="text-base font-semibold">{entry.setting.market}</p>
                                            </div>
                                            <span className="text-xs font-semibold text-primary">
                                                {entry.total} match{entry.total === 1 ? '' : 'es'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-secondary">{describeSettingCriteria(entry.setting)}</p>
                                        <ul className="space-y-2 text-sm">
                                            {entry.selections.map((selection, index) => (
                                                <li key={`${entry.setting.id}-single-${selection.Team}-${selection.Opponent}-${index}`} className="flex items-start justify-between gap-4 rounded-xl bg-slate-50/80 p-3 dark:bg-slate-800/60">
                                                    <div>
                                                        <p className="font-semibold text-primary">{selection.Team} vs {selection.Opponent}</p>
                                                        <p className="text-xs text-secondary">Predicted: {selection.Predicted}</p>
                                                    </div>
                                                    <div className="text-right text-xs">
                                                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Prob {selection.Prob_Max.toFixed(2)}</p>
                                                        <p className="text-secondary">λHome {selection.Lambda_Home.toFixed(2)}</p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                        {entry.total > entry.selections.length && (
                                            <p className="text-[11px] text-secondary italic">
                                                +{entry.total - entry.selections.length} more match{entry.total - entry.selections.length === 1 ? '' : 'es'} available
                                            </p>
                                        )}
                                    </div>
                                ))}
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
                                    Showing {filteredRows.length ? `${showingFrom}-${showingTo}` : 0} of {filteredRows.length} filtered records
                                    (Prob_Max ≥ {probFilter.toFixed(2)}, {selectedPrediction === 'All' ? 'All predictions' : `${selectedPrediction} group`}) · {rows.length.toLocaleString()} total rows loaded.
                                </p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200/60 dark:divide-slate-700/60 text-sm">
                                <thead className="bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-indigo-500/10 text-xs font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Date</th>
                                        <th className="px-4 py-3 text-left">Div</th>
                                        <th className="px-4 py-3 text-left">Home</th>
                                        <th className="px-4 py-3 text-center">Predicted</th>
                                        <th className="px-4 py-3 text-left">Away</th>
                                        <th className="px-4 py-3 text-right">Prob_Max</th>
                                        <th className="px-4 py-3 text-right">Lambda_Home</th>
                                        <th className="px-4 py-3 text-right">Lambda_Away</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                    {paginatedRows.map((row, index) => (
                                        <tr
                                            key={`${row.Team}-${row.Opponent}-${index}`}
                                            className="bg-white/70 dark:bg-slate-900/20 hover:bg-teal-50/80 dark:hover:bg-slate-800/70 transition-colors"
                                        >
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                                {row.Date || '—'}
                                            </td>
                                            <td className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                                                {row.Div || '—'}
                                            </td>
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
                        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <p className="text-sm text-secondary">
                                Records per page: {RESULTS_PER_PAGE}
                            </p>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={goToPreviousPage}
                                    disabled={resultsPage === 1}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Previous
                                </button>
                                <span className="text-sm font-semibold text-secondary">
                                    Page {filteredRows.length ? resultsPage : 1} / {filteredRows.length ? totalPages : 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={goToNextPage}
                                    disabled={resultsPage >= totalPages || !filteredRows.length}
                                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TeamMatchupPage;
