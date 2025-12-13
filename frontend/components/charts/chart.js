import React from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const waterDepthData = [
  { average_depth: NaN, distance: 0 },
  { average_depth: 7.333333333333333, distance: 100 },
  { average_depth: 7.333333333333333, distance: 200 },
  { average_depth: 5.777647058823529, distance: 300 },
  { average_depth: 5.9128, distance: 400 },
  { average_depth: 6.263225806451612, distance: 500 },
  { average_depth: 6.101666666666666, distance: 600 },
  { average_depth: 5.804, distance: 700 },
  { average_depth: 5.4991111111111115, distance: 800 },
  { average_depth: 5.527391304347827, distance: 900 },
  { average_depth: 5.560188679245283, distance: 1000 }
];

const WaterDepthChart = () => {
  const data = {
    labels: waterDepthData.map(item => `${item.distance}m`),
    datasets: [
      {
        label: 'Average Water Depth (m)',
        data: waterDepthData.map(item => item.average_depth),
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
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
        text: 'Water Depth Analysis by Distance',
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
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Depth (meters)',
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
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div style={{ height: '400px' }}>
        <Line data={data} options={options} />
      </div>
    </div>
  );
};

export default WaterDepthChart;

