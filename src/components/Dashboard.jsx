import React from 'react';
import OverviewStats from './OverviewStats';
import RecentTrades from './RecentTrades';
import AnalyticsCharts from './AnalyticsCharts';
import AccountsList from './AccountsList';

export default function Dashboard() {
    return (
        <div className="space-y-10">
            <OverviewStats />
            <AccountsList />
            <RecentTrades />
            <AnalyticsCharts />
        </div>
    );
}
