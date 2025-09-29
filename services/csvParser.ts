
import type { ParsedCSV } from '../types';

export const parseCSV = (file: File): Promise<ParsedCSV> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event: ProgressEvent<FileReader>) => {
            try {
                const text = event.target?.result as string;
                if (!text) {
                    throw new Error("File is empty.");
                }

                const lines = text.trim().split(/\r\n|\n/);
                if (lines.length < 2) {
                    throw new Error("CSV must have a header and at least one row of data.");
                }

                const headers = lines[0].split(',').map(h => h.trim());
                const data = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const row: Record<string, any> = {};
                    headers.forEach((header, index) => {
                        const value = values[index]?.trim() || '';
                        // Attempt to convert to number if possible
                        if (!isNaN(Number(value)) && value !== '') {
                            row[header] = Number(value);
                        } else {
                            row[header] = value;
                        }
                    });
                    return row;
                });

                resolve({ fileName: file.name, headers, data });
            } catch (error) {
                reject(new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : String(error)}`));
            }
        };

        reader.onerror = () => {
            reject(new Error(`Error reading file: ${file.name}`));
        };

        reader.readAsText(file);
    });
};
