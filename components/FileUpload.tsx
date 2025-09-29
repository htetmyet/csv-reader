import React, { useState, useCallback } from 'react';

interface FileUploadProps {
    onFilesSelected: (files: FileList) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            onFilesSelected(files);
        }
    }, [onFilesSelected]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFilesSelected(files);
        }
    };
    
    const dragDropClasses = isDragging ? 'dragging' : '';

    return (
        <div className="flex items-center justify-center h-full max-w-2xl mx-auto pt-16">
            <div className="text-center p-8">
                <div className="flex justify-center items-center mb-8">
                     <div className="uploader-icon-wrapper flex items-center justify-center h-24 w-24 rounded-full">
                        <svg className="h-12 w-12"  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                        </svg>
                    </div>
                </div>

                <h2 className="text-4xl font-extrabold mb-4">Upload Your Predictions</h2>
                <p className="text-secondary mb-8">
                    Drop your CSV files here to instantly generate your personalized analytics dashboard.
                </p>
                <label
                    htmlFor="file-upload"
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    className={`file-dropzone relative block w-full rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer ${dragDropClasses}`}
                >
                    <span className="mt-2 block text-sm font-medium text-secondary">
                        {isDragging ? 'Release to upload' : 'Drag & drop files or click here'}
                    </span>
                    <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        multiple
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                </label>
            </div>
        </div>
    );
};

export default FileUpload;