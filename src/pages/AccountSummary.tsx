import React, { useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import PageContainer from "../common_components/PageContainer";
import TableToolbar from "../common_components/TableToolbar";
import TableRowExpanded from "../common_components/TableRowExpanded";
import CommonTable from "../common_components/CommonTable";
import { BADGE_VARIANTS } from "../common_components/tableConstants";
import { TableColumn, SortConfig } from "../common_components/tableTypes";

interface TaskHour {
  label: string;
  color: string;
  count?: string;
}

interface TotalHours {
  current: number;
  goal: number;
  percentage: number;
  status?: "success" | "error";
}

interface ExpandedDataItem {
  title: string;
  group: string;
  ttl: string;
  goals: string;
}

interface ExpandedPlacements {
  organic: number;
  paid: number;
  seo: number;
}

interface ExpandedRevenue {
  total: number;
  commissions: number;
  mrr: number;
}

interface AccountRow {
  id: number;
  client: string;
  tasksHours: TaskHour[];
  revenue: number;
  totalHours: TotalHours;
  timeAllocated: number;
  placements: number;
  expandedData: ExpandedDataItem[];
  expandedPlacements: ExpandedPlacements;
  expandedTotalHours: TotalHours;
  expandedRevenue: ExpandedRevenue;
}

// Mock data - Replace with actual API call
const mockAccountData: AccountRow[] = [
  {
    id: 1,
    client: "Client 1",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 25, goal: 22, percentage: 114, status: "success" },
    timeAllocated: 20,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 25, goal: 22, percentage: 114 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 2,
    client: "Client 2",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 18, goal: 22, percentage: 82, status: "error" },
    timeAllocated: 14,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 18, goal: 22, percentage: 82 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 3,
    client: "Client 3",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 12, goal: 22, percentage: 55, status: "error" },
    timeAllocated: 10,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 12, goal: 22, percentage: 55 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 4,
    client: "Client 4",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 28, goal: 22, percentage: 127, status: "success" },
    timeAllocated: 22,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 28, goal: 22, percentage: 127 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 5,
    client: "Client 5",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 28, goal: 22, percentage: 127, status: "success" },
    timeAllocated: 22,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 28, goal: 22, percentage: 127 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 6,
    client: "Client 6",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 10, goal: 22, percentage: 45, status: "error" },
    timeAllocated: 8,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 10, goal: 22, percentage: 45 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
  {
    id: 7,
    client: "Client 7",
    tasksHours: [
      { label: "PM Acc... (38h 18m)", color: "blue", count: "+2" },
    ],
    revenue: 9408,
    totalHours: { current: 5, goal: 22, percentage: 23, status: "error" },
    timeAllocated: 4,
    placements: 3,
    expandedData: [
      {
        title: "PM WEEKLY TEAM CALENDAR REVIEW",
        group: "PM Account Management",
        ttl: "20m",
        goals: "18m"
      },
      {
        title: "PM CLIENT CALENDAR REVIEW",
        group: "Other",
        ttl: "4h",
        goals: "3.3h"
      },
      {
        title: "PM DAILY PERFORMANCE TRACKER & DASHBOARD REVIEW",
        group: "PM Account Management",
        ttl: "3h",
        goals: "3.33h"
      },
    ],
    expandedPlacements: { organic: 0, paid: 3, seo: 0 },
    expandedTotalHours: { current: 5, goal: 22, percentage: 23 },
    expandedRevenue: { total: 9408, commissions: 3408, mrr: 6000 },
  },
];

const Badge = React.memo<{ children: React.ReactNode; variant?: string }>(({ children, variant = BADGE_VARIANTS.DEFAULT }) => {
  const getBadgeClass = useMemo(() => {
    switch (variant) {
      case BADGE_VARIANTS.ERROR:
        return "table-toolbar-badge-error";
      case BADGE_VARIANTS.SUCCESS:
        return "table-toolbar-badge-success";
      case BADGE_VARIANTS.BLUE:
        return "table-badge-blue";
      case BADGE_VARIANTS.ORANGE:
        return "table-badge-orange";
      case BADGE_VARIANTS.BLUE_LIGHT:
        return "table-badge-blue-light";
      default:
        return "table-toolbar-badge-default";
    }
  }, [variant]);

  return <Box className={`table-toolbar-badge ${getBadgeClass}`}>{children}</Box>;
});

Badge.displayName = "Badge";

