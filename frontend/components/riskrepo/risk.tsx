import React, { useState, useEffect, useCallback } from 'react';

const RiskAnalysisTable = ({ analysisData, onVerdictReceived }) => {
  const [audioData, setAudioData] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    try {
      const response = await fetch('http://127.0.0.1:5000/verdict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: analysisData })
      });

      const data = await response.json();

      if (data.status === 'success') {
        onVerdictReceived(data.data);
        setAudioData(data.audio);

        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.addEventListener('ended', () => {
            audio.currentTime = 0;
            audio.pause();
          });
          audio.play();
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [analysisData, onVerdictReceived]);

  useEffect(() => {
    if (analysisData && Object.keys(analysisData).length > 0) {
      handleSubmit();
    }
  }, [analysisData, handleSubmit]);

  return (
    <div className="text-white">
      {audioData && (
        <div className="mt-4">
          <audio controls>
            <source src={`data:audio/mp3;base64,${audioData}`} type="audio/mp3" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

const Risko = ({ analysisData }) => {
  const [verdict, setVerdict] = useState<string>('');

  const handleVerdictReceived = useCallback((apiVerdict: string) => {
    setVerdict(apiVerdict);
  }, []);

  const generateVerdict = useCallback(() => {
    if (!analysisData) return '';

    let overallRisk = 0;
    let riskFactors: string[] = [];

    // Calculate overall risk and collect risk factors
    if (analysisData.flood_risk) {
      overallRisk += analysisData.flood_risk.score;
      if (analysisData.flood_risk.score > 60) {
        riskFactors.push("Flood risk is high");
      }
    }

    if (analysisData.air_quality) {
      overallRisk += analysisData.air_quality.score;
      if (analysisData.air_quality.score < 40) {
        riskFactors.push(analysisData.air_quality.description);
      }
    }

    if (analysisData.crime_rate) {
      overallRisk += analysisData.crime_rate.score;
      if (analysisData.crime_rate.score > 60) {
        riskFactors.push(analysisData.crime_rate.description);
      }
    }

    if (analysisData.fire_safety) {
      overallRisk += analysisData.fire_safety.score;
      if (analysisData.fire_safety.score < 40) {
        riskFactors.push(analysisData.fire_safety.description);
      }
    }

    const avgRisk = overallRisk / 4;
    let riskLevel = avgRisk > 70 ? "High" : avgRisk > 40 ? "Moderate" : "Low";

    const verdictText = `Based on our analysis, this location has a ${riskLevel} overall risk level. 
            ${riskFactors.length > 0 ? 'Key concerns include: ' + riskFactors.join('. ') : 'No major risk factors identified.'}`;

    return verdictText;
  }, [analysisData]);

  useEffect(() => {
    if (analysisData && Object.keys(analysisData).length > 0) {
      const verdictText = generateVerdict();
      setVerdict(verdictText);
    }
  }, [analysisData, generateVerdict]);

  return (
    <div className="mt-4 text-white">
      <RiskAnalysisTable
        analysisData={analysisData}
        onVerdictReceived={handleVerdictReceived}
      />
    </div>
  );
};

export default Risko;