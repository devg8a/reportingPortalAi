import React from "react";
import { Box, Button, IconButton } from "@mui/material";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import SelectInput from "../../../common_components/SelectInput";

interface FiltersRowProps {
    // League/Group dropdown
    selectedLeague?: string;
    leagueOptions?: Array<{ label: string; value: string }>;
    onLeagueChange?: (value: string) => void;

    // Team/Entity dropdown
    selectedTeam?: string;
    teamOptions?: Array<{ label: string; value: string }>;
    onTeamChange?: (value: string) => void;
    renderTeamSelect?: () => React.ReactNode;

    // Actions
    onCopy?: () => void;
    onExport?: () => void;

    // Styling
    containerSx?: any;
    leagueLabel?: string;
    teamLabel?: string;

}

const FiltersRow: React.FC<FiltersRowProps> = ({
    selectedLeague = "All",
    leagueOptions = [{ label: "All", value: "All" }],
    onLeagueChange,

    selectedTeam = "All",
    teamOptions = [{ label: "All", value: "All" }],
    onTeamChange,
    renderTeamSelect,

    onCopy,
    onExport,
    leagueLabel = "League",
    teamLabel = "Team",
    containerSx = {}
}) => {
    return (
        <Box
            sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
                ...containerSx
            }}
        >
            {/* Left Side: Dropdowns */}
            <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                {/* League Dropdown */}
                <Box sx={{ minWidth: 150 }}>
                    <SelectInput
                        name="league"
                        label=""
                        placeholder={leagueLabel}
                        value={selectedLeague}
                        onChange={(e) => onLeagueChange?.(e.target.value)}
                        options={leagueOptions}
                    />

                </Box>

                {/* Team Dropdown */}
                <Box >
                    {renderTeamSelect ? (
                        renderTeamSelect()
                    ) : (
                        <SelectInput
                            name="team"
                            label=""
                            placeholder={teamLabel}
                            value={selectedTeam}
                            onChange={(e) => onTeamChange?.(e.target.value)}
                            options={teamOptions}
                        />

                    )}
                </Box>
            </Box>

            {/* Right Side: Actions */}
            <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                {/* Copy Button */}
                {onCopy && (
                    <IconButton
                        onClick={onCopy}
                        sx={{
                            width: 36,
                            height: 36,
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            bgcolor: "#fff",
                            "&:hover": {
                                bgcolor: "#f9fafb",
                                borderColor: "#d1d5db"
                            }
                        }}
                    >
                        <ContentCopyIcon sx={{ fontSize: 18, color: "#6b7280" }} />
                    </IconButton>
                )}

                {/* Export Button */}
                {onExport && (
                    <Button
                        onClick={onExport}
                        startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
                        sx={{
                            height: 36,
                            px: 2,
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            bgcolor: "#fff",
                            color: "#374151",
                            fontSize: "14px",
                            fontWeight: 500,
                            textTransform: "none",
                            "&:hover": {
                                bgcolor: "#f9fafb",
                                borderColor: "#d1d5db"
                            }
                        }}
                    >
                        Export
                    </Button>
                )}
            </Box>
        </Box>
    );
};

export default FiltersRow;
