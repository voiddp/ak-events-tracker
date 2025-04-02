'use client'

/* import Image from "next/image"; */
import styles from "./page.module.css";
import { AppBar, Box, Button, Container, Paper, Toolbar, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import ScraperDialog from "../components/ScraperDialog";
import EventsTracker from "@/components/EventsTrackerMain";
import EventsTrackerDialog from "@/components/EventsTrackerDialog";
import useSettings from "../hooks/useSettings";
import useEvents from "../hooks/useEvents";

export default function Home() {

  const [settings, setSettings] = useSettings();

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsKroosterOpen, setEventsKroosterOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [eventsData, setEvents, submitEvent] = useEvents();
  ///
  const handleAddItemsToDepot = (items: [string, number][]) => {console.log("putDepot simulation: ",items)};
  
  return (
    //<Box flex={1} overflow="auto"/* sx={{pt: 1, pb: 0, minHeight: "80vh", gridTemplateRows: "1fr", gap: 1}} */>
    <Box sx={{ flex: 1, overflow: "auto" }}>
      <Paper elevation={2} sx={{ maxWidth: "1200px", ml: "auto", mr: "auto" }}> {/* sx={{flex:1, overflow:"auto"}} */}
        <EventsTracker
          open={trackerOpen}
          onClose={() => setTrackerOpen(false)}
          eventsData={eventsData}
          onChange={setEvents}
        >
          <Button variant="contained"
            color="primary" onClick={() => {
              setEventsOpen(true);
              setTrackerOpen(false)
            }}>
            Search CN events</Button>
          {/* <Button variant="contained"
          color="primary" onClick={() => {
            setEventsKroosterOpen(true);
          }}>Krooster Component</Button> */}

        </EventsTracker>
        <EventsTrackerDialog
        eventsData={eventsData}
        open={eventsKroosterOpen}
        onChange={setEvents}
        onClose={() => {
          setEventsKroosterOpen(false);
        }}
        openSummary={setSummaryOpen}
        putDepot={handleAddItemsToDepot}
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
      </Paper>
    </Box>
  );
}
