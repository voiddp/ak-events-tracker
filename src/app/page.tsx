'use client'

/* import Image from "next/image"; */
import styles from "./page.module.css";
import { AppBar, Box, Button, Container, Paper, Toolbar, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import ScraperDialog from "./ScraperDialog";
import { defaultSettings, LocalStorageSettings, EventsData } from "../types/localStorageSettings";
import EventsTracker from "@/components/EventsTrackerDialog";
import useSettings from "../hooks/useSettings";

export default function Home() {

  const [settings, setSettings] = useSettings();

  const [eventsOpen, setEventsOpen] = useState(false);

  const handleOnChangeEventsTracker = useCallback((eventsData: EventsData) => {
    setSettings((s) => ({ ...s, eventsIncomeData: eventsData }));
  }, [setSettings]);

  return (
    <Box className={styles.page} sx={{pt: 1, pb: 0, minHeight: "80vh", gridTemplateRows: "1fr", gap: 1}}>
      <Container
        className={styles.main}
        id="app-main"
        component="main"
        maxWidth="lg"
        sx={{ p: { xs: 1, sm: 2 }, position: "relative", /* mb: "-1000px", pb: "1000px" */ }}
      >
        <Paper elevation={2}>
          <ScraperDialog
            open={eventsOpen}
            onClose={() => setEventsOpen(false)}
          />
          <EventsTracker
            eventsData={settings.eventsIncomeData}
            onChange={handleOnChangeEventsTracker}
          >
            <Button variant="contained"
              color="primary" onClick={() => setEventsOpen(true)}>scrap events list</Button>

          </EventsTracker>
        </Paper>
      </Container>
    </Box>
  );
}
