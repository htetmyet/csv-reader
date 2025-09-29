import React from 'react';

interface LoaderProps {
    message: string;
}

const Loader: React.FC<LoaderProps> = ({ message }) => {
    return (
        <div className="loader-overlay fixed inset-0 flex flex-col items-center justify-center z-50">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
            <p className="text-lg mt-4">{message}</p>
        </div>
    );
};

export default Loader;