import { createTheme } from '@mui/material/styles';

export const roundnet_karlsruhe_theme = createTheme({
  components: {
    MuiChip: {
      variants: [
        {
          props: {
            variant: 'outlined',
          },
          style: {
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            transition:
              'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&.Mui-disabled': {
              backgroundColor: 'rgba(247, 242, 247, 0.38)',
              color: '#e7e0eb',
              boxShadow: 'none',
            },
          },
        },
        {
          props: {
            variant: 'filled',
          },
          style: {
            borderRadius: '8px',
            transition:
              'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&.Mui-disabled': {
              backgroundColor: 'rgba(247, 242, 247, 0.38)',
              color: '#e7e0eb',
              boxShadow: 'none',
            },
          },
        },
      ],
    },
    MuiAlert: {
      defaultProps: {
        variant: 'standard',
      },
      styleOverrides: {
        root: {
          borderRadius: '20px',
        },
        standardError: {
          background: '#ffdad6',
          color: '#410002',
        },
        standardInfo: {
          background: '#d6e3ff',
          color: '#001b3d',
        },
        standardWarning: {
          background: '#ffdcc5',
          color: '#301400',
        },
        standardSuccess: {
          background: '#92f7bc',
          color: '#002111',
        },
        filledError: {
          background: '#ba1a1a',
          color: '#ffffff',
        },
        filledInfo: {
          background: '#125db2',
          color: '#ffffff',
        },
        filledWarning: {
          background: '#934b00',
          color: '#ffffff',
        },
        filledSuccess: {
          background: '#006d43',
          color: '#ffffff',
        },
        outlinedError: {
          color: '#ba1a1a',
        },
        outlinedInfo: {
          color: '#125db2',
        },
        outlinedWarning: {
          color: '#934b00',
        },
        outlinedSuccess: {
          color: '#006d43',
        },
      },
    },
    MuiFab: {
      defaultProps: {
        color: 'secondary',
      },
      styleOverrides: {
        root: {
          boxShadow:
            '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
          borderRadius: '18px',
        },
      },
      variants: [
        {
          props: {
            color: 'primary',
          },
          style: {
            '&:hover': {
              background: '#d5c9ee',
              boxShadow:
                '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
            },
            '&:focus': {
              background: '#ccc0e6',
              boxShadow:
                '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
            },
            '&:active': {
              background: '#ccc0e6',
              boxShadow:
                '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
            },
          },
        },
        {
          props: {
            color: 'secondary',
          },
          style: {
            '&:hover': {
              background: 'secondary',
              boxShadow:
                '0px 2px 4px -1px rgba(0,0,0,0.2),0px 4px 5px 0px rgba(0,0,0,0.14),0px 1px 10px 0px rgba(0,0,0,0.12)',
            },
            '&:focus': {
              background: 'secondary',
              boxShadow:
                '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
            },
            '&:active': {
              background: 'secondary',
              boxShadow:
                '0px 3px 3px -2px rgba(0,0,0,0.2),0px 3px 4px 0px rgba(0,0,0,0.14),0px 1px 8px 0px rgba(0,0,0,0.12)',
            },
          },
        },
      ],
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '30px',
          textTransform: 'none',
          fontWeight: 'bold',
          '&:has(>svg)': {
            padding: '8px',
            borderRadius: '50%',
            minWidth: '1em',
            minHeight: '1em',
          },
        },
      },
    },
    "MuiAppBar": {
      "defaultProps": {
        "elevation": 0
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '20px',
          padding: '10px 6px',
        },
      },
      variants: [
        {
          props: {
            variant: 'elevation',
          },
          style: {
            boxShadow:
              '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
            backgroundColor: '#ffffff',
            transition:
              'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&.Mui-disabled': {
              backgroundColor: 'rgba(247, 242, 247, 0.38)',
              color: '#e7e0eb',
              boxShadow: 'none',
            },
          },
        },
        {
          props: {
            variant: 'outlined',
          },
          style: {
            boxShadow: 'none',
            backgroundColor: '#fdf8fd',
            borderColor: '#7a757f',
            transition:
              'background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
            '&:hover': {
              background: '#eee9f2',
              boxShadow:
                '0px 2px 1px -1px rgba(0,0,0,0.2),0px 1px 1px 0px rgba(0,0,0,0.14),0px 1px 3px 0px rgba(0,0,0,0.12)',
            },
            '&:focus': {
              boxShadow: 'none',
              background: '#e7e1ed',
            },
            '&:active': {
              boxShadow:
                '0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12)',
              background: '#d4ced9',
            },
            '&.Mui-disabled': {
              borderColor: 'rgba(230, 225, 230, 0.12)',
              boxShadow: 'none',
            },
          },
        },
      ],
    },
    "MuiSwitch": {
      "styleOverrides": {
        "root": {
          "width": 42,
          "height": 26,
          "padding": 0,
          "marginLeft": 12,
          "marginRight": 8,
          "borderColor": "#847374",
          "& .MuiSwitch-switchBase": {
            "padding": 0,
            "margin": 7,
            "transitionDuration": "100ms",
            "&.Mui-checked": {
              "transform": "translateX(16px)",
              "margin": 4,
              "& + .MuiSwitch-track": {
                "backgroundColor": "#a23950",
                "opacity": 1,
                "border": 0
              },
              "& .MuiSwitch-thumb": {
                "color": "#ffffff",
                "width": 18,
                "height": 18
              },
              "&.Mui-disabled + .MuiSwitch-track": {
                "backgroundColor": "rgba(32, 26, 27, 0.1)"
              },
              "&.Mui-disabled .MuiSwitch-thumb": {
                "color": "rgba(255, 248, 247, 0.8)"
              }
            },
            "&.Mui-focusVisible .MuiSwitch-thumb": {
              "color": "#a23950",
              "border": "6px solid #ffffff"
            },
            "&.Mui-disabled .MuiSwitch-thumb": {
              "color": "rgba(32, 26, 27, 0.3)"
            }
          },
          "& .MuiSwitch-thumb": {
            "boxSizing": "border-box",
            "color": "#847374",
            "width": 12,
            "height": 12,
            "&:before": {
              "content": "''",
              "position": "absolute",
              "width": "100%",
              "height": "100%",
              "left": 0,
              "top": 0,
              "backgroundRepeat": "no-repeat",
              "backgroundPosition": "center"
            }
          },
          "& .MuiSwitch-track": {
            "borderRadius": 20,
            "border": "2px solid #847374",
            "backgroundColor": "#ece0e0",
            "opacity": 1,
            "transition": "background .2s"
          }
        }
      }
    },
    "MuiListItem": {
      "styleOverrides": {
        "root": {
          "paddingTop": 1,
          "paddingBottom": 1,
          "& .MuiListItemButton-root": {
            "paddingTop": 8,
            "paddingBottom": 8
          }
        }
      }
    },
    "MuiListItemButton": {
      "styleOverrides": {
        "root": {
          "borderRadius": 50,
          "color": "#49454e",
          "&:hover": {
            "backgroundColor": "#e1dce1",
            "color": "#45424a"
          },
          "&:active": {
            "backgroundColor": "#d6d2d8",
            "color": "#444048"
          },
          "&.Mui-selected": {
            "color": "#1e192b",
            "background": "#e8def8",
            "& > .MuiListItemText-root > .MuiTypography-root": {
              "fontWeight": "bold"
            },
            "&:hover": {
              "backgroundColor": "#d4cbe4",
              "color": "#2d283a"
            },
            "&:active": {
              "backgroundColor": "#cbc1da",
              "color": "#342f42"
            }
          }
        }
      }
    },
    "MuiListItemIcon": {
      "styleOverrides": {
        "root": {
          "color": "inherit",
          "minWidth": 32,
          "&.Mui-selected": {
            "fontWeight": "bold"
          }
        }
      }
    },
  },
  palette: {
    primary: {
      main: '#005b4a',
      light: '#337B6E',
      dark: '#003F33',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#590a00',
      light: '#7A3B33',
      dark: '#3E0700',
      contrastText: '#ffffff',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#C62828',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ed6c02',
      light: '#ff9800',
      dark: '#e65100',
      contrastText: '#fff'
    },
    info: {
      main: '#0288d1',
      light: '#03a9f4',
      dark: '#01579b',
      contrastText: '#fff'
    },
    success: {
      main: '#2e7d32',
      light: '#4caf50',
      dark: '#1b5e20',
      contrastText: '#fff'
    },
    divider: 'rgba(0,0,0,0.12)',
    mode: 'light',
  },
});
