import React from 'react';

function RiskAnalysisTable({ analysisData }: { analysisData: any }) {
    const getRiskDetails = (riskType: string) => {
        const risk = analysisData?.[riskType.toLowerCase().replace(' ', '_')];
        const defaultValues = {
            'flood_risk': {
                level: 'Moderate',
                score: 65,
                description: 'Area has moderate flood risk based on historical data'
            },
            'air_quality': {
                level: 'Good',
                score: 75,
                description: 'Generally good air quality with occasional moderate pollution'
            },
            'crime_rate': {
                level: 'Moderate',
                score: 55,
                description: 'Average crime rates compared to surrounding areas'
            },
            'fire_safety': {
                level: 'High',
                score: 80,
                description: 'Good fire station coverage and response times'
            }
        };

        if (!risk) {
            const defaultRisk = defaultValues[riskType.toLowerCase().replace(' ', '_')];
            return {
                details: `${defaultRisk.level} (${defaultRisk.score}/100)`,
                remarks: defaultRisk.description
            };
        }

        return {
            details: `${risk.level} (${risk.score}/100)`,
            remarks: risk.description
        };
    };

    const getCrimeRisk = () => {
        const defaultDetails = {
            details: 'Moderate (55/100)',
            remarks: 'Average crime activity in the area'
        };

        if (!analysisData?.crime_risk && !analysisData?.crime) {
            return defaultDetails;
        }

        return {
            details: analysisData.crime_risk?.toUpperCase() || defaultDetails.details,
            remarks: analysisData.crime?.length >= 25 ? 
                'High crime activity detected in the area' : 
                'Moderate to low crime activity in the area'
        };
    };

    const getWaterDepthRisk = () => {
        const defaultDetails = {
            details: 'Moderate (8m)',
            remarks: 'Average water depth levels'
        };

        if (!analysisData?.waterdepth_risk && analysisData?.waterdepth === undefined) {
            return defaultDetails;
        }

        return {
            details: analysisData.waterdepth_risk?.toUpperCase() || defaultDetails.details,
            remarks: analysisData.waterdepth >= 6 ? 
                'Area prone to flooding due to high water depth' : 
                'Normal water depth levels'
        };
    };

    // Helper function for water quality PH with default values
    const getWaterQualityPH = () => {
        const defaultDetails = {
            details: 'Good (7.6)',
            remarks: 'Normal pH levels indicating good water quality'
        };

        if (!analysisData?.waterquality?.[0]?.data?.pH) {
            return defaultDetails;
        }

        const pH = analysisData.waterquality[0].data.pH;
        return {
            details: `${pH >= 7 ? 'Alkaline' : 'Acidic'} (${pH})`,
            remarks: pH >= 6.5 && pH <= 8.5 ? 
                'pH levels within safe range' : 
                'pH levels outside recommended range'
        };
    };
    
    const getWaterQualityDissolvedOxygen = () => {
        const defaultDetails = {
            details: 'Good (8mg/l)',
            remarks: 'Healthy oxygen levels for aquatic life'
        };

        if (!analysisData?.waterquality?.[0]?.data?.dissolved_oxygen) {
            return defaultDetails;
        }

        const do_level = analysisData.waterquality[0].data.dissolved_oxygen;
        return {
            details: `${do_level}mg/l`,
            remarks: do_level >= 5 ? 
                'Sufficient oxygen level for aquatic life' : 
                'Low oxygen level, may affect aquatic life'
        };
    };
    
    const getWaterQualityTotalColiform = () => {
        const defaultDetails = {
            details: 'Moderate (2400)',
            remarks: 'Standard bacterial levels detected'
        };

        if (!analysisData?.waterquality?.[0]?.data?.total_coliform) {
            return defaultDetails;
        }

        const coliform = analysisData.waterquality[0].data.total_coliform;
        return {
            details: `${coliform}`,
            remarks: coliform > 1000 ? 
                'High bacterial contamination detected' : 
                'Safe bacterial levels'
        };
    };
    
    // Helper function for verdict with default value
    const getVerdict = () => {
        const defaultVerdict = 'Overall Risk Assessment: MODERATE - Exercise normal precautions';

        if (!analysisData) {
            return defaultVerdict;
        }

        const hasCrimeRisk = analysisData?.crime?.length >= 25;
        const hasWaterDepthRisk = analysisData?.waterdepth >= 6;
        
        return `Overall Risk Assessment: ${
            (hasCrimeRisk || hasWaterDepthRisk) ? 
            'HIGH - Exercise Caution' : 
            'LOW - Generally Safe Area'
        }`;
    };

    // Define the risk analysis data structure
    const riskData = {
        header: [
            { label: 'Risk Type' },
            { label: 'Risk Level' },
            { label: 'Description' }
        ],
        data: [
            {
                criteria: 'Flood Risk',
                ...getRiskDetails('flood_risk')
            },
            {
                criteria: 'Air Quality',
                ...getRiskDetails('air_quality')
            },
            {
                criteria: 'Crime Rate',
                ...getRiskDetails('crime_rate')
            },
            {
                criteria: 'Fire Safety',
                ...getRiskDetails('fire_safety')
            },
            {
                criteria: 'Crime Risk',
                ...getCrimeRisk()
            },
            {
                criteria: 'Water Depth Risk',
                ...getWaterDepthRisk()
            },
            {
                criteria: 'Water Quality (pH)',
                ...getWaterQualityPH()
            },
            {
                criteria: 'Water Quality (Total Coliform)',
                ...getWaterQualityTotalColiform()
            },
            {
                criteria: 'Water Quality (Dissolved Oxygen)',
                ...getWaterQualityDissolvedOxygen()
            }
        ],
        verdict: getVerdict()
    };

    return (
        <div className='m-5'>
        <h3 className='text-2xl mb-5'>Risk Analysis Report</h3>
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className='w-full text-sm text-left text-gray-500 dark:text-gray-400'>
                <thead className='text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400'>
                    <tr>
                        {riskData.header.map((headerItem, index) => (
                            <th key={index} className='py-3 px-6'>
                                {headerItem.label}
                            </th>  
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {riskData.data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700">
                            <td className='py-4 px-6'>{row.criteria}</td>
                            <td className='py-4 px-6'>{row.details}</td>
                            <td className='py-4 px-6'>{row.remarks}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {riskData.verdict && (
            <div className='mt-4'>
                <strong className='text-lg'>Verdict:</strong> <span className='text-lg'>{riskData.verdict}</span>
            </div>
        )}
    </div>
    
    );
}

export default RiskAnalysisTable;
