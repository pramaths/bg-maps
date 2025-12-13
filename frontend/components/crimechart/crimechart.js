import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const CrimeRateBarChart = () => {
  const crimeData = {
    CrimeRate: [
      { average_crime_rate: 0, distance: 0 },
      { average_crime_rate: 0, distance: 100 },
      { average_crime_rate: 3, distance: 200 },
      { average_crime_rate: 6, distance: 300 },
      { average_crime_rate: 16, distance: 400 },
      { average_crime_rate: 22, distance: 500 },
      { average_crime_rate: 25, distance: 600 },
      { average_crime_rate: 35, distance: 700 },
      { average_crime_rate: 57, distance: 800 },
      { average_crime_rate: 501, distance: 900 },
      { average_crime_rate: 525, distance: 1000 },
    ]
  };

  const data = {
    labels: crimeData.CrimeRate.map(item => `${item.distance}m`),
    datasets: [
      {
        label: 'Average Crime Rate',
        data: crimeData.CrimeRate.map(item => item.average_crime_rate),
        backgroundColor: 'rgba(239, 68, 68, 0.7)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        borderRadius: 4,
        hoverBackgroundColor: 'rgba(239, 68, 68, 0.9)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: '#1f2937',
          font: {
            size: 12,
            weight: 'bold'
          }
        }
      },
      title: {
        display: true,
        text: 'Crime Rate Analysis by Distance',
        color: '#1f2937',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Crime Rate',
          color: '#1f2937',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#4b5563'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Distance from Center',
          color: '#1f2937',
          font: {
            size: 12,
            weight: 'bold'
          }
        },
        ticks: {
          color: '#4b5563'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div style={{ height: '400px' }}>
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default CrimeRateBarChart;

