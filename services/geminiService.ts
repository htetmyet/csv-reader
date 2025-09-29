
import type { ParsedCSV, AnalysisResult, ChartSuggestion } from '../types';

// Helper to identify column type based on a sample of data
const getColumnType = (data: Record<string, any>[], column: string): 'numeric' | 'categorical' | 'date' => {
    const sample = data.slice(0, 10).map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');

    if (sample.length === 0) return 'categorical'; // Default if no data

    // Check for date: if it can be parsed as a date and isn't just a number.
    const isDateLike = sample.every(v => {
        if (typeof v === 'number' && String(v).length < 6) return false; // Avoid treating small integers as dates
        const d = new Date(v);
        return d instanceof Date && !isNaN(d.getTime());
    });

    if (isDateLike && new Set(sample).size > 1) { // Ensure it's not the same date repeated
        return 'date';
    }
    
    // Check for numeric
    const isMostlyNumeric = sample.every(v => 
        typeof v === 'number' || (typeof v === 'string' && (v.trim() === '' || !isNaN(Number(v))))
    );
    
    if (isMostlyNumeric && new Set(sample).size > 1) { // Ensure it has some variation
        return 'numeric';
    }

    return 'categorical';
};

export const getAnalysis = (csvData: ParsedCSV): AnalysisResult => {
    const { fileName, headers, data } = csvData;
    if (data.length === 0) {
        return {
            summary: `The dataset "${fileName}" is empty.`,
            insights: [],
            chartSuggestions: [],
        };
    }
    const rowCount = data.length;
    const colCount = headers.length;

    // 1. Generate Summary
    const summary = `The dataset "${fileName}" contains ${rowCount.toLocaleString()} rows and ${colCount} columns.`;

    // 2. Analyze columns for insights and chart suggestions
    const columnAnalyses = headers.map(header => {
        const uniqueValues = new Set(data.map(row => row[header]));
        return {
            name: header,
            type: getColumnType(data, header),
            uniqueCount: uniqueValues.size
        };
    });

    const numericCols = columnAnalyses.filter(c => c.type === 'numeric');
    const categoricalCols = columnAnalyses.filter(c => c.type === 'categorical');
    const dateCols = columnAnalyses.filter(c => c.type === 'date');

    // 3. Generate Insights
    const insights: string[] = [];
    insights.push(`Found ${numericCols.length} numerical, ${categoricalCols.length} categorical, and ${dateCols.length} date columns.`);
    
    if (numericCols.length > 0) {
        const firstNumeric = numericCols[0].name;
        const values = data.map(row => row[firstNumeric]).filter(v => typeof v === 'number') as number[];
        if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            insights.push(`The average for "${firstNumeric}" is ${avg.toFixed(2)}.`);
        }
    }
    if (categoricalCols.length > 0) {
        const firstCategorical = categoricalCols.sort((a,b) => a.uniqueCount - b.uniqueCount)[0];
        insights.push(`Column "${firstCategorical.name}" has ${firstCategorical.uniqueCount} unique categories.`);
    }

    // 4. Generate Chart Suggestions
    const chartSuggestions: ChartSuggestion[] = [];

    // Bar chart
    const barChartCandidate = categoricalCols
        .filter(c => c.uniqueCount > 1 && c.uniqueCount <= 20)
        .sort((a, b) => a.uniqueCount - b.uniqueCount)[0];

    if (barChartCandidate) {
        chartSuggestions.push({
            type: 'bar',
            column: barChartCandidate.name,
            title: `Distribution of ${barChartCandidate.name}`,
            description: `A bar chart showing the frequency of each category in the "${barChartCandidate.name}" column.`
        });
    }
    
    // Pie chart
    const pieChartCandidate = categoricalCols
        .filter(c => c.name !== barChartCandidate?.name)
        .filter(c => c.uniqueCount > 1 && c.uniqueCount <= 8)
        .sort((a, b) => a.uniqueCount - b.uniqueCount)[0];

    if (pieChartCandidate) {
         chartSuggestions.push({
            type: 'pie',
            column: pieChartCandidate.name,
            title: `Breakdown by ${pieChartCandidate.name}`,
            description: `A pie chart illustrating the proportion of each category in the "${pieChartCandidate.name}" column.`
        });
    }

    // Line chart
    if (dateCols.length > 0 && numericCols.length > 0) {
        const dateCol = dateCols[0].name;
        const numericForLine = numericCols.find(c => c.uniqueCount > 5); // Avoid columns that look like IDs
        if (numericForLine) {
            chartSuggestions.push({
                type: 'line',
                x_column: dateCol,
                y_column: numericForLine.name,
                title: `${numericForLine.name} over Time`,
                description: `A line chart showing the trend of "${numericForLine.name}" against "${dateCol}".`
            });
        }
    }

    // Scatter plot
    if (numericCols.length >= 2) {
        const sortedNumeric = [...numericCols].sort((a, b) => b.uniqueCount - a.uniqueCount);
        if (sortedNumeric[0].uniqueCount > 1 && sortedNumeric[1].uniqueCount > 1) {
            const xCol = sortedNumeric[0].name;
            const yCol = sortedNumeric[1].name;
            chartSuggestions.push({
                type: 'scatter',
                x_column: xCol,
                y_column: yCol,
                title: `Relationship between ${xCol} and ${yCol}`,
                description: `A scatter plot to explore the correlation between "${xCol}" and "${yCol}".`
            });
        }
    }

    return {
        summary,
        insights,
        chartSuggestions: chartSuggestions.slice(0, 4) // Max four charts
    };
};
