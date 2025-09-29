export interface ParsedCSV {
    fileName: string;
    headers: string[];
    data: Record<string, any>[];
}

export type ChartSuggestion = {
    title: string;
    description: string;
} & (
    | { type: 'bar'; column: string }
    | { type: 'pie'; column: string }
    | { type: 'line'; x_column: string; y_column: string }
    | { type: 'scatter'; x_column: string; y_column: string }
);

export interface AnalysisResult {
    summary: string;
    insights: string[];
    chartSuggestions: ChartSuggestion[];
}

// FIX: Define and export the ColumnMapping interface.
export interface ColumnMapping {
    Date: string | null;
    Team: string | null;
    Opponent: string | null;
    Prob_HomeWin: string | null;
    Prob_Draw: string | null;
    Prob_AwayWin: string | null;
}
