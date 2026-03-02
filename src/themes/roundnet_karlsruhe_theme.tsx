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
  },
  breakpoints: {
    values: {
      xs: 400,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      main: '#005b4a',
      light: '#66bb6a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#590a00',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ba1a1a',
      contrastText: '#ffffff',
    },
    mode: 'light',
  },
});
