import React, { useMemo } from "react";
import Box from "@mui/material/Box";

interface DetailRow {
    label: string;
    [key: string]: any;
}

interface ColumnGroup {
    label: string;
    width?: string;
    rows?: DetailRow[];
}

interface TableRowExpandedProps {
    row: any;
    detailColumns?: ColumnGroup[];
    renderDetailCell?: (detailRow: DetailRow, columnGroup: ColumnGroup) => React.ReactNode;
    renderSidePanel?: (row: any) => React.ReactNode;
}

function TableRowExpanded({
    row,
    detailColumns = [],
    renderDetailCell,
    renderSidePanel,
}: TableRowExpandedProps) {
    /**
     * Memoized detail columns to prevent unnecessary re-renders
     */
    const memoizedDetailColumns = useMemo(() => {
        return Array.isArray(detailColumns) ? detailColumns : [];
    }, [detailColumns]);

    const renderCellContent = (detailRow: DetailRow, columnGroup: ColumnGroup): React.ReactNode => {
        if (renderDetailCell) {
            return renderDetailCell(detailRow, columnGroup);
        }
        return detailRow?.label || String(detailRow || "");
    };

    if (!memoizedDetailColumns.length && !renderSidePanel) {
        return null;
    }

    return (
        <Box className="table-row-expanded-container">
            {/* Main Detail Table */}
            {memoizedDetailColumns.length > 0 && (
                <Box className="table-row-expanded-main">
                    {memoizedDetailColumns.map((columnGroup, groupIndex) => {
                        if (!columnGroup || !columnGroup.label) return null;

                        const columnWidth = columnGroup.width || "auto";
                        const rows = Array.isArray(columnGroup.rows) ? columnGroup.rows : [];

                        return (
                            <Box
                                key={`column-group-${groupIndex}-${columnGroup.label}`}
                                className="table-row-expanded-column-group"
                                style={{ width: columnWidth }}
                            >
                                {/* Column Header */}
                                <Box className="table-row-expanded-header">
                                    {columnGroup.label}
                                </Box>

                                {/* Column Rows */}
                                {rows.length > 0 ? (
                                    rows.map((detailRow, detailIndex) => (
                                        <Box
                                            key={`detail-row-${detailIndex}-${detailRow?.label || detailIndex}`}
                                            className="table-row-expanded-cell"
                                        >
                                            {renderCellContent(detailRow, columnGroup)}
                                        </Box>
                                    ))
                                ) : (
                                    <Box className="table-row-expanded-cell">
                                        <Box sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                                            No data
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        );
                    })}
                </Box>
            )}

            {/* Side Panel */}
            {renderSidePanel && (
                <Box className="table-row-expanded-side-panel">
                    {renderSidePanel(row)}
                </Box>
            )}
        </Box>
    );
}

export default TableRowExpanded;
