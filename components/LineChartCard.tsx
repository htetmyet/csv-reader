import React, { useMemo, useState, useEffect } from 'react';
import type { ChartSuggestion } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type LineChartSuggestion = Extract<ChartSuggestion, { type: 'line' }>;

interface LineChartCardProps {
    data: Record<string, any>[];
    suggestion: LineChartSuggestion;
}

const LineChartCard: React.FC<LineChartCardProps> = ({ data, suggestion }) => {
    const [themeColors, setThemeColors] = useState({
        text: '#1e293b',
        secondaryText: '#64748b',
        tertiaryText: '#94a3b8',
        grid: '#e2e8f0',
        primaryAccent: '#14b8a6',
    });

    useEffect(() => {
        const updateColors = () => {
            const styles = getComputedStyle(document.documentElement);
            setThemeColors({
                text: styles.getPropertyValue('--text-primary').trim(),
                secondaryText: styles.getPropertyValue('--text-secondary').trim(),
                tertiaryText: styles.getPropertyValue('--text-tertiary').trim(),
                grid: styles.getPropertyValue('--border-interactive').trim(),
                primaryAccent: styles.getPropertyValue('--primary-accent').trim(),
            });
        };

        updateColors();

        const observer = new MutationObserver(updateColors);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

        return () => observer.disconnect();
    }, []);

    const chartData = useMemo(() => {
        if (!data || !suggestion.x_column || !suggestion.y_column) return [];
        return data
            .map(row => ({
                x: new Date(row[suggestion.x_column]).getTime(),
                y: row[suggestion.y_column]
            }))
            .filter(d => !isNaN(d.x) && typeof d.y === 'number')
            .sort((a, b) => a.x - b.x);
    }, [data, suggestion.x_column, suggestion.y_column]);
    
    if (!suggestion.x_column || !suggestion.y_column || !data[0] || data[0][suggestion.x_column] === undefined || data[0][suggestion.y_column] === undefined) {
        return (
             <div className="content-card p-6">
                <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                <p className="text-secondary text-sm mt-1">{suggestion.description}</p>
                <div className="flex items-center justify-center h-64 text-red-500">
                    Warning: Columns "{suggestion.x_column}" or "{suggestion.y_column}" not found in dataset.
                </div>
            </div>
        )
    }

    return (
        <div className="content-card p-6">
            <h3 className="text-lg font-semibold">{suggestion.title}</h3>
            <p className="text-secondary text-sm mt-1 mb-4">{suggestion.description}</p>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis 
                            dataKey="x" 
                            stroke={themeColors.tertiaryText} 
                            tick={{ fontSize: 12, fill: themeColors.secondaryText }}
                            domain={['dataMin', 'dataMax']}
                            type="number"
                            tickFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                        />
                        <YAxis stroke={themeColors.tertiaryText} tick={{ fill: themeColors.secondaryText }} />
                        <Tooltip 
                            cursor={{ strokeDasharray: '3 3', stroke: 'var(--border-interactive)' }}
                            labelFormatter={(unixTime) => new Date(unixTime).toLocaleDateString()}
                            formatter={(value) => [value, suggestion.y_column]}
                        />
                        <Legend wrapperStyle={{color: themeColors.text}}/>
                        <Line type="monotone" dataKey="y" name={suggestion.y_column} stroke={themeColors.primaryAccent} strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default LineChartCard;
