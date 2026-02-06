import React from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

interface PaginationProps {
    currentPage?: number;
    totalPages?: number;
    onPageChange?: (page: number) => void;
    maxVisiblePages?: number;
    totalEntries?: number;
    itemsPerPage?: number;
    showEntriesMessage?: boolean;
}

export default function Pagination({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    maxVisiblePages = 5,
    totalEntries,
    itemsPerPage = 10,
    showEntriesMessage = true,
}: PaginationProps) {
    if (totalPages <= 1) return null;

    // Calculate entries message
    const getEntriesMessage = () => {
        if (!showEntriesMessage || totalEntries === undefined) return null;
        
        const startEntry = (currentPage - 1) * itemsPerPage + 1;
        const endEntry = Math.min(currentPage * itemsPerPage, totalEntries);
        
        return `Showing ${startEntry} to ${endEntry} of ${totalEntries} entries`;
    };

    const entriesMessage = getEntriesMessage();

    const handlePrevious = () => {
        if (currentPage > 1 && onPageChange) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages && onPageChange) {
            onPageChange(currentPage + 1);
        }
    };

    const handlePageClick = (page: number) => {
        if (onPageChange && page !== currentPage) {
            onPageChange(page);
        }
    };

    // Calculate which page numbers to show
    const getVisiblePages = () => {
        const pages: (number | string)[] = [];
        const halfVisible = Math.floor(maxVisiblePages / 2);

        let startPage = Math.max(1, currentPage - halfVisible);
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start if we're near the end
        if (endPage - startPage < maxVisiblePages - 1) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        // Add ellipsis if needed
        if (startPage > 1) {
            if (startPage > 2) {
                pages.unshift("...");
            }
            pages.unshift(1);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                pages.push("...");
            }
            pages.push(totalPages);
        }

        return pages;
    };

    const visiblePages = getVisiblePages();
    const isPreviousDisabled = currentPage === 1;
    const isNextDisabled = currentPage === totalPages;

    return (
        <Box className="pagination-container">
            {/* Entries Message */}
            {entriesMessage && (
                <Box className="pagination-entries-message">
                    <Typography className="pagination-entries-text">
                        {entriesMessage}
                    </Typography>
                </Box>
            )}

            {/* Pagination Controls */}
            <Box className="pagination-controls">
                {/* Previous Button */}
                <Box className="pagination-button-wrapper">
                    <Box
                        component="button"
                        className={`pagination-nav-button ${isPreviousDisabled ? "pagination-nav-button-disabled" : ""}`}
                        onClick={handlePrevious}
                        disabled={isPreviousDisabled}
                    >
                        
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.8332 10.0001H4.1665M4.1665 10.0001L9.99984 15.8334M4.1665 10.0001L9.99984 4.16675" stroke="#414651" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>

                        <Typography className="pagination-nav-text">Previous</Typography>
                    </Box>
                </Box>

                {/* Page Numbers */}
                <Box className="pagination-numbers">
                    {visiblePages.map((page, index) => {
                        if (page === "...") {
                            return (
                                <Box key={`ellipsis-${index}`} className="pagination-number-base">
                                    <Box className="pagination-number-content">
                                        <Typography className="pagination-number-text-ellipsis">
                                            ...
                                        </Typography>
                                    </Box>
                                </Box>
                            );
                        }

                        const isActive = page === currentPage;
                        const pageNum = page as number;

                        return (
                            <Box
                                key={page}
                                className={`pagination-number-base ${isActive ? "pagination-number-active" : ""}`}
                                onClick={() => handlePageClick(pageNum)}
                            >
                                <Box className="pagination-number-content">
                                    <Typography
                                        className={`pagination-number-text ${isActive ? "pagination-number-text-active" : ""}`}
                                    >
                                        {page}
                                    </Typography>
                                </Box>
                            </Box>
                        );
                    })}
                </Box>

                {/* Next Button */}
                <Box className="pagination-button-wrapper">
                    <Box
                        component="button"
                        className={`pagination-nav-button ${isNextDisabled ? "pagination-nav-button-disabled" : ""}`}
                        onClick={handleNext}
                        disabled={isNextDisabled}
                    >
                        <Typography className="pagination-nav-text">Next</Typography>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.167 10h11.666m0 0L10 4.167M15.833 10 10 15.833" stroke="#414651" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
