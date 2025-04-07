'use client'
/* import Image from "next/image"; */
import { Box, Button, colors, Divider, IconButton, Paper, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import ScraperDialog from "../components/ScraperDialog";
import EventsTracker from "@/components/EventsTrackerMain";
import EventsTrackerDialog from "@/components/EventsTrackerDialog";
import useEvents from "../utils/hooks/useEvents";
import { emptyNamedEvent, NamedEvent, SubmitEventProps } from "@/lib/events/types";
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
import { usePrtsWiki } from "@/lib/prtsWiki/client";
import { useEventsWebStorage } from "@/utils/hooks/useEventsWebStorage";

export default function Home() {

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsKroosterOpen, setEventsKroosterOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [submitDialogOpen, setSubmitDialogOpen] = useState<boolean>(false);
  const [handledEvent, setHandledEvent] = useState({ ...emptyNamedEvent });
  const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();
  const [submitVariant, setSubmitVariant] = useState<"tracker" | "months">("months");

  const [eventsData, setEvents, submitEvent,,createDefaultEventsData] = useEvents();
  const { webEvents, getEverythingAtOnce } = usePrtsWiki();
  const { data, lastUpdated, loading, error, fetchEventsFromStorage } = useEventsWebStorage();
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

  const handleGetEverythingAtOnce = async () => {
    /* const data = await getEverythingAtOnce(3); */
    const data = createDefaultEventsData(webEvents);
    console.log("data", Object.entries(data).sort(([,a],[,b]) => a.index - b.index ));
  }
  const handleFetchEventsFromStorage = async () => {
  const result = await fetchEventsFromStorage();
  if (!result) return;
  const { data, lastUpdated } = result;
  console.log("fetched data:",lastUpdated, data);
  }
  
  return (
    <CacheProvider value={clientSideEmotionCache}>
      <Head
        onClick={handleDrawerOpen}
        menuButton={<MenuIcon sx={{ display: { xs: "unset", md: "none" } }} />}
      > 
      <Button 
        variant="contained" 
        onClick={handleFetchEventsFromStorage}
        disabled={loading}
      >
        {'Fetch Defaults (console.log)'}
      </Button>
      </Head>
      <CollapsibleDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <DrawerListItem
          icon={<TravelExploreIcon fontSize="large" />}
          text="Search PRTS events"
          onClick={() => {
            setEventsOpen(true);
            setTrackerOpen(false);
          }}
        />
        <DrawerListItem
          icon={<CalendarMonthIcon fontSize="large" />}
          text="Add months"
          onClick={() => {
            setHandledEvent({ ...emptyNamedEvent });
            setSubmitVariant('months');
            setSubmitDialogOpen(true);
          }}
        />
        <Divider />
        <DrawerListItem
          icon={<LogoDevIcon fontSize="large" />}
          text="Krooster test..."
          onClick={() => {
            setEventsKroosterOpen(true);
          }} />
        <DrawerListItem
          icon={<LogoDevIcon fontSize="large" />}
          text="fetch all test..."
          onClick={handleGetEverythingAtOnce} />
        <Divider />
        <DrawerListItem
          icon={<DeleteIcon fontSize="large" />}
          text={"Reset Events"}
          onClick={() => {
            setEvents({});
            setForceUpdate(true);
          }}
          sx={{ color: "rgb(248, 112, 97) " }} />

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
          </EventsTracker>
          <EventsTrackerDialog
            eventsData={eventsData}
            open={eventsKroosterOpen}
            onChange={setEvents}
            onClose={() => {
              setEventsKroosterOpen(false);
            }}
            openSummary={setSummaryOpen}
            submitEvent={handleSubmitEvent}
          />
          <ScraperDialog
            open={eventsOpen}
            onClose={() => {
              setEventsOpen(false);
              setTrackerOpen(true)
            }}
            eventsData={eventsData}
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
            handledEvent={handledEvent}
            eventsData={eventsData}
            selectedEvent={selectedEvent}
            onSelectorChange={setSelectedEvent}
          />
        </Paper>
      </Box>
    </CacheProvider>);
}
