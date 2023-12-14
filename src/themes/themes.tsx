import { createTheme } from "@mui/material";

export const mainTheme = createTheme({
    components: {
        "MuiAlert": {
            "defaultProps": {
                "variant": "standard"
            },
            "styleOverrides": {
                "root": {
                    "borderRadius": "20px"
                },
                "standardError": {
                    "background": "#ffdad6",
                    "color": "#410002"
                },
                "standardInfo": {
                    "background": "#d6e3ff",
                    "color": "#001b3d"
                },
                "standardWarning": {
                    "background": "#ffdcc5",
                    "color": "#301400"
                },
                "standardSuccess": {
                    "background": "#92f7bc",
                    "color": "#002111"
                },
                "filledError": {
                    "background": "#ba1a1a",
                    "color": "#ffffff"
                },
                "filledInfo": {
                    "background": "#125db2",
                    "color": "#ffffff"
                },
                "filledWarning": {
                    "background": "#934b00",
                    "color": "#ffffff"
                },
                "filledSuccess": {
                    "background": "#006d43",
                    "color": "#ffffff"
                },
                "outlinedError": {
                    "color": "#ba1a1a"
                },
                "outlinedInfo": {
                    "color": "#125db2"
                },
                "outlinedWarning": {
                    "color": "#934b00"
                },
                "outlinedSuccess": {
                    "color": "#006d43"
                }
            }
        },
        "MuiFab": {
            "defaultProps": {
                "color": "secondary"
            },
            "styleOverrides": {
                "root": {
                    "boxShadow": "0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)",
                    "borderRadius": "18px"
                }
            },
            "variants": [
                {
                    "props": {
                        "color": "primary"
                    },
                    "style": {
                        "backgroundColor": "#e9ddff",
                        "color": "#22005d",
                        "&:hover": {
                            "background": "#d5c9ee",
                            "boxShadow": "0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)"
                        },
                        "&:active": {
                            "background": "#ccc0e6",
                            "boxShadow": "0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)"
                        }
                    }
                },
                {
                    "props": {
                        "color": "secondary"
                    },
                    "style": {
                        "backgroundColor": "#e8def8",
                        "color": "#1e192b",
                        "&:hover": {
                            "background": "#d4cbe4",
                            "boxShadow": "0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)"
                        },
                        "&:active": {
                            "background": "#cbc1da",
                            "boxShadow": "0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)"
                        }
                    }
                },
            ]
        },
    },
    palette: {
        primary: {
            main: "#00866C"
        },
        secondary: {
            main: "#741E0E"
        },
        mode: "light"
    }
});