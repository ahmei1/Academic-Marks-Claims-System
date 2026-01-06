import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const CourseDurationChart = ({ courses }) => {
    const chartData = useMemo(() => {
        // Filter out courses without valid dates
        const validCourses = courses.filter(c => c.startDate && c.endDate);

        return {
            labels: validCourses.map(c => c.code),
            datasets: [
                {
                    label: 'Course Duration',
                    data: validCourses.map(c => {
                        const start = new Date(c.startDate).getTime();
                        const end = new Date(c.endDate).getTime();
                        return [start, end];
                    }),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)', // Blue-500
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                    barPercentage: 0.5,
                }
            ]
        };
    }, [courses]);

    const options = {
        indexAxis: 'y',
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                display: false, // Hide legend since it's just one dataset usually
            },
            title: {
                display: true,
                text: 'Course Schedules',
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const raw = context.raw; // [start, end]
                        if (Array.isArray(raw)) {
                            const start = new Date(raw[0]).toLocaleDateString();
                            const end = new Date(raw[1]).toLocaleDateString();
                            return `${context.chart.data.labels[context.dataIndex]}: ${start} - ${end}`;
                        }
                        return '';
                    }
                }
            }
        },
        scales: {
            x: {
                min: (() => {
                    // determine min based on data or default to start of current year
                    if (courses.length === 0) return new Date(new Date().getFullYear(), 0, 1).getTime();
                    const times = courses.filter(c => c.startDate).map(c => new Date(c.startDate).getTime());
                    return Math.min(...times) - 86400000 * 7; // buffer
                })(),
                type: 'linear',
                position: 'bottom',
                ticks: {
                    callback: (value) => {
                        return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
                    }
                }
            }
        }
    };

    if (courses.length === 0) {
        return <div className="text-center p-4 text-slate-500">No course data available for chart.</div>;
    }

    return (
        <div className="w-full h-[300px] bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <Bar data={chartData} options={options} />
        </div>
    );
};

export default CourseDurationChart;
