import React from 'react';

type ModelResponse = {
    header: { label: string }[];  // Adjusted to match the data structure
    data: {
        criteria: string;
        details: string;
        remarks: string;
    }[];
    verdict?: string; // Optional if you're not always expecting verdict in the response
};

function RiskAnalysisTable({ modelResponse }: { modelResponse: string }) {
    let responseObj: ModelResponse | null = null;

    try {
        responseObj = JSON.parse(modelResponse);
    } catch (error) {
        console.error("Error parsing modelResponse:", error);
        console.error("Problematic JSON string:", modelResponse);
        return <div>Error parsing the response data. Check the console for more details.</div>;
    }

    if (!responseObj) {
        return <div>Invalid response data.</div>;
    }
    
    const { header, data, verdict } = responseObj;

    return (
        <div className='m-5'>
        <h3 className='text-2xl mb-5'>Risk Analysis Report</h3>
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
                <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
                    <tr>
                        {header.map((headerItem, index) => (
                            <th key={index} className='py-3 px-6'>
                                {headerItem.label}
                            </th>  
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className='py-4 px-6'>{row.criteria}</td>
                            <td className='py-4 px-6'>{row.details}</td>
                            <td className='py-4 px-6'>{row.remarks}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {verdict && (
            <div className='mt-4'>
                <strong className='text-lg'>Verdict:</strong> <span className='text-lg'>{verdict}</span>
            </div>
        )}
    </div>
    
    );
}

export default RiskAnalysisTable;
