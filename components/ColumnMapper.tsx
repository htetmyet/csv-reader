
import React from 'react';
import type { ColumnMapping } from '../types';

interface ColumnMapperProps {
    headers: string[];
    mapping: ColumnMapping;
    onMappingChange: (newMapping: ColumnMapping) => void;
}

const REQUIRED_FIELDS: { key: keyof ColumnMapping, label: string }[] = [
    { key: 'Date', label: 'Date' },
    { key: 'Team', label: 'Team' },
    { key: 'Opponent', label: 'Opponent' },
    { key: 'Prob_HomeWin', label: 'Home Win Probability' },
    { key: 'Prob_Draw', label: 'Draw Probability' },
    { key: 'Prob_AwayWin', label: 'Away Win Probability' },
];

const ColumnMapper: React.FC<ColumnMapperProps> = ({ headers, mapping, onMappingChange }) => {
    
    const handleSelectChange = (key: keyof ColumnMapping, value: string) => {
        const newMapping = { ...mapping, [key]: value === 'null' ? null : value };
        onMappingChange(newMapping);
    };

    return (
        <div className="content-card p-6">
            <h3 className="text-lg font-semibold text-primary mb-1">Column Mapping</h3>
            <p className="text-sm text-secondary mb-4">
                Match your CSV columns to the required fields for filtering. Fields for match prediction are required to enable the filters.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {REQUIRED_FIELDS.map(({ key, label }) => (
                    <div key={key}>
                        <label htmlFor={`map-${key}`} className="block text-sm font-medium text-secondary">
                            {label}
                        </label>
                        <select
                            id={`map-${key}`}
                            value={mapping[key] || 'null'}
                            onChange={(e) => handleSelectChange(key, e.target.value)}
                             className="themed-select mt-1 block w-full pl-3 pr-10 py-2 text-base sm:text-sm"
                        >
                            <option value="null">-- Not Mapped --</option>
                            {headers.map(header => (
                                <option key={header} value={header}>{header}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ColumnMapper;