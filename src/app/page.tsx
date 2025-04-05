'use client'

/* import Image from "next/image"; */
import { Box, Button, Paper } from "@mui/material";
import { useCallback, useState } from "react";
import ScraperDialog from "../components/ScraperDialog";
import EventsTracker from "@/components/EventsTrackerMain";
import EventsTrackerDialog from "@/components/EventsTrackerDialog";
import useEvents from "../utils/hooks/useEvents";
import { SubmitEventProps } from "@/types/events";

export default function Home() {

  const [eventsOpen, setEventsOpen] = useState(false);
  const [eventsKroosterOpen, setEventsKroosterOpen] = useState(false);
  const [trackerOpen, setTrackerOpen] = useState(true);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [eventsData, setEvents, submitEvent] = useEvents();
  ///

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

  return (
    //<Box flex={1} overflow="auto"/* sx={{pt: 1, pb: 0, minHeight: "80vh", gridTemplateRows: "1fr", gap: 1}} */>
    <Box sx={{ flex: 1, overflow: "auto" }}>
      <Paper elevation={2} sx={{ maxWidth: "1200px", ml: "auto", mr: "auto" }}> {/* sx={{flex:1, overflow:"auto"}} */}
        <EventsTracker
          forceUpdate={forceUpdate}
          forceUpdateCallback={setForceUpdate}
          open={trackerOpen}
          onClose={() => setTrackerOpen(false)}
          eventsData={eventsData}
          onChange={setEvents}
          submitEvent={handleSubmitEvent}
        >
          <Button variant="contained"
            color="primary" onClick={() => {
              setEventsOpen(true);
              setTrackerOpen(false)
            }}>
            Search CN events</Button>
          <Button variant="contained"
            color="primary" onClick={() => {
              setEventsKroosterOpen(true);
            }}>Krooster Component Check...</Button>

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
      </Paper>
    </Box>
  );
}
