// Chart Component
import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function ChartComponent({ type = 'pie', data = [], labels, value }) {
  if (!data || data.length === 0) {
    return <p style={{ color: '#7f8c8d' }}>No data available</p>;
  }

  const chartLabels = data.map(labels);
  const chartValues = data.map(value);
  
  const colors = [
    '#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6',
    '#1abc9c', '#34495e', '#c0392b', '#2980b9', '#16a085'
  ];

  const chartData = {
    labels: chartLabels,
    datasets: [{
      label: 'Amount',
      data: chartValues,
      backgroundColor: colors.slice(0, chartLabels.length),
      borderColor: '#fff',
      borderWidth: 2
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: type === 'pie' ? 'bottom' : 'top',
      }
    }
  };

  return type === 'pie' ? 
    <Pie data={chartData} options={options} /> : 
    <Bar data={chartData} options={options} />;
}
