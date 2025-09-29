import React from 'react';

interface StatCardProps {
    title: string;
    value: string | number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => {
    return (
        <div className="content-card p-6 flex flex-col justify-between border-t-4" style={{ borderColor: 'var(--primary-accent)'}}>
            <h4 className="text-secondary text-sm font-medium uppercase tracking-wider">{title}</h4>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
};

export default StatCard;