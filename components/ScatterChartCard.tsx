import React, { useMemo, useState, useEffect } from 'react';
import type { ChartSuggestion } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type ScatterChartSuggestion = Extract<ChartSuggestion, { type: 'scatter' }>;

interface ScatterChartCardProps {
    data: Record<string, any>[];
    suggestion: ScatterChartSuggestion;
}

const ScatterChartCard: React.FC<ScatterChartCardProps> = ({ data, suggestion }) => {
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
                x: row[suggestion.x_column],
                y: row[suggestion.y_column]
            }))
            .filter(d => typeof d.x === 'number' && typeof d.y === 'number');
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
                    <ScatterChart margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis 
                            type="number" 
                            dataKey="x" 
                            name={suggestion.x_column} 
                            stroke={themeColors.tertiaryText} 
                            tick={{ fontSize: 12, fill: themeColors.secondaryText }} 
                            domain={['auto', 'auto']}
                        />
                        <YAxis 
                            type="number" 
                            dataKey="y" 
                            name={suggestion.y_column} 
                            stroke={themeColors.tertiaryText} 
                            tick={{ fill: themeColors.secondaryText }} 
                            domain={['auto', 'auto']}
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend wrapperStyle={{color: themeColors.text}}/>
                        <Scatter name="Data points" data={chartData} fill={themeColors.primaryAccent} opacity={0.7} />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ScatterChartCard;
