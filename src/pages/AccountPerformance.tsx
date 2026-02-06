import React, { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PageContainer from "../common_components/PageContainer";
import CommonTable from "../common_components/CommonTable";
import Pagination from "../common_components/Pagination";
import { SUMMARY_ROW_POSITIONS, TABLE_TYPES } from "../common_components/tableConstants";
import { TableColumn, SortConfig } from "../common_components/tableTypes";

// Mock data matching Figma design
interface PerformanceRow {
  id: number;
  client: string;
  mc: string;
  am: string;
  revenueGoal: number;
  revenueMtd: number;
  revenueVariance: number;
  roasGoal: number;
  roasMtd: number;
  roasVariance: number;
  commission: number;
}

const mockPerformanceData: PerformanceRow[] = [
  {
    id: 1,
    client: "Client 1",
    mc: "Google Ads",
    am: "NA",
    revenueGoal: 408462.46,
    revenueMtd: 1085714,
    revenueVariance: 677251.54,
    roasGoal: 3.30,
    roasMtd: 387.25,
    roasVariance: 383.95,
    commission: 0.00,
  },
  {
    id: 2,
    client: "Client 2",
    mc: "Facebook",
    am: "KH",
    revenueGoal: 408462.46,
    revenueMtd: 1085714,
    revenueVariance: 677251.54,
    roasGoal: 3.30,
    roasMtd: 387.25,
    roasVariance: 383.95,
    commission: 206781.49,
  },
];

export default function AccountPerformance(): React.ReactElement {
  const [rows] = useState<PerformanceRow[]>(mockPerformanceData);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(10);
  const [accountManager] = useState<string>("All");
  const [clientType] = useState<string>("budget-based");
  const [monthRange] = useState<string>("Sep, 2025");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    columnId: null as any,
    direction: "asc",
  });

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Table columns with grouped headers matching Figma design
  const columns: TableColumn[] = [
    {
      id: "client",
      label: "Client",
      width: "196px",
      align: "left",
      sortable: true,
    },
    {
      id: "mc",
      label: "MC",
      width: "80px",
      align: "center",
      sortable: true,
    },
    {
      id: "am",
      label: "AM",
      width: "80px",
      align: "center",
      sortable: true,
    },
    {
      id: "revenueGroup",
      label: "Revenue",
      children: [
        {
          id: "revenueGoal",
          label: "Goal",
          width: "120px",
          align: "right",
          sortable: true,
        },
        {
          id: "revenueMtd",
          label: "MTD",
          width: "120px",
          align: "right",
          sortable: true,
        },
        {
          id: "revenueVariance",
          label: "Variance",
          width: "120px",
          align: "right",
          sortable: true,
        },
      ],
    },
    {
      id: "roasGroup",
      label: "ROAS",
      children: [
        {
          id: "roasGoal",
          label: "Goal",
          width: "100px",
          align: "right",
          sortable: true,
        },
        {
          id: "roasMtd",
          label: "MTD",
          width: "100px",
          align: "right",
          sortable: true,
        },
        {
          id: "roasVariance",
          label: "Variance",
          width: "100px",
          align: "right",
          sortable: true,
        },
      ],
    },
    {
      id: "commissionGroup",
      label: "Commission",
      children: [
        {
          id: "commission",
          label: "Baseline",
          width: "120px",
          align: "right",
          sortable: true,
        },
      ],
    },
  ];

  // Render cell content matching Figma design
  const renderCell = (row: PerformanceRow, column: TableColumn): React.ReactNode => {
    switch (column.id) {
      case "client":
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 400, color: "#27272a" }}>
              {row.client}
            </Typography>
            {/* Link icon */}
            <svg width="10.667" height="10.667" viewBox="0 0 10.667 10.667" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.472 2.195l-.943-.942a3.333 3.333 0 0 0-4.714 4.714l.943.943m4.714-4.715l.943.943a3.333 3.333 0 0 1-4.714 4.714l-.943-.943" stroke="#414651" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
        );

      case "mc":
        // Platform avatar matching Figma design
        const getPlatformAvatar = (platform: string) => {
          switch (platform?.toLowerCase()) {
            case "google ads":
              return (
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#eef4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.333 10.417c0 4.584-3.75 8.333-8.333 8.333a8.336 8.336 0 0 1-4.917-1.667L15.833 4.917c.833.833 1.5 1.917 1.5 3.5z" fill="#4285F4" />
                    <path d="M10 1.667c4.584 0 8.333 3.75 8.333 8.333 0 1.583-.667 3.084-1.833 4.167L5.417 3.5c1.083-1.167 2.584-1.833 4.583-1.833z" fill="#34A853" />
                    <path d="M1.667 10c0-4.584 3.75-8.333 8.333-8.333.834 0 1.667.167 2.5.417L3.917 14.583c-.834-.833-1.25-1.916-1.25-3.583z" fill="#FBBC05" />
                    <path d="M10 18.333c-4.584 0-8.333-3.75-8.333-8.333 0-1.584.666-3.084 1.833-4.167L14.583 16.5c-1.083 1.167-2.584 1.833-4.583 1.833z" fill="#EA4335" />
                  </svg>
                </Box>
              );
            case "facebook":
              return (
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#e6f1fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 10c0-5.523-4.477-10-10-10S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" fill="#1877F2" />
                  </svg>
                </Box>
              );
            default:
              return (
                <Box sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "#f9f5ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 0C4.477 0 0 4.477 0 10s4.477 10 10 10 10-4.477 10-10S15.523 0 10 0zm4.125 14.167c-.208.208-.542.208-.75 0L10 10.75l-3.375 3.417c-.208.208-.542.208-.75 0s-.208-.542 0-.75L9.25 10 5.833 6.583c-.208-.208-.208-.542 0-.75s.542-.208.75 0L10 9.25l3.375-3.417c.208-.208.542-.208.75 0s.208.542 0 .75L10.75 10l3.417 3.375c.208.208.208.542 0 .75z" fill="#7F56D9" />
                  </svg>
                </Box>
              );
          }
        };

        return (
          <Box sx={{ display: "flex", justifyContent: "center", px: 2 }}>
            {getPlatformAvatar(row.mc)}
          </Box>
        );

      case "am":
        // AM avatar matching Figma design
        if (row.am === "NA") {
          return (
            <Box sx={{ display: "flex", justifyContent: "center", px: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#ffedfa",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 500,
                color: "#ff008e",
              }}>
                NA
              </Box>
            </Box>
          );
        } else {
          return (
            <Box sx={{ display: "flex", justifyContent: "center", px: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                backgroundColor: "#f9f5ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 500,
                color: "#7f56d9",
              }}>
                {row.am}
              </Box>
            </Box>
          );
        }

      case "revenueGoal":
      case "revenueMtd":
        return (
          <Box sx={{ px: 2, textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontFamily: "Inter", fontWeight: 400, color: "#27272a" }}>
              <span style={{ color: "#a1a1aa" }}>$</span>
              {row[column.id as keyof PerformanceRow]?.toLocaleString() || "0"}
            </Typography>
          </Box>
        );

      case "revenueVariance":
        const revenueVariance = row[column.id as keyof PerformanceRow] as number || 0;
        const isRevenuePositive = revenueVariance > 0;
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <Box sx={{
              backgroundColor: isRevenuePositive ? "#ecfdf3" : "#ecfdf3", // Green badge for positive
              borderRadius: "16px",
              px: 1.5,
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}>
              <Typography variant="body2" sx={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: "12px",
                color: "#027a48"
              }}>
                {revenueVariance.toFixed(0)}%
              </Typography>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3.5V8M3.5 5.5L6 8L8.5 5.5" stroke="#12B76A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Box>
          </Box>
        );

      case "roasGoal":
      case "roasMtd":
        return (
          <Box sx={{ px: 2, textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontFamily: "Inter", fontWeight: 400, color: "#27272a" }}>
              {(row[column.id as keyof PerformanceRow] as number)?.toFixed(2) || "0.00"}
            </Typography>
          </Box>
        );

      case "roasVariance":
        const roasVariance = row[column.id as keyof PerformanceRow] as number || 0;
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
            <Box sx={{
              backgroundColor: "#ecfdf3", // Green badge
              borderRadius: "16px",
              px: 1.5,
              py: 0.5,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}>
              <Typography variant="body2" sx={{
                fontFamily: "Inter",
                fontWeight: 400,
                fontSize: "12px",
                color: "#027a48"
              }}>
                {roasVariance.toFixed(0)}%
              </Typography>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 3.5V8M3.5 5.5L6 8L8.5 5.5" stroke="#12B76A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Box>
          </Box>
        );

      case "commission":
        return (
          <Box sx={{ px: 2, textAlign: "right" }}>
            <Typography variant="body2" sx={{ fontFamily: "Inter", fontWeight: 400, color: "#27272a" }}>
              <span style={{ color: "#a1a1aa" }}>$</span>
              {(row[column.id as keyof PerformanceRow] as number)?.toLocaleString() || "0.00"}
            </Typography>
          </Box>
        );

      default:
        return (
          <Typography variant="body2">
            {String(row[column.id as keyof PerformanceRow] || "")}
          </Typography>
        );
    }
  };

  // Render summary row matching Figma design
  const renderSummaryRow = (allRows: PerformanceRow[], column: TableColumn): React.ReactNode => {
    if (column.id === "client") {
      return (
        <Box sx={{ px: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#181d27" }}>
            Total Summary
          </Typography>
        </Box>
      );
    }

    if (column.id === "mc" || column.id === "am") {
      return ""; // Empty for these columns
    }

    // Calculate totals for numeric columns
    if (["revenueGoal", "revenueMtd"].includes(column.id)) {
      const total = allRows.reduce((sum, row) => sum + ((row[column.id as keyof PerformanceRow] as number) || 0), 0);
      return (
        <Box sx={{ px: 2, textAlign: "right" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "Inter", color: "#181d27" }}>
            <span style={{ color: "#a4a7ae" }}>$</span>
            {total.toLocaleString()}
          </Typography>
        </Box>
      );
    }

    if (column.id === "revenueVariance") {
      const total = allRows.reduce((sum, row) => sum + ((row[column.id as keyof PerformanceRow] as number) || 0), 0);
      return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
          <Box sx={{
            backgroundColor: "#ecfdf3",
            borderRadius: "16px",
            px: 1.5,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}>
            <Typography variant="body2" sx={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "12px",
              color: "#027a48"
            }}>
              {((total / allRows.reduce((sum, row) => sum + (row.revenueMtd || 0), 0)) * 100).toFixed(0)}%
            </Typography>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3.5V8M3.5 5.5L6 8L8.5 5.5" stroke="#12B76A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
        </Box>
      );
    }

    if (["roasGoal", "roasMtd"].includes(column.id)) {
      const total = allRows.reduce((sum, row) => sum + ((row[column.id as keyof PerformanceRow] as number) || 0), 0);
      const average = total / allRows.length;
      return (
        <Box sx={{ px: 2, textAlign: "right" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "Inter", color: "#181d27" }}>
            {average.toFixed(2)}
          </Typography>
        </Box>
      );
    }

    if (column.id === "roasVariance") {
      const total = allRows.reduce((sum, row) => sum + ((row[column.id as keyof PerformanceRow] as number) || 0), 0);
      return (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5 }}>
          <Box sx={{
            backgroundColor: "#ecfdf3",
            borderRadius: "16px",
            px: 1.5,
            py: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}>
            <Typography variant="body2" sx={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "12px",
              color: "#027a48"
            }}>
              {((total / allRows.reduce((sum, row) => sum + (row.roasMtd || 0), 0)) * 100).toFixed(0)}%
            </Typography>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3.5V8M3.5 5.5L6 8L8.5 5.5" stroke="#12B76A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Box>
        </Box>
      );
    }

    if (column.id === "commission") {
      const total = allRows.reduce((sum, row) => sum + ((row[column.id as keyof PerformanceRow] as number) || 0), 0);
      return (
        <Box sx={{ px: 2, textAlign: "right" }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: "Inter", color: "#181d27" }}>
            <span style={{ color: "#a4a7ae" }}>$</span>
            {total.toLocaleString()}
          </Typography>
        </Box>
      );
    }

    return ""; // Default empty
  };

  const handleSortChange = useCallback((columnId: string, direction: "asc" | "desc" | null) => {
    setSortConfig({ columnId: columnId as any, direction: direction || "asc" });
  }, []);
  

  return (
    <PageContainer>
      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ p: 3, borderRadius: "8px", border: "1px solid #e4e4e7" }}>
          {/* Header Section - matching Figma design */}
          <Box sx={{
            backgroundColor: "#fafafa",
            border: "1px solid #e4e4e7",
            borderRadius: "8px",
            p: 2,
            mb: 3,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
              {/* Last updated section */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#f4f4f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 9c0 3.866-3.134 7-7 7s-7-3.134-7-7 3.134-7 7-7 7 3.134 7 7z" stroke="#717680" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 4.5v4.5l3 1.5" stroke="#717680" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ color: "#71717a", fontSize: "12px", fontWeight: 400 }}>
                    Last updated
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2" sx={{ color: "#18181b", fontSize: "12px", fontWeight: 500 }}>
                      Dec 08, 2025
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#71717a", fontSize: "12px", fontWeight: 400 }}>
                      at
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#18181b", fontSize: "12px", fontWeight: 500 }}>
                      11:27 PM
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              {/* Account Manager Filter */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "#ffffff",
                border: "1px solid #d5d7da",
                borderRadius: "8px",
                px: 3,
                py: 2
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9v3m6-3v3m-3-3v3m3-6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3m6 0H6m6 0a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3m0 0h6" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Typography variant="body2" sx={{ color: "#181d27", fontSize: "12px", fontWeight: 500 }}>
                  Account Manager :
                </Typography>
                <Typography variant="body2" sx={{ color: "#717680", fontSize: "12px", fontWeight: 500 }}>
                  All
                </Typography>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.25 7.5L9 11.25L12.75 7.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Box>

              {/* Client Type Filter */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "#ffffff",
                border: "1px solid #d5d7da",
                borderRadius: "8px",
                px: 3,
                py: 2
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9v3m6-3v3m-3-3v3m3-6V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3m6 0H6m6 0a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3m0 0h6" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Typography variant="body2" sx={{ color: "#181d27", fontSize: "12px", fontWeight: 500 }}>
                  Client Type :
                </Typography>
                <Typography variant="body2" sx={{ color: "#717680", fontSize: "12px", fontWeight: 500 }}>
                  budget-based
                </Typography>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.25 7.5L9 11.25L12.75 7.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Box>

              {/* Month Range Selector */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                backgroundColor: "#ffffff",
                border: "1px solid #d5d7da",
                borderRadius: "8px",
                px: 3,
                py: 2
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.75 7.5V4.5a3 3 0 0 1 3-3h4.5a3 3 0 0 1 3 3v3M3.75 7.5H2.25a1.5 1.5 0 0 0-1.5 1.5v6a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5v-6a1.5 1.5 0 0 0-1.5-1.5H14.25M3.75 7.5h10.5" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M6.75 4.5V3M11.25 4.5V3" stroke="#71717a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Typography variant="body2" sx={{ color: "#181d27", fontSize: "12px", fontWeight: 500 }}>
                  Sep, 2025
                </Typography>
              </Box>

              {/* Export Button */}
              <Box sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                backgroundColor: "#ffffff",
                border: "1px solid #d5d7da",
                borderRadius: "8px",
                px: 3,
                py: 2,
                cursor: "pointer"
              }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.75 12.75V2.25M9.75 12.75L7.5 10.5M9.75 12.75L12 10.5M9.75 2.25L6 6.75M9.75 2.25L13.5 6.75" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <Typography variant="body2" sx={{ color: "#181d27", fontSize: "12px", fontWeight: 500 }}>
                  Export
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Table - using CommonTable with grouped headers */}
          <CommonTable
            columns={columns}
            rows={rows}
            renderCell={renderCell}

            /* ✅ sorting allowed */
            sortConfig={sortConfig}
            onSortChange={handleSortChange}

            /* ❌ disable everything else */
            enableColumnActions={false}
            enableColumnReorder={false}
            enableColumnPinning={false}
            enableColumnFilters={false}
            enableColumnVisibility={false}
            enableSelection={false}

            /* summary */
            enableSummaryRow={true}
            renderSummaryRow={renderSummaryRow}
            summaryRowPosition={SUMMARY_ROW_POSITIONS.BOTTOM}
            type={TABLE_TYPES.GROUPED}
          />


          {/* Pagination - matching Figma design */}
          <Box className="user-list-pagination-wrapper">
            <Pagination
              currentPage={1}
              totalPages={10}
              maxVisiblePages={5}
            />
          </Box>
        </Paper>
      </Box>
    </PageContainer>
  );
}

