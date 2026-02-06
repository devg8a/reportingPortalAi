import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { accountSummaryService } from '../../services/accountSummary.service';
import { useSelector } from 'react-redux';
import { selectToken } from '../../redux/authSlice';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    CircularProgress
} from '@mui/material';
import SelectInput from '../../common_components/SelectInput';
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'; // Meta
import GoogleIcon from '@mui/icons-material/Google'; // Placeholder for Google
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'; // Shopify

// Helper to format currency
const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val);
};

// Helper to format percentage
const formatPercent = (val: number) => {
    return `${val.toFixed(2)}%`;
};

// Define types based on the API response structure observed
interface Metric {
    revenue: number;
    revenue_share: number;
    spend: number;
    spend_share: number;
    roas: number;
}

interface ChannelMetrics {
    meta: Metric;
    adword: Metric;
    shopify: Metric;
}

interface TimeRanges {
    yesterday: ChannelMetrics;
    '7d': ChannelMetrics;
    '30d': ChannelMetrics;
}

interface TeamRow {
    league: string;
    team: string; // or "League Total"
    is_total?: boolean;
    ranges: TimeRanges;
}

interface ApiResponse {
    data: {
        [x: string]: any;
        league_filter: string;
        rows: TeamRow[];
        ranges: {
            yesterday: { label: string; start_date: string; end_date: string };
            '7d': { label: string; start_date: string; end_date: string };
            '30d': { label: string; start_date: string; end_date: string };
        };
    };
}

const PLATFORMS = [
    { key: 'meta', label: 'Meta', icon: <AllInclusiveIcon sx={{ color: '#1877F2', fontSize: 18 }} /> },
    { key: 'adword', label: 'Google', icon: <GoogleIcon sx={{ color: '#EA4335', fontSize: 18 }} /> }, // Use a proper Google Icon if available or colored generic
    { key: 'shopify', label: 'Shopify', icon: <ShoppingBagIcon sx={{ color: '#95BF47', fontSize: 18 }} /> },
] as const;

