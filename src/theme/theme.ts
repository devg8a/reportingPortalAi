import { createTheme, Theme } from "@mui/material/styles";

/**
 * App theme derived from Figma variables for node `87:2813`.
 * Primary: #006FEE
 * Neutrals: Gray/Zinc scale
 * Radius: 8
 */
export const appTheme: Theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#006FEE",
            light: "#CCE3FD",
            contrastText: "#FFFFFF",
        },
        success: {
            main: "#12B76A",
            dark: "#027A48",
        },
        error: {
            main: "#F04438",
            dark: "#B42318",
        },
        background: {
            default: "#F8F9FC", // Blue gray/50
            paper: "#FFFFFF",
        },
        text: {
            primary: "#181D27", // Gray/900
            secondary: "#717680", // Gray/500
        },
        divider: "#E9EAEB", // Gray/200
    },
    shape: {
        borderRadius: 8,
    },
    typography: {
        // Figma uses Inter. We keep a safe fallback stack.
        fontFamily: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial"].join(","),
    },
    shadows: [
        "none",
        "0px 1px 2px rgba(0,0,0,0.05)", // close to Shadow/xs
        ...Array(23).fill("none"),
    ] as Theme['shadows'],
    components: {
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundImage: "none",
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    borderRightColor: "#E9EAEB",
                },
            },
        },
    },
});
