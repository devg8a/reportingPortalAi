import { ReactNode } from "react";

export interface TableColumn {
    id: string;
    label: string; // Or ReactNode? Usually string for column headers, but code used `column.label` directly.
    width?: string | number;
    align?: "left" | "right" | "center" | "justify" | "inherit";
    children?: TableColumn[];
    parentId?: string;
    isChild?: boolean;
    sortable?: boolean;
    hideable?: boolean;
    draggable?: boolean;
    showColumnActions?: boolean;
    renderHeader?: (column: TableColumn, sortDirection?: "asc" | "desc" | null) => ReactNode;
}

export interface SortConfig {
    columnId: string;
    direction: "asc" | "desc";
}

export interface PinnedColumns {
    left: string[];
    right: string[];
}

export interface ColumnFilterConfig {
    enable?: boolean;
    columns?: Record<string, {
        type: string;
        options?: { label: string; value: string | number }[];
    }>;
}
