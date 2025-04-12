'use client'
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, styled, Theme, useMediaQuery } from "@mui/material";
import React, { ReactElement } from "react";
import { ReactNode, useState } from "react";
import { Divider } from "@mui/material";

type CollapsibleDrawerProps = {
  open: boolean;
  onClose: () => void;
  children?: ReactNode;
};

// Add this type definition
type DrawerChildProps = {
  expanded?: boolean;
};

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  // Persistent on desktop
  [`& .MuiDrawer-paper`]: {
    position: "fixed",
    top: "64px", // Match AppBar height
    left: 0,
    width: "auto",
    height: "calc(100vh - 64px)",
    overflowX: "hidden",
    transition: theme.transitions.create("width", {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    whiteSpace: "nowrap",
    zIndex: 1200,
    // Desktop - collapsed by default
    [theme.breakpoints.up("md")]: {
      width: 65, // Icon-only width
      "&:hover": {
        width: 250, // Expanded width
      },
    },
    // Mobile - controlled by open prop
    [theme.breakpoints.down("md")]: {
      width: 240,
      display: "none",
      "&.MuiDrawer-paperAnchorLeft": {
        display: "block",
      },
    },
  },
}));

export const CollapsibleDrawer = ({ open, onClose, children }: CollapsibleDrawerProps) => {

  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"));
  const [forceExpanded, setForceExpanded] = useState(false);

  return (
    <StyledDrawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? open : true} // Always visible on desktop
      onClose={onClose}
      onMouseEnter={() => setForceExpanded(true)}
      onMouseLeave={() => setForceExpanded(false)}
      ModalProps={{ keepMounted: true }}
      sx={{
        display: isMobile ? (open ? "block" : "none") : "block",
      }}
    >
      <List>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            if (child.type === Divider) {
              return React.cloneElement(child);
            }
            else {
              return React.cloneElement(child as ReactElement<DrawerChildProps>, {
                // Force expanded state when drawer is opened via button
                expanded: (open || forceExpanded),
              });
            }
          }
          return child;
        })}
      </List>
    </StyledDrawer>
  );
};