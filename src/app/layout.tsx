import "./globals.css";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import theme from "../theme";
import React from "react";
import { Box } from "@mui/material";
import styles from "./page.module.css";

interface Props {
  children: React.ReactNode;
}

const Layout = React.memo((props: Props) => {
  const { /* page, tab, */ children, /* header */ } = props;

  return (
    <html>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <Box className={styles.main} sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "auto" }}>
              {children}
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
});

Layout.displayName = "Layout";
export default Layout;
