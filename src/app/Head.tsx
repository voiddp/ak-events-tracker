import { AppBar, Stack, Toolbar, Typography, useMediaQuery, useTheme } from "@mui/material";
import { metadata } from "./metadata";
import React from "react";

interface Props {
    menuButton?: React.ReactNode;
    children?: React.ReactNode;
    onClick: () => void;
}

const Head = React.memo((props: Props) => {
    const { menuButton, children, onClick } = props;
    const theme = useTheme();
    const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

    const handleOnClick = () => {
        if (isMdUp) return;
        onClick();
    }
    return (
        <AppBar position="sticky" sx={{ gridArea: "header" }}>
            <Toolbar variant="dense" sx={{ gap: 1 }}>
                <Stack direction="row" alignItems="center" gap={1}
                    sx={{
                        transition: isMdUp ? "unset"
                            : "opacity 0.1s",
                        "&:focus, &:hover": {
                            opacity: isMdUp ? 1 : 0.5,
                        }
                    }}
                    onClick={handleOnClick}>
                    {menuButton}
                    <Typography component="h1" variant="h5" noWrap sx={{ display: "inline", verticalAlign: "baseline" }}>
                        {String(metadata.title)}
                    </Typography>
                </Stack>
                <Stack direction="row" gap={1}>
                    {children}
                </Stack>
            </Toolbar>
        </AppBar>
    );
});

Head.displayName = "Head";
export default Head;