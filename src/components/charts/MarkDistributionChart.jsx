import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MarkDistributionChart = ({ marks }) => {
    // Calculate averages
    const averages = useMemo(() => {
        if (!marks.length) return { cat: 0, fat: 0, assignment: 0 };

        const sum = marks.reduce((acc, curr) => ({
            cat: acc.cat + (curr.cat || 0),
            fat: acc.fat + (curr.fat || 0),
            assignment: acc.assignment + (curr.assignment || 0)
        }), { cat: 0, fat: 0, assignment: 0 });

        return {
            cat: sum.cat / marks.length,
            fat: sum.fat / marks.length,
            assignment: sum.assignment / marks.length
        };
    }, [marks]);

    const data = {
        labels: ['CAT', 'FAT', 'Assignment'],
        datasets: [
            {
                label: 'Average Score',
                data: [averages.cat, averages.fat, averages.assignment],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.6)',
                    'rgba(16, 185, 129, 0.6)',
                    'rgba(245, 158, 11, 0.6)'
                ],
                borderColor: [
                    'rgb(59, 130, 246)',
                    'rgb(16, 185, 129)',
                    'rgb(245, 158, 11)'
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Average Class Performance' },
        },
        scales: {
            y: { beginAtZero: true, max: 100 }
        }
    };

    return <Bar options={options} data={data} />;
};

export default MarkDistributionChart;
