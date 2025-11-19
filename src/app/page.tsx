'use client'
/* import Image from "next/image"; */
import { Box, Button, colors, Divider, IconButton, List, ListItem, Paper, Stack, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import WebEventsDialog from "../components/webEvents/WebEventsDialog";
import EventsTracker from "@/components/EventsTrackerMain";
import EventsTrackerDialog from "@/components/EventsTrackerDialog";
import useEvents from "../utils/hooks/useEvents";
import { EventsSelectorProps, NamedEvent, SubmitEventProps, SubmitSource } from "@/lib/events/types";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import Head from "./Head";
import MenuIcon from '@mui/icons-material/Menu';
import { CollapsibleDrawer } from "@/components/drawer/CollapsibleDrawer";
import { DrawerListItem } from "@/components/drawer/DrawerListItem";
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import LogoDevIcon from '@mui/icons-material/LogoDev';
import SubmitEventDialog from "@/components/events/SubmitEventDialog";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import UpdateIcon from '@mui/icons-material/Update';
import useEventsDefaults from "@/utils/hooks/useEventsDefaults";
import { createEmptyNamedEvent } from "@/lib/events/utils";
import AcknowledgementDialog from "@/components/AcknowledgementDialog";
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import { SnackbarProvider, enqueueSnackbar } from 'notistack'
import ItemBase from "@/components/ItemBase";
import { formatNumber, getItemBaseStyling } from "@/utils/ItemUtils";
import ItemsSnackBar from "@/components/ItemsSnackBar"

declare module 'notistack' {
  interface VariantOverrides {
    items: {
      items: React.ReactNode
    };
  }
}

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
  const [submitSources, setSubmitSources] = useState<SubmitSource[]>(["months"]);

  const { eventsData, setEvents, submitEvent, toggleEvent } = useEvents();
  const { loading, trackerDefaults, fetchDefaults, toggleDefaultsEvent } = useEventsDefaults();
  const [acknowledgementsOpen, setAcknowledgementsOpen] = useState(false);
  ///
  const [drawerOpen, setDrawerOpen] = useState(false);
  /*   const [lastUpdated, setLastUpdated] = useState<string | Date>("")
   */
  /* useEffect(() => {
    fetchDefaults();
  }, []); */

  const handleDrawerOpen = () => {
    setDrawerOpen((prev) => !prev);
  }

  const [forceUpdate, setForceUpdate] = useState(false);

  const handleAddItemsToDepot = (items: [string, number][]) => {
    enqueueSnackbar(
      {
        variant: "items",
        message: "Krooster simulation: to Depot: +",
        autoHideDuration: 5000,
        items: itemElementsList(items),
      });

  };
  const itemElementsList = (items: [string, number][]) => {
    return (<>
      {items.map(([id, quantity], idx) => (
        <ItemBase
          key={`${id}${quantity === 0 && "-farm"}`}
          itemId={id} size={getItemBaseStyling("tracker").itemBaseSize}
        >
          <Typography {...getItemBaseStyling("tracker").numberCSS}>{quantity === 0 ? ["Ⅰ", "Ⅱ", "Ⅲ"][idx] : formatNumber(quantity)}</Typography>
        </ItemBase>
      ))}
    </>
    )

  }

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
    if (trackerDefaults && trackerDefaults.eventsData
      && Object.keys(trackerDefaults.eventsData).length > 0) {
      setEvents(trackerDefaults.eventsData);
      setForceUpdate(true);
    }
  }, [trackerDefaults, setEvents]
  );

  const getBuilderButton = (source?: SubmitSource) => {
    return (<Button
      variant="contained"
      size="small"
      onClick={() => {
        if (!source) {
          setSubmitSources(['defaults', "archiveIS", "archiveRA", 'months', 'events', 'defaultsWeb']);
        } else {
          setSubmitSources([source]);
        }
        setSubmitedEvent({ ...createEmptyNamedEvent() });
        setSubmitDialogOpen(true);
      }}
      sx={{ minWidth: "fit-content", whiteSpace: "nowrap" }}
    >Builder
    </Button>)
  };

  const getDefaultsButton = () => {
    return (<Button
      variant="contained"
      size="small"
      onClick={handleSetEventsFromDefaults}
      sx={{ minWidth: "fit-content", whiteSpace: "nowrap" }}
    >Defaults
    </Button>)
  };

  const formatTimeAgo = (date: string) => {
    const timestamp = new Date(date).getTime();;
    const now = Date.now();
    const diffMs = Math.max(0, now - timestamp);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const result = (diffHours > 0 ? `${diffHours}h`
      : `${diffMinutes}m`) + (isMdUp ? " ago" : "");

    return result;
  };

  return (
    <CacheProvider value={clientSideEmotionCache}>
      <SnackbarProvider maxSnack={3}
        Components={{
          items: ItemsSnackBar,
        }}>

        <Head
          onClick={handleDrawerOpen}
          menuButton={<MenuIcon sx={{ display: { xs: "unset", md: "none" } }} />}
        > {trackerDefaults.lastUpdated &&
          <Tooltip title={`parsed prts.wiki ${!isMdUp ? formatTimeAgo(trackerDefaults.lastUpdated) + " ago" : ""}`}>
            <Stack direction="row" alignItems="center" fontSize="small">{isMdUp && formatTimeAgo(trackerDefaults.lastUpdated)}<UpdateIcon fontSize="small" /></Stack>
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
            icon={<TravelExploreIcon fontSize="large" />}
            text="Build from..."
            onClick={() => {
              setSubmitedEvent({ ...createEmptyNamedEvent() });
              setSubmitSources(['defaults', "archiveIS", "archiveRA", 'months', 'events', 'defaultsWeb']);
              setSubmitDialogOpen(true);
            }}
            sx={{ minWidth: "fit-content" }}
          />
          <DrawerListItem
            icon={<CalendarMonthIcon fontSize="large" />}
            text="Add months"
            onClick={() => {
              setSubmitedEvent({ ...createEmptyNamedEvent() });
              setSubmitSources(['months']);
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
              trackerDefaults={trackerDefaults}
            >
              <List>
                <ListItem>Input future events, using sidebar menu options, import, or manually.</ListItem>
                <ListItem ><Stack direction="row" gap={2} alignItems="center">
                  {getDefaultsButton()} 6 months of upcoming events from prts.wiki sorted by date, updated daily.</Stack></ListItem>
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
                <ListItem ><Stack direction="row" gap={2} alignItems="center">
                  {getBuilderButton()} Builder to combine and merge events from different sources including RA & IS Archives</Stack></ListItem>
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
              trackerDefaults={trackerDefaults}
            />
            <WebEventsDialog
              open={eventsOpen}
              onClose={() => {
                setEventsOpen(false);
                setTrackerOpen(true);
              }}
              eventsData={eventsData}
              defaultList={trackerDefaults?.webEventsData ?? {}}
              submitEvent={submitEvent}
            />
            <SubmitEventDialog
              open={submitDialogOpen}
              allowedSources={submitSources}
              onClose={() => {
                setSubmitDialogOpen(false)
              }}
              onSubmit={handleSubmitEvent}
              submitedEvent={submitedEvent}
              eventsData={eventsData}
              trackerDefaults={trackerDefaults}
              selectedEvent={selectedEvent}
              onSelectorChange={setSelectedEvent}
            />
            <AcknowledgementDialog
              open={acknowledgementsOpen}
              onClose={() => setAcknowledgementsOpen(false)}
            />
          </Paper>
        </Box>
      </SnackbarProvider>
    </CacheProvider>);
}
