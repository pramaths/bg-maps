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
    labels: waterDepthData.map(item => item.distance),
    datasets: [
      {
        label: 'Average Depth (m)',
        data: waterDepthData.map(item => item.average_depth),
        fill: false,
        backgroundColor: 'rgb(75, 192, 192)',
        borderColor: 'rgba(75, 192, 192, 0.2)',
      },
    ],
  };

  const options = {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return <Line data={data} options={options} />;
};

export default WaterDepthChart;