const ProTeamLeaguePerformance: React.FC = () => {
    const [searchParams] = useSearchParams();
    const token = useSelector(selectToken);
    const clientId = searchParams.get('clientId') || '';

    const [data, setData] = useState<ApiResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedLeague, setSelectedLeague] = useState<string>('All');

    const [entities, setEntities] = useState<any[]>([]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const leagueParam = selectedLeague === 'All' ? undefined : selectedLeague;

            const [reportRes, entitiesRes] = await Promise.all([
                accountSummaryService.getTeamPerformanceReport(clientId, { league: leagueParam }, token),
                accountSummaryService.getPerformanceEntities({ type: 'group', client_id: clientId }, token)
            ]);

            console.log("API Response:", reportRes);
            if (reportRes && reportRes.data) {
                console.log("Setting Data:", reportRes.data);
                setData(reportRes.data);
            } else {
                console.error("Invalid response format:", reportRes);
            }

            if (entitiesRes && entitiesRes.data) {
                setEntities(entitiesRes.data);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clientId, token, selectedLeague]);

    // Extract unique leagues from fetch entities
    const leagueOptions = useMemo(() => {
        const opts = entities.map(e => ({ label: e.group_name, value: e.group_name }));
        return [{ label: 'All', value: 'All' }, ...opts.sort((a, b) => a.label.localeCompare(b.label))];
    }, [entities]);

    // Header row heights for sticky positioning
    const HEADER_ROW_1_HEIGHT = 50; // First header row (date ranges)
    const HEADER_ROW_2_HEIGHT = 40; // Second header row (metrics)

    // Common Header Cell Style
    const rangeHeaderStyle = (bgColor: string) => ({
        bgcolor: bgColor,
        color: 'white',
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        fontSize: '13px',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        textAlign: 'center' as const,
        py: 1.5
    });

    const subHeaderStyle = {
        bgcolor: '#f8fafc',
        color: '#64748b',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase' as const,
        py: 1,
        px: 1,
        borderBottom: '1px solid #e2e8f0',
        whiteSpace: 'nowrap' as const,
        textAlign: 'right' as const
    };

    const stickyColStyle = {
        position: 'sticky' as const,
        left: 0,
        bgcolor: 'white',
        zIndex: 10,
        borderRight: '1px solid #e2e8f0'
    };

    // Row Height for consistent sticky positioning
    const ROW_HEIGHT = 45;

    // Sort rows: Regular teams first, Total last.
    const { teamRows, totalRow } = useMemo(() => {
        if (!data?.data?.rows) return { teamRows: [], totalRow: null };
        const rows = data.data.rows;
        const total = rows.find(r => r.is_total);
        const teams = rows.filter(r => !r.is_total).sort((a, b) => a.team.localeCompare(b.team));

        return { teamRows: teams, totalRow: total };
    }, [data]);

    if (!token) return null;

    return (
        <Box sx={{ p: 2, height: '90vh', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        League/Team Performance
                    </Typography>
                </Box>
                <Box sx={{ width: 200 }}>
                    <SelectInput
                        label=""
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value as string)}
                        options={leagueOptions}
                        placeholder="Select League"
                    />
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                    <CircularProgress />
                </Box>
            ) : !data ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                    <Typography color="text.secondary">No data available.</Typography>
                </Box>
            ) : (
                <TableContainer
                    component={Paper}
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}
                >
                    <Table stickyHeader size="small">
                        <TableHead>
                            {/* First Header Row - Date Ranges */}
                            <TableRow sx={{
                                height: `${HEADER_ROW_1_HEIGHT}px`
                            }}>
                                <TableCell
                                    rowSpan={2}
                                    sx={{
                                        ...stickyColStyle,
                                        bgcolor: '#f1f5f9',
                                        color: '#475569',
                                        fontWeight: 700,
                                        fontSize: '12px',
                                        textTransform: 'uppercase',
                                        minWidth: 200,
                                        zIndex: 13, // Higher than date range headers
                                        position: 'sticky',
                                        top: 0,
                                        left: 0
                                    }}
                                >
                                    Team
                                </TableCell>
                                <TableCell
                                    rowSpan={2}
                                    sx={{
                                        width: 40,
                                        bgcolor: '#f1f5f9',
                                        borderRight: '1px solid #e2e8f0',
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 12
                                    }}
                                />

                                {/* Range Headers - Sticky */}
                                <TableCell colSpan={5} sx={{
                                    ...rangeHeaderStyle('#0f172a'),
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 12
                                }}>
                                    Yesterday ({data?.ranges?.yesterday?.start_date})
                                </TableCell>
                                <TableCell colSpan={5} sx={{
                                    ...rangeHeaderStyle('#581c87'),
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 12
                                }}>
                                    L7D ({data?.ranges?.['7d']?.start_date} - {data?.ranges?.['7d']?.end_date})
                                </TableCell>
                                <TableCell colSpan={5} sx={{
                                    ...rangeHeaderStyle('#7f1d1d'),
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 12
                                }}>
                                    L30D ({data?.ranges?.['30d']?.start_date} - {data?.ranges?.['30d']?.end_date})
                                </TableCell>
                            </TableRow>

                            {/* Second Header Row - Metrics */}
                            <TableRow sx={{
                                height: `${HEADER_ROW_2_HEIGHT}px`
                            }}>
                                {/* Yesterday Metrics */}
                                {['Revenue', '% of TTL', 'Spend', '% of TTL', 'ROAS'].map((h, i) => (
                                    <TableCell key={`y-${i}`} sx={{
                                        ...subHeaderStyle,
                                        position: 'sticky',
                                        top: `${HEADER_ROW_1_HEIGHT}px`,
                                        zIndex: 12
                                    }}>{h}</TableCell>
                                ))}
                                {/* 7D Metrics */}
                                {['Revenue', '% of TTL', 'Spend', '% of TTL', 'ROAS'].map((h, i) => (
                                    <TableCell key={`7d-${i}`} sx={{
                                        ...subHeaderStyle,
                                        position: 'sticky',
                                        top: `${HEADER_ROW_1_HEIGHT}px`,
                                        zIndex: 12
                                    }}>{h}</TableCell>
                                ))}
                                {/* 30D Metrics */}
                                {['Revenue', '% of TTL', 'Spend', '% of TTL', 'ROAS'].map((h, i) => (
                                    <TableCell key={`30d-${i}`} sx={{
                                        ...subHeaderStyle,
                                        position: 'sticky',
                                        top: `${HEADER_ROW_1_HEIGHT}px`,
                                        zIndex: 12
                                    }}>{h}</TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {teamRows.map((row, rowIdx) => (
                                <React.Fragment key={`${row.team}-${rowIdx}`}>
                                    {PLATFORMS.map((platform, pIdx) => (
                                        <TableRow
                                            key={`${row.team}-${platform.key}`}
                                            sx={{
                                                height: `${ROW_HEIGHT}px`,
                                                '&:hover': { bgcolor: '#f8fafc' },
                                                borderBottom: pIdx === 2 ? '2px solid #cbd5e1' : 'none'
                                            }}
                                        >
                                            {/* Team Name - Only for first platform (Meta) */}
                                            {pIdx === 0 && (
                                                <TableCell
                                                    rowSpan={3}
                                                    sx={{
                                                        ...stickyColStyle,
                                                        fontWeight: 600,
                                                        fontSize: '13px',
                                                        color: '#1e293b',
                                                        verticalAlign: 'middle',
                                                        zIndex: 1,
                                                        p: 1.5
                                                    }}
                                                >
                                                    {row.team}
                                                </TableCell>
                                            )}

                                            <TableCell sx={{
                                                textAlign: 'center',
                                                py: 0.5,
                                                borderRight: '1px solid #f1f5f9',
                                                borderBottom: pIdx === 2 ? '2px solid #e2e8f0' : 'none'
                                            }}>
                                                {platform.icon}
                                            </TableCell>

                                            {/* Metrics Mapping */}
                                            {['yesterday', '7d', '30d'].map((rangeKey) => {
                                                const metrics = row?.ranges?.[rangeKey as keyof TimeRanges]?.[platform.key as keyof ChannelMetrics];

                                                // Shared Style for cells
                                                const cellStyle = {
                                                    textAlign: 'right' as const,
                                                    fontSize: '12px',
                                                    color: '#334155',
                                                    py: 0.5,
                                                    px: 1,
                                                    fontWeight: 500,
                                                    borderBottom: pIdx === 2 ? '2px solid #e2e8f0' : 'none',
                                                    borderRight: '1px solid #f1f5f9',
                                                    height: `${ROW_HEIGHT}px`,
                                                    boxSizing: 'border-box' as const
                                                };

                                                return (
                                                    <React.Fragment key={`${row.team}-${platform.key}-${rangeKey}`}>
                                                        <TableCell sx={{ ...cellStyle, fontWeight: 600 }}>
                                                            {metrics?.revenue !== undefined ? formatCurrency(metrics.revenue) : '-'}
                                                        </TableCell>
                                                        <TableCell sx={cellStyle}>
                                                            {metrics?.revenue_share !== undefined ? formatPercent(metrics.revenue_share) : '-'}
                                                        </TableCell>
                                                        <TableCell sx={cellStyle}>
                                                            {metrics?.spend !== undefined ? formatCurrency(metrics.spend) : '-'}
                                                        </TableCell>
                                                        <TableCell sx={cellStyle}>
                                                            {metrics?.spend_share !== undefined ? formatPercent(metrics.spend_share) : '-'}
                                                        </TableCell>
                                                        <TableCell sx={{ ...cellStyle, fontWeight: 700 }}>
                                                            {metrics?.roas !== undefined ? metrics.roas.toFixed(2) : '-'}
                                                        </TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </React.Fragment>
                            ))}

                            {/* Sticky Footer Rows - League Total */}
                            {totalRow && PLATFORMS.map((platform, pIdx) => {
                                // Calculate bottom position for stacking
                                const ROW_HEIGHT_PX = 45;
                                const bottomOffset = (2 - pIdx) * ROW_HEIGHT_PX;

                                return (
                                    <TableRow
                                        key={`total-${platform.key}`}
                                        sx={{
                                            height: `${ROW_HEIGHT_PX}px`,
                                            position: 'sticky',
                                            bottom: `${bottomOffset}px`,
                                            zIndex: 20,
                                            bgcolor: '#fffbf0',
                                            // Stronger shadow on the top row of the group
                                            boxShadow: pIdx === 0 ? '0px -4px 10px rgba(0,0,0,0.15)' : 'none',
                                            '& td': {
                                                bgcolor: '#fffbf0',
                                                borderRight: '1px solid #f1f5f9'
                                            }
                                        }}
                                    >
                                        {/* Team Name (League Total) */}
                                        {pIdx === 0 && (
                                            <TableCell
                                                rowSpan={3}
                                                sx={{
                                                    position: 'sticky',
                                                    left: 0,
                                                    bottom: `${2 * ROW_HEIGHT_PX}px`,
                                                    zIndex: 30, // Higher than other sticky cells
                                                    fontWeight: 800,
                                                    fontSize: '13px',
                                                    color: '#0f172a',
                                                    verticalAlign: 'middle',
                                                    bgcolor: '#fffbf0 !important',
                                                    borderTop: '2px solid #cbd5e1', // Distinct top border
                                                    borderRight: '1px solid #e2e8f0',
                                                    boxShadow: '0px -4px 10px rgba(0,0,0,0.15)', // Shadow for the corner cell too
                                                    p: 1.5
                                                }}
                                            >
                                                {totalRow.team}
                                            </TableCell>
                                        )}

                                        <TableCell sx={{
                                            position: 'sticky',
                                            bottom: `${bottomOffset}px`,
                                            textAlign: 'center',
                                            py: 0.5,
                                            bgcolor: '#fffbf0 !important',
                                            zIndex: 20,
                                            borderTop: pIdx === 0 ? '2px solid #cbd5e1' : 'none',
                                            borderRight: '1px solid #f1f5f9',
                                            height: `${ROW_HEIGHT_PX}px`,
                                            boxSizing: 'border-box'
                                        }}>
                                            {platform.icon}
                                        </TableCell>

                                        {['yesterday', '7d', '30d'].map((rangeKey) => {
                                            const metrics = totalRow?.ranges?.[rangeKey as keyof TimeRanges]?.[platform.key as keyof ChannelMetrics];
                                            const cellStyle = {
                                                position: 'sticky' as const,
                                                bottom: `${bottomOffset}px`,
                                                textAlign: 'right' as const,
                                                fontSize: '12px',
                                                color: '#334155',
                                                py: 0.5,
                                                px: 1,
                                                fontWeight: 500,
                                                bgcolor: '#fffbf0 !important',
                                                zIndex: 20,
                                                borderRight: '1px solid #f1f5f9',
                                                borderTop: pIdx === 0 ? '2px solid #cbd5e1' : 'none',
                                                height: `${ROW_HEIGHT_PX}px`,
                                                boxSizing: 'border-box' as const
                                            };

                                            return (
                                                <React.Fragment key={`total-${platform.key}-${rangeKey}`}>
                                                    <TableCell sx={{ ...cellStyle, fontWeight: 700 }}>
                                                        {metrics?.revenue !== undefined ? formatCurrency(metrics.revenue) : '-'}
                                                    </TableCell>
                                                    <TableCell sx={cellStyle}>
                                                        {metrics?.revenue_share !== undefined ? formatPercent(metrics.revenue_share) : '-'}
                                                    </TableCell>
                                                    <TableCell sx={cellStyle}>
                                                        {metrics?.spend !== undefined ? formatCurrency(metrics.spend) : '-'}
                                                    </TableCell>
                                                    <TableCell sx={cellStyle}>
                                                        {metrics?.spend_share !== undefined ? formatPercent(metrics.spend_share) : '-'}
                                                    </TableCell>
                                                    <TableCell sx={{ ...cellStyle, fontWeight: 800 }}>
                                                        {metrics?.roas !== undefined ? metrics.roas.toFixed(2) : '-'}
                                                    </TableCell>
                                                </React.Fragment>
                                            );
                                        })}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default ProTeamLeaguePerformance;