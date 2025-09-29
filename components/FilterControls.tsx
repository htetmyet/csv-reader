import React from 'react';

interface FilterControlsProps {
    sureWinThreshold: number;
    onSureWinChange: (value: number) => void;
    drawThreshold: number;
    onDrawChange: (value: number) => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
    sureWinThreshold,
    onSureWinChange,
    drawThreshold,
    onDrawChange
}) => {
    return (
        <div className="content-card p-6 space-y-6">
            <h3 className="text-lg font-semibold text-primary">Match Outcome Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Sure Win Threshold */}
                <div>
                    <label htmlFor="sure-win-threshold" className="block text-sm font-medium text-secondary">
                        Sure Win Threshold: <span className="font-bold text-accent">{Math.round(sureWinThreshold * 100)}%</span>
                    </label>
                    <p className="text-xs text-tertiary mb-2">Filters for matches where Home or Away win probability is above this value.</p>
                    <input
                        id="sure-win-threshold"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={sureWinThreshold}
                        onChange={(e) => onSureWinChange(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-slider"
                        aria-label="Sure Win Threshold"
                    />
                </div>
                {/* Draw Threshold */}
                <div>
                     <label htmlFor="draw-threshold" className="block text-sm font-medium text-secondary">
                        Draw Threshold: <span className="font-bold text-accent">{Math.round(drawThreshold * 100)}%</span>
                    </label>
                    <p className="text-xs text-tertiary mb-2">Filters for matches where Draw probability is above this value.</p>
                     <input
                        id="draw-threshold"
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={drawThreshold}
                        onChange={(e) => onDrawChange(parseFloat(e.target.value))}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer custom-slider"
                        aria-label="Draw Threshold"
                    />
                </div>
            </div>
        </div>
    );
};

export default FilterControls;