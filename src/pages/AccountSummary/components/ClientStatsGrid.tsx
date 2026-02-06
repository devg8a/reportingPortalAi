import React from 'react';
import { Box } from '@mui/material';
import StatCard from './StatCard';

interface ClientStatsGridProps {
    networkData: any;
    isComparisonActive: boolean;
    activeTab: string;
    row: any;
}

const ClientStatsGrid: React.FC<ClientStatsGridProps> = ({
    networkData,
    isComparisonActive,
    activeTab,
    row,
}) => {
    // Normalizer helper
    const normalize = (str: string) => (str || "").toLowerCase().trim();

    return (
        <Box
            sx={{
                display: "flex",
                width: "100%",
                justifyContent: "space-between",
                gap: 2,
                alignItems: "stretch",
                padding: "0px 10px"
            }}
        >
            {/* Revenue */}
            <StatCard
                title="Revenue"
                value={networkData?.revenue || 0}
                previous={isComparisonActive ? (networkData?.previous_revenue ?? null) : null}
                isInverse={false}
                comparisonActive={isComparisonActive}
            />

            {/* Spend */}
            <StatCard
                title="Spend"
                value={networkData?.spend || 0}
                previous={isComparisonActive ? (networkData?.previous_spend ?? null) : null}
                isInverse={true}
                comparisonActive={isComparisonActive}
            />


            {/* CPC */}
            <StatCard
                title="CPC"
                value={networkData?.cpc || 0}
                previous={isComparisonActive ? (networkData?.previous_cpc ?? null) : null}
                isInverse={true}
                comparisonActive={isComparisonActive}
            />
            {/* ROAS */}
            <StatCard
                title="ROAS"
                value={networkData?.roas || 0}
                previous={isComparisonActive ? (networkData?.previous_roas ?? null) : null}
                isInverse={false}
                comparisonActive={isComparisonActive}
            />


            {/* 🔴 NEW: ROAS CT & VT (Only for Meta) */}
            {(normalize(activeTab) === 'meta' || normalize(networkData?.network) === 'meta') && (
                <>
                    <StatCard
                        title="ROAS CT"
                        value={networkData?.roas_ct || 0}
                        previous={isComparisonActive ? (networkData?.previous_roas_ct ?? null) : null}
                        isInverse={false}
                        comparisonActive={isComparisonActive}
                        formatType="roas"
                    />
                    <StatCard
                        title="ROAS VT"
                        value={networkData?.roas_vt || 0}
                        previous={isComparisonActive ? (networkData?.previous_roas_vt ?? null) : null}
                        isInverse={false}
                        comparisonActive={isComparisonActive}
                        formatType="roas"
                    />
                    <StatCard
                        title="Outbound Clicks"
                        value={networkData?.outbound_clicks || 0}
                        previous={isComparisonActive ? (networkData?.previous_outbound_clicks ?? null) : null}
                        isInverse={false} // Assuming more clicks are generally better
                        comparisonActive={isComparisonActive}
                        formatType="number"
                    />
                </>
            )}

            {/* 🔵 NEW: Clicks (Only for Adword) */}
            {(normalize(activeTab) === 'adword' || normalize(networkData?.network) === 'adword') && (
                <StatCard
                    title="Clicks"
                    value={networkData?.clicks || 0}
                    previous={isComparisonActive ? (networkData?.previous_clicks ?? null) : null}
                    isInverse={false}
                    comparisonActive={isComparisonActive}
                />
            )}

            {/* Sessions - Only show for All Channels AND if Shopify is connected */}
            {(normalize(activeTab) === "all channels" &&
                row.networks?.some((n: any) => normalize(n.network) === 'shopify')) && (
                    <StatCard
                        title="Sessions"
                        value={networkData?.sessions || 0}
                        previous={isComparisonActive ? (networkData?.previous_sessions ?? null) : null}
                        isInverse={false}
                        comparisonActive={isComparisonActive}
                    />
                )}
        </Box>
    );
};

export default ClientStatsGrid;
