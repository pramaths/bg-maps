import { NextRequest, NextResponse } from 'next/server';

type PolicyDetails = {
    'Annual Premium': string;
    'Building Coverage': string;
    'Content Coverage': string;
    'Natural Disasters': string;
    'Theft': string;
    'Deductible': string;
};

type SamplePolicies = Record<string, PolicyDetails>;

const openaiApiKey = process.env.OPENAI_API_KEY;
const modelName = "gpt-4.1";

const samplePolicies: SamplePolicies = {
    "Policy A": {
        "Annual Premium": "8,000 INR",
        "Building Coverage": "30 Lakhs",
        "Content Coverage": "5 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "15,000 INR"
    },
"Policy B": {
        "Annual Premium": "12,000 INR",
        "Building Coverage": "50 Lakhs",
        "Content Coverage": "10 Lakhs",
        "Natural Disasters": "Excluded",
        "Theft": "Included",
        "Deductible": "10,000 INR"
    },
    "Policy C": {
        "Annual Premium": "9,500 INR",
        "Building Coverage": "35 Lakhs",
        "Content Coverage": "7 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Excluded",
        "Deductible": "12,500 INR"
    },
    "Policy D": {
        "Annual Premium": "15,000 INR",
        "Building Coverage": "60 Lakhs",
        "Content Coverage": "15 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "8,000 INR"
    },
    "Policy E": {
        "Annual Premium": "10,500 INR",
        "Building Coverage": "40 Lakhs",
        "Content Coverage": "8 Lakhs",
        "Natural Disasters": "Excluded",
        "Theft": "Included",
        "Deductible": "9,000 INR"
    },
    "Policy F": {
        "Annual Premium": "18,000 INR",
        "Building Coverage": "70 Lakhs",
        "Content Coverage": "20 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "7,000 INR"
    },
    "Policy G": {
        "Annual Premium": "20,000 INR",
        "Building Coverage": "80 Lakhs",
        "Content Coverage": "25 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "6,000 INR"
    },
    "Policy H": {
        "Annual Premium": "22,000 INR",
        "Building Coverage": "90 Lakhs",
        "Content Coverage": "30 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Excluded",
        "Deductible": "5,500 INR"
    },
    "Policy I": {
        "Annual Premium": "25,000 INR",
        "Building Coverage": "1 Crore",
        "Content Coverage": "35 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "5,000 INR"
    },
    "Policy J": {
        "Annual Premium": "30,000 INR",
        "Building Coverage": "1.2 Crores",
        "Content Coverage": "40 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Included",
        "Deductible": "4,500 INR"
    },
    "Policy K": {
        "Annual Premium": "30,000 INR",
        "Building Coverage": "1.2 Crores",
        "Content Coverage": "25 Lakhs",
        "Natural Disasters": "Included",
        "Theft": "Excluded",
        "Deductible": "2,500 INR"
    }

};

function formatPolicyDataForPrompt(policies: SamplePolicies): string {
    let formattedPolicies = "Here are some sample insurance policies:\n\n";
    for (const [name, details] of Object.entries(policies)) {
        formattedPolicies += (
            `${name}: \n` +
            `  - Annual Premium: ${details['Annual Premium']}\n` +
            `  - Building Coverage: ${details['Building Coverage']}\n` +
            `  - Content Coverage: ${details['Content Coverage']}\n` +
            `  - Natural Disasters: ${details['Natural Disasters']}\n` +
            `  - Theft: ${details['Theft']}\n` +
            `  - Deductible: ${details['Deductible']}\n\n`
        );
    }
    return formattedPolicies;
}

async function getInsurancePolicyAdvice(locality: string, pricePerSqFt: number, numFloors: number, floorArea: number, houseValue: string, constructionYear: number): Promise<string> {
    const prompt = (
        `${formatPolicyDataForPrompt(samplePolicies)}` +
        `Given the details: locality '${locality}', price per sq ft '${pricePerSqFt}', number of floors '${numFloors}', ` +
        `floor area '${floorArea}', house value '${houseValue}', construction year '${constructionYear}', ` +
        `which two insurance policies would be most suitable? Please analyze the above policies and recommend two options. ` +
        `Present the recommendations in a tabular format, considering the coverage and cost-effectiveness. Keep it packed with numerical data and assume data wherever needed.`
    );

    const response = await fetch("https://api.openai.com/v1/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
            model: modelName,
            prompt: prompt,
            max_tokens: 800
        })
    });

    if (!response.ok) {
        throw new Error(`Error in OpenAI API call: ${response.statusText}`);
    }

    const data = await response.json();

    return data.choices[0].text.trim();
}

export async function GET(req: NextRequest, res: NextResponse) {
    try {
        const policyKeys = Object.keys(samplePolicies);
        const randomPolicyKey = policyKeys[Math.floor(Math.random() * policyKeys.length)];
        const selectedPolicy = samplePolicies[randomPolicyKey];
        const modifiedPolicy = {
            ...selectedPolicy,
            'Annual Premium': modifyAnnualPremium(selectedPolicy['Annual Premium'])
        };
        return new NextResponse(JSON.stringify({ policy: randomPolicyKey, details: modifiedPolicy }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    } catch (error) {
        console.error('Failed to process insurance policy:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to process insurance policy' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            }
        });
    }
}


function modifyAnnualPremium(premium: string): string {
    const premiumNumber = parseInt(premium.replace(/[^0-9]/g, ''));
    const randomFactor = 1 + (Math.random() * 0.1 - 0.05); // modify by up to +/- 5%
    const modifiedPremium = premiumNumber * randomFactor;
    return `${modifiedPremium.toFixed(0)} INR`; // Convert back to string with 'INR'
}
