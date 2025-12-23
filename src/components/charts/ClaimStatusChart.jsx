import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const ClaimStatusChart = ({ claims }) => {
    const stats = useMemo(() => {
        const counts = { pending: 0, approved: 0, rejected: 0 };
        claims.forEach(c => {
            if (counts[c.status] !== undefined) counts[c.status]++;
        });
        return counts;
    }, [claims]);

    const data = {
        labels: ['Pending', 'Approved', 'Rejected'],
        datasets: [
            {
                label: '# of Claims',
                data: [stats.pending, stats.approved, stats.rejected],
                backgroundColor: [
                    'rgba(245, 158, 11, 0.6)', // Orange for Pending
                    'rgba(16, 185, 129, 0.6)', // Green for Approved
                    'rgba(239, 68, 68, 0.6)', // Red for Rejected
                ],
                borderColor: [
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(239, 68, 68, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    return <div style={{ maxHeight: '300px', display: 'flex', justifyContent: 'center' }}>
        <Doughnut data={data} />
    </div>;
};

export default ClaimStatusChart;
