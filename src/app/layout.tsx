import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { Roboto } from 'next/font/google';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import React from "react";
import { AppBar, Box, Container, IconButton, Toolbar, Typography } from "@mui/material";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AK Events tracker",
  description: "Events income tracker for arknights",
};

interface Props {
/*   tab: string;
  page: string;
  header?: React.ReactNode; */
  children: React.ReactNode;
}

const Layout = React.memo((props: Props) => {
  const { /* page, tab, */ children, /* header */ } = props;

  const createEmotionCache = () => {
    return createCache({ key: "css", prepend: true });
  };

  const clientSideEmotionCache = createEmotionCache();

  return (
    <html>
      <body className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable}`}>
        <AppRouterCacheProvider>
          {/* <CacheProvider value={clientSideEmotionCache}> */}
            <ThemeProvider theme={theme}>
              <AppBar position="sticky" sx={{ gridArea: "header" }}>
                <Toolbar variant="dense" sx={{ gap: 1 }}>
                  <Typography component="h1" variant="h5" noWrap sx={{ display: "inline", verticalAlign: "baseline" }}>
                    {String(metadata.title)}
                  </Typography>
                </Toolbar>
              </AppBar>
              {children}
            </ThemeProvider>
          {/* </CacheProvider> */}
        </AppRouterCacheProvider>
      </body>
    </html>
  );
});

Layout.displayName = "Layout";
export default Layout;
