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
    labels: crimeData.CrimeRate.map(item => `${item.distance} meters`),
    datasets: [
      {
        label: 'Average Crime Rate',
        data: crimeData.CrimeRate.map(item => item.average_crime_rate),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average Crime Rate',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Distance from Point of Interest',
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
  };

  return <Bar data={data} options={options} />;
};

export default CrimeRateBarChart;
