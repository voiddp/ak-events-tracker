'use client'
/* import Image from "next/image"; */
import { Box, Button, colors, Divider, IconButton, List, ListItem, Paper, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useState } from "react";
import WebEventsDialog from "../components/WebEventsDialog";
import EventsTracker from "@/components/EventsTrackerMain";
import EventsTrackerDialog from "@/components/EventsTrackerDialog";
import useEvents from "../utils/hooks/useEvents";
import { NamedEvent, SubmitEventProps } from "@/lib/events/types";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import Head from "./Head";
import MenuIcon from '@mui/icons-material/Menu';
import { CollapsibleDrawer } from "@/components/Drawer/CollapsibleDrawer";
import { DrawerListItem } from "@/components/Drawer/DrawerListItem";
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import LogoDevIcon from '@mui/icons-material/LogoDev';
import SubmitEventDialog from "@/components/SubmitEventDialog";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import UpdateIcon from '@mui/icons-material/Update';
import { useEventsWebStorage } from "@/utils/hooks/useEventsWebStorage";
import { createEmptyNamedEvent } from "@/lib/events/utils";
import AcknowledgementDialog from "@/components/AcknowledgementDialog";
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

export default function Home() {

  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up("md"));

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsKroosterOpen, setEventsKroosterOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
  const [submitedEvent, setSubmitedEvent] = useState({ ...createEmptyNamedEvent() });
  const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();
  const [submitVariant, setSubmitVariant] = useState<"tracker" | "months">("months");

  const [eventsData, setEvents, submitEvent, , createDefaultEventsData] = useEvents();
  const { dataDefaults, lastUpdated, loading, error, fetchEventsFromStorage } = useEventsWebStorage();
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  ///
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleDrawerOpen = () => {
    setDrawerOpen((prev) => !prev);
  }

  const [forceUpdate, setForceUpdate] = useState(false);

  const handleAddItemsToDepot = (items: [string, number][]) => {
    console.log("adding to depot:", items);
  };
  const handleSubmitEvent = useCallback((submit: SubmitEventProps) => {
    const depotAddon = submitEvent(submit);
    if (depotAddon) {
      handleAddItemsToDepot(depotAddon);
    }
    setForceUpdate(true);
  }, [submitEvent]
  );

  const createEmotionCache = () => {
    return createCache({ key: "css", prepend: true });
  };
  const clientSideEmotionCache = createEmotionCache();

  const handleSetEventsFromDefaults = useCallback(() => {
    if (dataDefaults && dataDefaults.eventsData
      && Object.keys(dataDefaults.eventsData).length > 0) {
      setEvents(dataDefaults.eventsData);
      setForceUpdate(true);
    }
  }, [dataDefaults, setEvents]
  )

  const formatTimeAgo = (date: string) => {
    const timestamp = new Date(date).getTime();;
    const now = Date.now();
    const diffMs = Math.max(0, now - timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const result = (diffHours > 0 ? `${diffHours}h`
      : `${diffMinutes}m`) + (isMdUp ? " ago" : "");

    return result;
  }

  return (
    <CacheProvider value={clientSideEmotionCache}>
      <Head
        onClick={handleDrawerOpen}
        menuButton={<MenuIcon sx={{ display: { xs: "unset", md: "none" } }} />}
      > {lastUpdated &&
        <Tooltip title={`parsed prts.wiki ${!isMdUp ? formatTimeAgo(lastUpdated) + " ago" : ""}`}>
          <Stack direction="row" alignItems="center" fontSize="small">{isMdUp && formatTimeAgo(lastUpdated)}<UpdateIcon fontSize="small" /></Stack>
        </Tooltip>}
      </Head>
      <CollapsibleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <DrawerListItem
          icon={<TravelExploreIcon fontSize="large" />}
          text="Build from prts"
          onClick={() => {
            setEventsOpen(true);
            setTrackerOpen(false);
          }}
          sx={{ minWidth: "fit-content" }}
        />
        <DrawerListItem
          icon={<CalendarMonthIcon fontSize="large" />}
          text="Add months"
          onClick={() => {
            setSubmitedEvent({ ...createEmptyNamedEvent() });
            setSubmitVariant('months');
            setSubmitDialogOpen(true);
          }}
          sx={{ minWidth: "fit-content" }}
        />
        <DrawerListItem
          icon={<StorageIcon fontSize="large" />}
          text="Set defaults"
          onClick={handleSetEventsFromDefaults}
          sx={{ minWidth: "fit-content" }}
        />
        <Divider />
        <DrawerListItem
          icon={<VolunteerActivismIcon fontSize="large" />}
          text="Credits"
          onClick={() => setAcknowledgementsOpen(true)}
          sx={{ minWidth: "fit-content" }}
        />

        <Divider />
        <DrawerListItem
          icon={<LogoDevIcon fontSize="large" />}
          text="Krooster test..."
          onClick={() => {
            setEventsKroosterOpen(true);
          }}
          sx={{ minWidth: "fit-content" }} />
        {/* <DrawerListItem
          icon={<LogoDevIcon fontSize="large" />}
          text="fetch all test..."
          onClick={handleGetEverythingAtOnce} /> */}
        <Divider />
        <DrawerListItem
          icon={<DeleteIcon fontSize="large" />}
          text={"Reset Events"}
          onClick={() => {
            setEvents({});
            setForceUpdate(true);
          }}
          sx={{ minWidth: "fit-content", color: "rgb(248, 112, 97) " }} />

        {/* 
                <DrawerListItem icon={<SettingsIcon />} text="Settings" /> */}
        {/* Add more items or pass children */}
      </CollapsibleDrawer>
      <Box sx={{ flex: 1 }}>
        <Paper elevation={2}
          sx={{ height: "100%", maxWidth: "1200px", ml: { xs: "auto", md: "80px", xl: "auto" }, mr: "auto", /* pb: "20px" */ }}>
          <EventsTracker
            forceUpdate={forceUpdate}
            forceUpdateCallback={setForceUpdate}
            open={trackerOpen}
            onClose={() => setTrackerOpen(false)}
            eventsData={eventsData}
            onChange={setEvents}
            submitEvent={handleSubmitEvent}
          >
            <List>
              <ListItem>Input future events, using sidebar menu options, import, or manually.</ListItem>
              <ListItem ><Stack direction="row" gap={2} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSetEventsFromDefaults}
                  disabled={loading}
                  sx={{ minWidth: "fit-content" }}
                >Default&nbsp;List
                </Button> 6 months of upcoming events from prts.wiki sorted by date, updated daily.</Stack></ListItem>
              <ListItem ><Stack direction="row" gap={2} alignItems="center">
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => {
                    setEventsOpen(true);
                    setTrackerOpen(false);
                  }}
                  disabled={loading}
                  sx={{ minWidth: "fit-content" }}
                >CN&nbsp;Builder
                </Button>CN data and builder to add, combine or replace events in tracker list</Stack></ListItem>
            </List>
          </EventsTracker>
          <EventsTrackerDialog
            eventsData={eventsData}
            open={eventsKroosterOpen}
            onChange={setEvents}
            onClose={() => {
              setEventsKroosterOpen(false);
              setForceUpdate(true);
            }}
            openSummary={setSummaryOpen}
            submitEvent={handleSubmitEvent}
          />
          <WebEventsDialog
            open={eventsOpen}
            onClose={() => {
              setEventsOpen(false);
              setTrackerOpen(true);
            }}
            eventsData={eventsData}
            defaultList={dataDefaults?.webEventsData ?? {}}
            submitEvent={submitEvent}
          />
          <SubmitEventDialog
            open={submitDialogOpen}
            onClose={() => {
              setSubmitDialogOpen(false)
              setSubmitVariant('months');
            }}
            variant={submitVariant}
            onSubmit={handleSubmitEvent}
            submitedEvent={submitedEvent}
            eventsData={eventsData}
            selectedEvent={selectedEvent}
            onSelectorChange={setSelectedEvent}
          />
          <AcknowledgementDialog
            open={acknowledgementsOpen}
            onClose={() => setAcknowledgementsOpen(false)}
          />
        </Paper>
      </Box>
    </CacheProvider>);
}
