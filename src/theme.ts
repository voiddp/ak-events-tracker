'use client'
import { createTheme, ThemeOptions, darken, lighten } from "@mui/material/styles";

declare module "@mui/material/styles" {
  interface Theme {
    status: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}
export const brand: Record<string, string> = {
  DEFAULT: "#FFD440",
}

const appTheme = (brandColor: string, light = false) => {
  return createTheme({
    breakpoints: {
      values: {
        xs: 0,
        sm: 640,
        md: 900,
        lg: 1200,
        xl: 1536,
      },
    },
    palette: {
      mode: 'dark',
      primary: {
        main: '#5893df',
      },
      secondary: {
        main: '#2ec5d3',
      },
      background: {
        default: '#192231',
        paper: '#24344d',
      },
    },
    components: {
      MuiAlert: {
        defaultProps: {
          variant: "outlined",
        },
      },
      MuiButtonBase: {
        styleOverrides: {
          root: {
            fontFamily: `"Lato", sans-serif`,
            "&.Mui-disabled": {
              color: "inherit",
              opacity: "0.38",
            },
            "&:not(._):not(._):not(.MuiButton-outlined)": {
              border: "none",
              margin: 0,
              "&.Mui-selected:not(.no-underline)": {
                borderBottomStyle: "solid",
                borderBottomWidth: "0.25rem",
                borderBottomColor: brandColor,
                backgroundColor: `${brandColor}28`,
                //color: light ? _neutral[50] : brandColor,
              },
            },
          },
        },
      },
      MuiButton: {
        defaultProps: {
          //variant: "neutral",
        },
        styleOverrides: {
          root: {
            textTransform: "none",
            minWidth: 0,
          },
        },
        variants: [
          {
            props:{  },
            style: {
              //color: _neutral[50],
             // backgroundColor: _neutral[700],
             // "&:hover": {
             //   background: lighten(_neutral[700], 0.1),
              //},
              transition: "background-color 0.1s",
            },
          },
          {
            props: { variant: "outlined" },
            style: {
              //color: light ? _neutral[50] : "",
              borderWidth: light ? "2px" : "",
            },
          },
        ],
      },
      MuiDialog: {
        defaultProps: {
          scroll: "body",
          PaperProps: {
            elevation: 1,
            sx: {
              width: "100%",
              marginX: 0,
            },
          },
        },
      },
      MuiDialogTitle: {
        defaultProps: {
          variant: "h2",
        },
        styleOverrides: {
          root: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 32,
            gap: 16,
          },
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: {
            padding: 16,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            paddingRight: "32px",
            paddingLeft: "16px",
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            "&.Mui-focused": {
              color: light ? "inherit" : "",
            },
          },
        },
      },
      MuiToggleButtonGroup: {
        defaultProps: {
          color: "primary",
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            padding: 8,
           //color: _neutral[50],
            //backgroundColor: _neutral[700],
            //"&:hover": {
            //  background: lighten(_neutral[700], 0.1),
            //},
            transition: "background-color 0.1s",
            "&:not(._):not(._):not(._)": {
              border: "none",
              margin: 0,
            },
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            //color: _neutral[50],
            //backgroundColor: _neutral[700],
          },
        },
      },
      MuiLink: {
        defaultProps: {
          color: "inherit",
          underline: "hover",
          fontFamily: `"Lato", sans-serif`,
        },
        styleOverrides: {
          root: {
            "&[aria-disabled='true']": {
             // color: _neutral[300],
              opacity: 0.8,
              pointerEvents: "none",
            },
          },
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 0,
        },
      },
    },
      typography: {
        allVariants: {
          fontFamily: `"Lato", sans-serif`,
        },
        caption: {
          margin: 0,
          fontWeight: 400,
          fontSize: "0.875rem",
          lineHeight: 1.66,
        },
            caption2: {
              margin: 0,
              fontWeight: 400,
              fontSize: "0.675rem",
              lineHeight: 1.66,
            },
            caption3: {
              margin: 0,
              fontWeight: 400,
              fontSize: "0.6rem",
            },
        h1: {
          fontSize: "4rem",
        },
        h2: {
          fontSize: "2rem",
          fontWeight: "normal",
        },
        h3: {
          fontSize: "1rem",
          lineHeight: 1,
          fontWeight: "normal",
          //color: _neutral[200],
          marginLeft: "8px",
        },
        h4: {
          fontSize: "0.875rem",
          lineHeight: 1,
          fontWeight: "normal",
          //color: _neutral[200],
          marginLeft: "8px",
        },
        h6: {
          fontWeight: "normal",
          fontSize: "0.875rem",
        },
      },
    });
  };

  const theme = appTheme(brand.DEFAULT);

  export default theme;

  declare module "@mui/material/styles" {
    interface TypeBackground {
      light: string;
    }
  
    interface TypographyVariants {
      caption2: React.CSSProperties;
      caption3: React.CSSProperties;
    }
  
    // allow configuration using `createTheme`
    interface TypographyVariantsOptions {
      caption2?: React.CSSProperties;
      caption3?: React.CSSProperties;
    }
  }
  
  declare module "@mui/material/Button" {
    interface ButtonPropsVariantOverrides {
      neutral: true;
    }
  }
  
  // Update the Typography's variant prop options
  declare module "@mui/material/Typography" {
    interface TypographyPropsVariantOverrides {
      caption2: true;
      caption3: true;
    }
  }
  
  export const interactive = {
    transition: "filter 0.1s, background-color 0.1s",
    ":hover": { filter: "brightness(110%)" },
  };
  
  export const focused = {
    boxShadow: "inset 0px 0px 0px 2px white",
  };