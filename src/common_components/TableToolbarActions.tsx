import React, { useState, useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import InputBase from "@mui/material/InputBase";
import CloseIcon from "@mui/icons-material/Close";
import { useLayout } from "../contexts/LayoutContext";
import { Z_INDEX } from "./tableConstants";

interface TableToolbarActionsProps {
    onSearch?: (evt: any) => void;
    onSearchChange?: (text: string) => void;
    showSearch?: boolean;
    showRows?: boolean;
    showFullScreen?: boolean;
    searchValue?: string;
    enableColumnVisibility?: boolean;
    onColumnVisibilityClick?: (event: React.MouseEvent<HTMLElement>) => void;
    enableColumnFilters?: boolean;
    showFilterRow?: boolean;
    onFilterRowToggle?: () => void;
    onExpandClick?: () => void;
    onDensityChange?: () => void;
    showExpand?: boolean;
    customActions?: React.ReactNode;
}

function TableToolbarActions({
    onSearch,
    onSearchChange,
    showSearch,
    showRows,
    showFullScreen = true,
    searchValue = "",
    enableColumnVisibility = false,
    onColumnVisibilityClick,
    enableColumnFilters = false,
    showFilterRow = false,
    onFilterRowToggle,
}: TableToolbarActionsProps) {
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [searchText, setSearchText] = useState(searchValue || "");
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    // @ts-ignore - Context typing might be missing
    const { isFullScreen, toggleFullScreen, isDense, toggleDensity } = useLayout();

    // Handle search text changes
    useEffect(() => {
        if (onSearchChange) {
            onSearchChange(searchText);
        }
    }, [searchText, onSearchChange]);

    // Handle click outside search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target as Node) &&
                isSearchExpanded
            ) {
                if (searchText.length === 0) {
                    setIsSearchExpanded(false);
                }
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isSearchExpanded, searchText]);

    // Focus input when expanded
    useEffect(() => {
        if (isSearchExpanded && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchExpanded]);

    const handleSearchIconClick = () => {
        setIsSearchExpanded(true);
    };

    const handleSearchClose = () => {
        setSearchText("");
        setIsSearchExpanded(false);
        if (onSearchChange) {
            onSearchChange("");
        }
    };

    // Auto-detect button visibility if not explicitly set
    const shouldShowSearch = showSearch || !!onSearch;
    const shouldShowRows = Boolean(showRows);

    return (
        <Box
            className="table-toolbar-actions"
            sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flex: 1,
                justifyContent: "flex-end",
            }}
        >
            {/* Actions Group */}
            {(shouldShowSearch || shouldShowRows || showFullScreen || enableColumnVisibility || enableColumnFilters) && (
                <Box
                    className="table-toolbar-button-group"
                    sx={{
                        position: "relative",
                        overflow: isSearchExpanded ? "visible" : "hidden",
                    }}
                >
                    {/* Search Bar - Expandable */}
                    {shouldShowSearch && (
                        <Box
                            ref={searchContainerRef}
                            className={`table-toolbar-search-container ${isSearchExpanded ? "table-toolbar-search-expanded" : ""
                                }`}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                borderRight: !isSearchExpanded ? "1px solid #e9eaeb" : "none",
                                borderRadius: isSearchExpanded ? "8px" : 0,
                                px: isSearchExpanded ? 1 : 0,
                                transition: "all 0.3s ease",
                                width: isSearchExpanded ? "300px" : "auto",
                                minWidth: isSearchExpanded ? "300px" : "auto",
                                bgcolor: isSearchExpanded ? "background.paper" : "transparent",
                                position: isSearchExpanded ? "absolute" : "relative",
                                left: isSearchExpanded ? 0 : "auto",
                                top: isSearchExpanded ? 0 : "auto",
                                zIndex: isSearchExpanded ? Z_INDEX.SEARCH_EXPANDED : 1,
                                boxShadow: isSearchExpanded ? "0px 1px 2px 0px rgba(10, 13, 18, 0.05)" : "none",
                                border: isSearchExpanded ? "1px solid #e9eaeb" : "none",
                            }}
                        >
                            {!isSearchExpanded ? (
                                <IconButton
                                    className="table-toolbar-button"
                                    onClick={handleSearchIconClick}
                                    size="small"
                                    title="Search"
                                >
                                    <svg width="17" height="17" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 12.5 9.6 9.6m1.567-3.767a5.333 5.333 0 1 1-10.667 0 5.333 5.333 0 0 1 10.667 0" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </IconButton>
                            ) : (
                                <>
                                    <div className="d-flex pd-custom">
                                        <svg width="17" height="17" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5 12.5 9.6 9.6m1.567-3.767a5.333 5.333 0 1 1-10.667 0 5.333 5.333 0 0 1 10.667 0" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </div>
                                    <InputBase
                                        inputRef={searchInputRef}
                                        placeholder="Search..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        sx={{
                                            flex: 1,
                                            fontSize: "0.875rem",
                                            "& input": {
                                                py: 0.5,
                                            },
                                        }}
                                    />
                                    {searchText && (
                                        <IconButton
                                            size="small"
                                            className="search-close-icon"
                                            onClick={handleSearchClose}
                                            sx={{ ml: 0.5 }}
                                        >
                                            <CloseIcon fontSize="small" sx={{ strokeWidth: 1 }} />
                                        </IconButton>
                                    )}
                                </>
                            )}
                        </Box>
                    )}
                    {/* Other Actions - Only show when search is not expanded */}
                    {!isSearchExpanded && (
                        <>

                            {enableColumnVisibility && (
                                <div className="table-toolbar-search-container stroke-none">
                                    <IconButton
                                        className="table-toolbar-button"
                                        size="small"
                                        title="Column Visibility"
                                        onClick={onColumnVisibilityClick}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M3.3335 10.8333C3.05735 10.8333 2.8335 11.0572 2.8335 11.3333C2.8335 11.6095 3.05735 11.8333 3.3335 11.8333V11.3333V10.8333ZM7.3335 11.8333C7.60964 11.8333 7.8335 11.6095 7.8335 11.3333C7.8335 11.0572 7.60964 10.8333 7.3335 10.8333V11.3333V11.8333ZM5.8335 9.33333C5.8335 9.05719 5.60964 8.83333 5.3335 8.83333C5.05735 8.83333 4.8335 9.05719 4.8335 9.33333H5.3335H5.8335ZM4.8335 13.3333C4.8335 13.6095 5.05735 13.8333 5.3335 13.8333C5.60964 13.8333 5.8335 13.6095 5.8335 13.3333H5.3335H4.8335ZM9.3335 13.5C9.05735 13.5 8.8335 13.7239 8.8335 14C8.8335 14.2761 9.05735 14.5 9.3335 14.5V14V13.5ZM6.8335 7.33333C6.8335 7.60948 7.05735 7.83333 7.3335 7.83333C7.60964 7.83333 7.8335 7.60948 7.8335 7.33333H7.3335H6.8335ZM3.3335 11.3333V11.8333H5.3335V11.3333V10.8333H3.3335V11.3333ZM5.3335 11.3333V11.8333H7.3335V11.3333V10.8333H5.3335V11.3333ZM5.3335 9.33333H4.8335V11.3333H5.3335H5.8335V9.33333H5.3335ZM5.3335 11.3333H4.8335V13.3333H5.3335H5.8335V11.3333H5.3335ZM9.3335 14V14.5H10.0002V14V13.5H9.3335V14ZM10.0002 2V1.5H8.66683V2V2.5H10.0002V2ZM7.3335 3.33333H6.8335V7.33333H7.3335H7.8335V3.33333H7.3335ZM8.66683 2V1.5C7.65431 1.5 6.8335 2.32081 6.8335 3.33333H7.3335H7.8335C7.8335 2.8731 8.20659 2.5 8.66683 2.5V2ZM11.3335 3.33333H11.8335C11.8335 2.32081 11.0127 1.5 10.0002 1.5V2V2.5C10.4604 2.5 10.8335 2.8731 10.8335 3.33333H11.3335ZM10.0002 14V14.5C11.0127 14.5 11.8335 13.6792 11.8335 12.6667H11.3335H10.8335C10.8335 13.1269 10.4604 13.5 10.0002 13.5V14ZM11.3335 12.6667H11.8335V3.33333H11.3335H10.8335V12.6667H11.3335Z" fill="#3F3F46" />
                                        </svg>
                                    </IconButton>
                                </div>
                            )}
                            {enableColumnFilters && (
                                <div className="table-toolbar-search-container ">
                                    <IconButton
                                        className={`table-toolbar-button ${showFilterRow ? "active" : ""}`}
                                        size="small"
                                        title="Column Filters"
                                        onClick={onFilterRowToggle}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                            <path d="M9.33317 7.33337H5.33317M6.6665 10H5.33317M10.6665 4.66671H5.33317M13.3332 7.00004V4.53337C13.3332 3.41327 13.3332 2.85322 13.1152 2.42539C12.9234 2.04907 12.6175 1.74311 12.2412 1.55136C11.8133 1.33337 11.2533 1.33337 10.1332 1.33337H5.8665C4.7464 1.33337 4.18635 1.33337 3.75852 1.55136C3.3822 1.74311 3.07624 2.04907 2.88449 2.42539C2.6665 2.85322 2.6665 3.41327 2.6665 4.53337V11.4667C2.6665 12.5868 2.6665 13.1469 2.88449 13.5747C3.07624 13.951 3.3822 14.257 3.75852 14.4487C4.18635 14.6667 4.7464 14.6667 5.8665 14.6667H7.6665M14.6665 14.6667L13.6665 13.6667M14.3332 12C14.3332 13.2887 13.2885 14.3334 11.9998 14.3334C10.7112 14.3334 9.6665 13.2887 9.6665 12C9.6665 10.7114 10.7112 9.66671 11.9998 9.66671C13.2885 9.66671 14.3332 10.7114 14.3332 12Z" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </IconButton>
                                </div>
                            )}
                            <div className="table-toolbar-search-container">
                                {shouldShowRows && (
                                    <IconButton
                                        className="table-toolbar-button"
                                        size="small"
                                        title="Columns"
                                        onClick={toggleDensity}
                                    >
                                        {!isDense ? (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 6h12M2 10h12M5.2 2h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C14 3.52 14 4.08 14 5.2v5.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C12.48 14 11.92 14 10.8 14H5.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C2 12.48 2 11.92 2 10.8V5.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C3.52 2 4.08 2 5.2 2" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 8h12M5.2 2h5.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C14 3.52 14 4.08 14 5.2v5.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C12.48 14 11.92 14 10.8 14H5.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C2 12.48 2 11.92 2 10.8V5.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C3.52 2 4.08 2 5.2 2" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        )}
                                    </IconButton>
                                )}
                            </div>
                            <div className="table-toolbar-search-container">
                                {showFullScreen && (
                                    <IconButton
                                        className={`table-toolbar-button table-toolbar-button-last ${isFullScreen ? 'table-expand-view' : 'table-not-expand-view'}`}
                                        onClick={toggleFullScreen}
                                        size="small"
                                        title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                                    >
                                        {isFullScreen ? (
                                            <svg className="munim-button-svg-group" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.3 14.9v-1.76c0-1.344 0-2.016.262-2.53a2.4 2.4 0 0 1 1.048-1.048c.514-.262 1.186-.262 2.53-.262h1.76m0-8.8-4.8 4.8m0 0h4.8m-4.8 0V.5M.5 14.9l4.8-4.8m0 0H.5m4.8 0v4.8M.5 6.1h1.76c1.344 0 2.016 0 2.53-.262A2.4 2.4 0 0 0 5.838 4.79c.262-.514.262-1.186.262-2.53V.5" stroke="#3f3f46" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                <path d="M14 9.33333V10.8C14 11.9201 14 12.4802 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.4802 14 11.9201 14 10.8 14H9.33333M6.66667 2H5.2C4.0799 2 3.51984 2 3.09202 2.21799C2.71569 2.40973 2.40973 2.71569 2.21799 3.09202C2 3.51984 2 4.0799 2 5.2V6.66667M10 6L14 2M14 2H10M14 2V6M6 10L2 14M2 14H6M2 14L2 10" stroke="#3F3F46" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </IconButton>
                                )}
                            </div>
                        </>
                    )}
                </Box>
            )}
        </Box >
    );
} export default TableToolbarActions;
