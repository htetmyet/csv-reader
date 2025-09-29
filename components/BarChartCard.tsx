import React, { useMemo, useState, useEffect } from 'react';
import type { ChartSuggestion } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartCardProps {
    data: Record<string, any>[];
    suggestion: ChartSuggestion;
}

const BarChartCard: React.FC<BarChartCardProps> = ({ data, suggestion }) => {
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
        if (!data || !suggestion.column) return [];
        const counts: Record<string, number> = {};
        data.forEach(row => {
            const key = row[suggestion.column];
            if (key) {
                counts[key] = (counts[key] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 15); // Show top 15 categories for clarity
    }, [data, suggestion.column]);

    if (!suggestion.column || !data[0] || data[0][suggestion.column] === undefined) {
        return (
             <div className="content-card p-6">
                <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                <p className="text-secondary text-sm mt-1">{suggestion.description}</p>
                <div className="flex items-center justify-center h-64 text-red-500">
                    Warning: Column "{suggestion.column}" not found in dataset.
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
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={themeColors.primaryAccent} stopOpacity={0.9}/>
                                <stop offset="95%" stopColor={themeColors.primaryAccent} stopOpacity={0.7}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={themeColors.grid} />
                        <XAxis dataKey="name" stroke={themeColors.tertiaryText} tick={{ fontSize: 12, fill: themeColors.secondaryText }} />
                        <YAxis stroke={themeColors.tertiaryText} tick={{ fill: themeColors.secondaryText }} />
                        <Tooltip cursor={{ fill: 'var(--primary-accent)', fillOpacity: 0.1 }} />
                        <Legend wrapperStyle={{color: themeColors.text}}/>
                        <Bar dataKey="count" fill="url(#colorUv)" name="Count" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default BarChartCard;