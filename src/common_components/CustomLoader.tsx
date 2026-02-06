import React from "react";
import { CircularProgress, SxProps, Theme } from "@mui/material";

export interface CustomLoaderProps {
  /**
   * MUI theme based colors only
   */
  color?:
    | "primary"
    | "secondary"
    | "error"
    | "info"
    | "success"
    | "warning"
    | "inherit";

  /**
   * Loader size
   */
  size?: number;

  /**
   * Custom styling (for white or any custom color)
   */
  sx?: SxProps<Theme>;
}

const CustomLoader: React.FC<CustomLoaderProps> = ({
  color = "inherit",
  size = 20,
  sx,
}) => {
  return (
    <CircularProgress
      color={color}
      size={size}
      sx={sx}
    />
  );
};

export default CustomLoader;