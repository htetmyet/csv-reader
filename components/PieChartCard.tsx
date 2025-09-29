import React, { useMemo, useState, useEffect } from 'react';
import type { ChartSuggestion } from '../types';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PieChartCardProps {
    data: Record<string, any>[];
    suggestion: ChartSuggestion;
}

const COLORS = ['#14b8a6', '#0ea5e9', '#f59e0b', '#64748b', '#38bdf8', '#22d3ee', '#818cf8'];

const PieChartCard: React.FC<PieChartCardProps> = ({ data, suggestion }) => {
    const [textColor, setTextColor] = useState('#1e293b');

    useEffect(() => {
        const updateColors = () => {
            const styles = getComputedStyle(document.documentElement);
            setTextColor(styles.getPropertyValue('--text-primary').trim());
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
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
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
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
                            stroke="var(--bg-card)"
                        >
                            {chartData.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{color: textColor}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PieChartCard;