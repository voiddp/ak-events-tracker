import { AppBar, IconButton, Stack, Toolbar, Typography } from "@mui/material";
import { metadata } from "./metadata";
import React, { useState } from "react";

interface Props {
    menuButton?: React.ReactNode;
    children?: React.ReactNode;
}

const Head = React.memo((props: Props) => {
    const { menuButton, children } = props;

    return (
        <AppBar position="sticky" sx={{ gridArea: "header" }}>
            <Toolbar variant="dense" sx={{ gap: 1 }}>
            {menuButton}
                <Typography component="h1" variant="h5" noWrap sx={{ display: "inline", verticalAlign: "baseline" }}>
                    {String(metadata.title)}
                </Typography>
                <Stack direction="row" gap={1}>
                    {children}
                </Stack>
            </Toolbar>
        </AppBar>
    );
});

Head.displayName = "Head";
export default Head;