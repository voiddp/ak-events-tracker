import {
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    styled
} from "@mui/material";

interface DrawerListItemProps {
    icon: React.ReactNode;
    text: string;
    expanded?: boolean;
    onClick: () => void;
    // Add any other props you need to pass through
    [key: string]: any; // This allows additional props
}
const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
    minHeight: 48,
    justifyContent: "center", // Center when collapsed
    px: 2.5,
    [theme.breakpoints.up("md")]: {
        "&:hover": {
            justifyContent: "flex-start", // Align left when expanded
        },
    },
}));

export const DrawerListItem = ({ icon, text, expanded, onClick, ...props }: DrawerListItemProps) => {
    const showText = expanded; // Text shows when expanded via hover or prop

    return (
        <ListItem disablePadding {...props} onClick={onClick}>
            <StyledListItemButton >
                <ListItemIcon sx={{ minWidth: "auto", mr: expanded ? 3 : "auto" }}>
                    {icon}
                </ListItemIcon>
                {expanded && <ListItemText primary={text} />}
            </StyledListItemButton >
        </ListItem>
    );
};