export default function AccountSummary(): React.ReactElement {
  // State management
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [columnVisibilityAnchor, setColumnVisibilityAnchor] = useState<HTMLElement | null>(null);
  const [controlledExpandedRows, setControlledExpandedRows] = useState<string[]>([]);

  // Memoized calculations for totals
  const { totalHours, totalGoalHours, overallPercentage } = useMemo(() => {
    const hours = mockAccountData.reduce(
      (sum, item) => sum + (item?.totalHours?.current || 0),
      0
    );
    const goals = mockAccountData.reduce(
      (sum, item) => sum + (item?.totalHours?.goal || 0),
      0
    );
    const percentage = goals > 0 ? Math.round((hours / goals) * 100) : 0;
    return { totalHours: hours, totalGoalHours: goals, overallPercentage: percentage };
  }, []);

  // Memoized filtered data based on search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockAccountData;
    }
    const query = searchQuery.toLowerCase();
    return mockAccountData.filter((item) =>
      item?.client?.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Event handlers with useCallback for performance
  const handleSearchChange = useCallback((searchText: string) => {
    setSearchQuery(searchText);
    // TODO: Make API call here with searchText
    // Example: await apiCall('/search', { query: searchText });
  }, []);

  const handleDensityChange = useCallback((density: number) => {
    // Density changed: 1 = Comfortable, 2 = Standard, 3 = Compact (default)
    // You can apply density styles to the table here
  }, []);

  const handleExpandToggle = useCallback((rowId: string) => {
    setControlledExpandedRows((prev) => {
      if (prev.includes(rowId)) {
        return prev.filter((id) => id !== rowId);
      }
      return [...prev, rowId];
    });
  }, []);

  const handleSelectionChange = useCallback((newSelected: Set<string>) => {
    setSelectedRows(newSelected);
  }, []);

  const handleColumnVisibilityChange = useCallback((newHidden: Set<string>) => {
    setHiddenColumns(newHidden);
  }, []);

  const handleColumnVisibilityClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setColumnVisibilityAnchor(event.currentTarget);
  }, []);

  const handleColumnVisibilityClose = useCallback(() => {
    setColumnVisibilityAnchor(null);
  }, []);

  // Memoized sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig?.columnId) {
      return filteredData;
    }

    const { columnId, direction } = sortConfig;
    return [...filteredData].sort((a, b) => {
      let aVal: any = a[columnId as keyof AccountRow];
      let bVal: any = b[columnId as keyof AccountRow];

      // Handle nested objects
      if (columnId === "totalHours") {
        aVal = a?.totalHours?.current || 0;
        bVal = b?.totalHours?.current || 0;
      }

      if (typeof aVal === "string") {
        return direction === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return direction === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filteredData, sortConfig]);

  const handleSortChange = useCallback((columnId: string, direction: "asc" | "desc" | null) => {
    setSortConfig({ columnId, direction: direction || "asc" });
  }, []);

  // Memoized table columns configuration
  const columns: TableColumn[] = useMemo(() => [
    {
      id: "client",
      label: "Clients",
      align: "left",
      sortable: true,
    },
    {
      id: "tasksHours",
      label: "Tasks & Hours",
      align: "left",
      width: "240px",
      sortable: false,
    },
    {
      id: "revenue",
      label: "8A Revenue",
      align: "right",
      width: "105px",
      sortable: true,
    },
    {
      id: "totalHours",
      label: "Total Hours",
      align: "left",
      width: "174px",
      sortable: true,
    },
    {
      id: "timeAllocated",
      label: "Time Allocated to Account",
      align: "center",
      sortable: true,
    },
    {
      id: "placements",
      label: "Placements",
      align: "center",
      width: "103px",
      sortable: true,
    },
  ], []);

  // Memoized render cell content
  const renderCell = useCallback((row: AccountRow, column: TableColumn): React.ReactNode => {
    switch (column.id) {
      case "client":
        return <Box>{row.client}</Box>;

      case "tasksHours":
        return (
          <Box className="table-cell-tasks-hours">
            {row.tasksHours.map((task, idx) => (
              <Box key={idx} className="table-cell-task-badge-wrapper">
                <Badge variant={task.color}>{task.label}</Badge>
                {task.count && (
                  <Badge variant="default">{task.count}</Badge>
                )}
              </Box>
            ))}
          </Box>
        );

      case "revenue":
        return (
          <Box className="table-cell-revenue">
            <Box component="span" className="table-cell-revenue-symbol">
              $
            </Box>
            <Box component="span">{row.revenue.toLocaleString()}</Box>
          </Box>
        );

      case "totalHours":
        return (
          <Box className="table-cell-total-hours">
            <Box className="table-cell-hours-text">
              {row.totalHours.current}h / {row.totalHours.goal}h
            </Box>
            <Badge variant={row.totalHours.status}>
              {row.totalHours.percentage}%
            </Badge>
          </Box>
        );

      case "timeAllocated":
        return (
          <Box className="table-cell-time-allocated">
            <Badge variant="default">{row.timeAllocated}%</Badge>
          </Box>
        );

      case "placements":
        return (
          <Box className="table-cell-placements">
            <Badge variant="default">{row.placements}</Badge>
          </Box>
        );

      default:
        return null;
    }
  }, []);

  // Memoized render expanded content
  const renderExpandedContent = useCallback((row: AccountRow): React.ReactNode => {
    if (!row.expandedData || !Array.isArray(row.expandedData) || row.expandedData.length === 0) return null;

    const detailColumns = [
      {
        label: "Task",
        width: "auto",
        rows: row.expandedData.map((task) => ({ label: task.title })),
      },
      {
        label: "Task Group",
        width: "213px",
        rows: row.expandedData.map((task) => ({
          label: task.group,
        })),
      },
      {
        label: "TTL",
        width: "74px",
        rows: row.expandedData.map((task) => ({ label: task.ttl })),
      },
      {
        label: "Goal",
        width: "78px",
        rows: row.expandedData.map((task) => ({ label: task.goals })),
      },
    ];

    const renderDetailCell = (detailRow: { label: string }, columnGroup: { label: string; rows: { label: string }[] }) => {
      if (columnGroup.label === "Task Group") {
        const index = columnGroup.rows.indexOf(detailRow);
        const group = row.expandedData[index].group;
        return (
          <Badge
            variant={
              group === "PM Account Management" ? "blue" : "default"
            }
          >
            {group}
          </Badge>
        );
      }
      return detailRow.label || String(detailRow);
    };

    const renderSidePanel = () => {
      const placements = row.expandedPlacements || { organic: 0, paid: 0, seo: 0 };
      const totalHours = row.expandedTotalHours || row.totalHours;
      const revenue = row.expandedRevenue || { total: row.revenue || 0, commissions: 0, mrr: 0 };
      return (
        <Box className="table-expanded-side-panel-content">
          <Box className="table-expanded-side-panel-header">
            <Box className="table-expanded-side-panel-title">Placements</Box>
            <Box className="table-expanded-side-panel-badges">
              <Badge variant="success">Organic : {placements.organic}</Badge>
              <Badge variant="blue-light">Paid : {placements.paid}</Badge>
              <Badge variant="orange">SEO : {placements.seo}</Badge>
            </Box>
          </Box>
          <Box className="table-expanded-side-panel-body">
            <Box className="table-expanded-metric-card">
              <Box className="table-expanded-metric-label">Total Hours</Box>
              <Box className="table-expanded-metric-value">
                <Badge variant={totalHours.percentage >= 100 ? "success" : "error"}>
                  {totalHours.percentage}%
                </Badge>
                <Box className="table-expanded-metric-hours">
                  {totalHours.current}
                  <Box component="span" className="table-expanded-metric-unit">
                    h
                  </Box>
                  {" / "}
                  {totalHours.goal}
                  <Box component="span" className="table-expanded-metric-unit">
                    h
                  </Box>
                </Box>
              </Box>
            </Box>
            <Box className="table-expanded-metric-card">
              <Box className="table-expanded-metric-label">8A Revenue</Box>
              <Box className="table-expanded-metric-value">
                <Box className="table-expanded-metric-revenue">
                  <Box component="span" className="table-expanded-metric-symbol">
                    $
                  </Box>
                  {revenue.total.toLocaleString()}
                </Box>
              </Box>
              <Box className="table-expanded-metric-breakdown">
                <Box className="table-expanded-metric-breakdown-item">
                  <Box className="table-expanded-metric-breakdown-label">
                    Commissions
                  </Box>
                  <Box className="table-expanded-metric-breakdown-value">
                    <Box component="span" className="table-expanded-metric-symbol">
                      $
                    </Box>
                    {revenue.commissions.toLocaleString()}
                  </Box>
                </Box>
                <Box className="table-expanded-metric-breakdown-item">
                  <Box className="table-expanded-metric-breakdown-label">MRR</Box>
                  <Box className="table-expanded-metric-breakdown-value">
                    <Box component="span" className="table-expanded-metric-symbol">
                      $
                    </Box>
                    {revenue.mrr.toLocaleString()}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      );
    };

    return (
      <TableRowExpanded
        row={row}
        detailColumns={detailColumns}
        renderDetailCell={renderDetailCell}
        renderSidePanel={renderSidePanel}
      />
    );
  }, []);

  return (
    <PageContainer>
      <Paper elevation={0} className="account-performance-container">
        <TableToolbar
          title="Account Performance"
          badgeText={`${totalHours}h / ${totalGoalHours}h`}
          badgeValue={`${overallPercentage}%`}
          badgeColor={overallPercentage >= 100 ? BADGE_VARIANTS.SUCCESS : BADGE_VARIANTS.ERROR}
          onSearchChange={handleSearchChange}
          onDensityChange={() => handleDensityChange(0)}
          showSearch={true}
          showRows={true}
          showExpand={true}
          showFullScreen={true}
          enableColumnVisibility={true}
          onColumnVisibilityClick={handleColumnVisibilityClick}
        />
        <CommonTable
          columns={columns}
          rows={sortedData}
          renderCell={renderCell}
          renderExpandedContent={renderExpandedContent}
          expandTrigger="icon"
          onExpandToggle={handleExpandToggle}
          sortConfig={sortConfig}
          onSortChange={handleSortChange}
          isLoading={isLoading}
          isError={isError}
          emptyMessage="No account data available"
          // Common features
          enableSelection={true}
          selectedRows={selectedRows}
          onSelectionChange={handleSelectionChange}
          hiddenColumns={hiddenColumns}
          onColumnVisibilityChange={handleColumnVisibilityChange}
          columnVisibilityAnchorEl={columnVisibilityAnchor}
          onColumnVisibilityClose={handleColumnVisibilityClose}
          enableColumnActions={true}
          controlledExpandedRows={new Set(controlledExpandedRows)}
        />
      </Paper>
    </PageContainer>
  );
}

