// Column width constants
export const COLUMN_WIDTHS = {
    SELECTION: "52px",
    EXPAND: "54px",
    DEFAULT: "auto",
};

// Expand trigger types
export const EXPAND_TRIGGERS = {
    NONE: "none",
    ICON: "icon",
    ROW: "row",
};

// Summary row positions
export const SUMMARY_ROW_POSITIONS = {
    TOP: "top",
    BOTTOM: "bottom",
} as const;

// Sort directions
export const SORT_DIRECTIONS = {
    ASC: "asc",
    DESC: "desc",
} as const;

// Badge color variants
export const BADGE_VARIANTS = {
    DEFAULT: "default",
    ERROR: "error",
    SUCCESS: "success",
    BLUE: "blue",
    ORANGE: "orange",
    BLUE_LIGHT: "blue-light",
};

// Filter types
export const FILTER_TYPES = {
    SEARCH: "search",
    DROPDOWN: "dropdown",
};

// Default messages
export const DEFAULT_MESSAGES = {
    NO_DATA: "No data available",
    ERROR_LOADING: "Error loading data",
    NO_COLUMNS_FOUND: "No columns found",
};

// Z-index values for sticky elements
export const Z_INDEX = {
    PINNED_COLUMN: 10,
    PINNED_CELL: 5,
    SEARCH_EXPANDED: 10,
};

// Drag and drop constants
export const DRAG_DROP = {
    EFFECT_ALLOWED: "move",
    DATA_TYPE: "text/html",
};

// Debounce delays (in milliseconds)
export const DEBOUNCE_DELAYS = {
    SEARCH: 400,
    COLUMN_FILTER: 500,
};

// Table type identifiers
export const TABLE_TYPES = {
    GROUPED: "grouped",
    USER_LIST: "userlist-table",
};
