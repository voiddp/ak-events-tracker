'use client';
import { createTheme, ThemeOptions } from '@mui/material/styles';

export const themeOptions: ThemeOptions = {
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
  typography: {
    fontFamily: `"Lato", sans-serif`,
  },
};

const theme = createTheme(themeOptions);


export default theme;