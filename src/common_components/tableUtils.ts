import { TableColumn, PinnedColumns } from "./tableTypes";

export const flattenColumns = (columns: TableColumn[]): TableColumn[] => {
    if (!Array.isArray(columns)) return [];

    const flat: TableColumn[] = [];
    columns.forEach((col) => {
        if (col?.children && Array.isArray(col.children) && col.children.length > 0) {
            flat.push(col); // Parent column
            col.children.forEach((child) => {
                if (child?.id) {
                    flat.push({ ...child, parentId: col.id, isChild: true });
                }
            });
        } else if (col?.id) {
            flat.push(col);
        }
    });
    return flat;
};

export const getAllColumnIds = (columns: TableColumn[]): string[] => {
    if (!Array.isArray(columns)) return [];

    const ids: string[] = [];
    columns.forEach((col) => {
        if (col?.id) {
            ids.push(col.id);
        }
        if (col?.children && Array.isArray(col.children)) {
            col.children.forEach((child) => {
                if (child?.id) {
                    ids.push(child.id);
                }
            });
        }
    });
    return ids;
};

export const normalizeColumns = (
    columns: TableColumn[] = [],
    hiddenColumns: Set<string> = new Set(),
    columnOrder: string[] | null = null,
    pinnedColumns: PinnedColumns = { left: [], right: [] }
) => {
    if (!Array.isArray(columns)) {
        return { leftPinned: [], unpinned: [], rightPinned: [], all: [] };
    }

    let normalized = [...columns];

    // Apply column order if provided
    if (Array.isArray(columnOrder) && columnOrder.length > 0) {
        const orderMap = new Map();
        columnOrder.forEach((id, index) => {
            if (id) {
                orderMap.set(id, index);
            }
        });

        normalized.sort((a, b) => {
            if (!a?.id || !b?.id) return 0;
            const aIndex = orderMap.get(a.id) ?? Infinity;
            const bIndex = orderMap.get(b.id) ?? Infinity;
            return aIndex - bIndex;
        });
    }

    // Filter hidden columns
    normalized = normalized.filter((col) => {
        if (!col?.id) return false;
        if (hiddenColumns.has(col.id)) return false;
        if (col.hideable === false) return true;
        return !hiddenColumns.has(col.id);
    });

    // Separate pinned columns
    const leftPinned: TableColumn[] = [];
    const rightPinned: TableColumn[] = [];
    const unpinned: TableColumn[] = [];

    normalized.forEach((col) => {
        if (!col?.id) return;

        const leftPinnedArray = Array.isArray(pinnedColumns?.left) ? pinnedColumns.left : [];
        const rightPinnedArray = Array.isArray(pinnedColumns?.right) ? pinnedColumns.right : [];

        if (leftPinnedArray.includes(col.id)) {
            leftPinned.push(col);
        } else if (rightPinnedArray.includes(col.id)) {
            rightPinned.push(col);
        } else {
            unpinned.push(col);
        }
    });

    return { leftPinned, unpinned, rightPinned, all: normalized };
};

export const toSet = (value: any): Set<any> => {
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value);
    return new Set();
};

export const getColumnWidth = (column: TableColumn, defaultWidth: string | number = "auto") => {
    if (!column) return defaultWidth;
    return column.width || defaultWidth;
};

export const getColumnAlign = (column: TableColumn, defaultAlign: string = "left") => {
    if (!column) return defaultAlign as any;
    return column.align || defaultAlign as any;
};

export const hasGroupedColumns = (columns: TableColumn[]) => {
    if (!Array.isArray(columns)) return false;
    return columns.some((col) => col?.children && Array.isArray(col.children) && col.children.length > 0);
};

export const getMaxColumnDepth = (columns: TableColumn[]) => {
    if (!Array.isArray(columns)) return 1;
    return Math.max(...columns.map((col) => (col?.children && Array.isArray(col.children) && col.children.length > 0) ? 2 : 1), 1);
};
