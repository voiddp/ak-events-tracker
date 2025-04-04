import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box, DialogActions, Stack, IconButton, TextField, Link, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { WebEventsData, Event, EventsData, NamedEvent, WebEvent, SubmitEventProps } from '../types/events'
import { usePrtsWiki } from '../utils/hooks/usePrtsWiki';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ItemBase from '@/components/ItemBase';
import itemsJson from '../data/items.json';
import AddEventToDepotDialog from '@/components/SubmitEventDialog';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { getWidthFromValue, formatNumber, standardItemsSort, getItemBaseStyling, isTier3Material } from '@/utils/ItemUtils'
import { Close, Fullscreen } from "@mui/icons-material";


interface Props {
  open: boolean;
  onClose: () => void;
  eventsData: EventsData;
  submitEvent: (submit: SubmitEventProps) => void;
}

const ScraperDialog = React.memo((props: Props) => {
  const { open, onClose, eventsData, submitEvent } = props;
  const { webEvents, setWebEvents, error, loading, getEventList, getDataFromPage, ProgressElement } = usePrtsWiki();

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [rawWebEvents, setRawWebEvents] = useState<WebEventsData>({});
  const [monthsAgo, setMonthsAGo] = useState(6);

  const [addEventToDepotDialogOpen, setAddEventToDepotDialogOpen] = useState<boolean>(false);
  const [handledEvent, setHandledEvent] = useState({
    index: -1,
    name: "" as string,
    materials: {} as Record<string, number>,
    farms: [] as string[],
  });
  const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();

  useEffect(() => {
    if (!open) return;
    setRawWebEvents(webEvents ?? {});
  }, [open, webEvents]
  );

  const handleClose = () => {
    setWebEvents(rawWebEvents);
    onClose();
  }

  const handleFetchEvents = async () => {
    setWebEvents(rawWebEvents);
    try {
      const data = await getEventList(monthsAgo);
      if (!data) return;

      setRawWebEvents(data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const handleParseEvent = async (pageName: string, link: string) => {
    try {
      const result = await getDataFromPage(pageName, link);
      if (!result) return;
      /* console.log(result); */

      const { title, items, farms } = result;
      /* console.log(title, items); */
      setRawWebEvents((prev) => {
        const _next = { ...prev };
        const _webEvent = { ..._next[pageName] };
        _webEvent.materials = items;
        if (title) {
          _webEvent.title = title;
        }
        if (farms && farms.length > 0) {
          _webEvent.farms = farms;
        }
        _next[pageName] = _webEvent;
        return _next;
      })
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  }

  const handleSelectorChange = (event: NamedEvent) => {
    /* console.log(event); */
    setSelectedEvent(event);
  };

  const handleAddEventDialogOpen = (item: WebEvent) => {
    if (Object.keys(rawWebEvents[item.pageName]?.materials ?? {}).length === 0) return;
    setHandledEvent({
      name: item.title ?? item.pageName,
      index: rawWebEvents[item.pageName].index || 99,
      materials: rawWebEvents[item.pageName].materials ?? {},
      farms: rawWebEvents[item.pageName].farms ?? []
    });
    setAddEventToDepotDialogOpen(true);
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md"
      fullScreen={fullScreen}
      sx={{ overflow: 'visible' }}>
        {loading["LIST"] && ProgressElement("LIST")}
        <DialogTitle>CN events from prts
          <IconButton onClick={handleClose} sx={{ display: { sm: "none" }, gridArea: "close" }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {Object.keys(rawWebEvents ?? {}).length > 0 &&
            Object.entries(rawWebEvents)
              .sort(([, a], [, b]) => {
                if (!a.date) return 1;
                if (!b.date) return -1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
              })
              .map(([, item], index) => (
                <Box key={index} position="relative" sx={{ mt: 1 }}>
                  {loading[item.pageName] && (
                    <Box
                      position="absolute"
                      top={0}
                      left={0}
                      right={0}
                      height={0}
                      zIndex={2}
                    >
                      {ProgressElement(item.pageName)}
                    </Box>
                  )}
                  <Accordion sx={{
                    position: 'relative',
                    zIndex: 1,
                  }}>
                    <AccordionSummary
                      expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                        {item.date && <Typography>{`(${(new Date(item.date)).toISOString().split('T')[0]}) ${item.title ?? item.pageName}`}</Typography>}
                        <Stack direction="row" gap={2}>
                          {(Object.keys(rawWebEvents[item.pageName]?.materials ?? {}).length > 0
                            || rawWebEvents[item.pageName]?.farms) && <Tooltip title="add mats to event list">
                              <MoveToInboxIcon
                                sx={{
                                  transition: "opacity 0.1s",
                                  "&:focus, &:hover": {
                                    opacity: 0.5,
                                  },
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddEventDialogOpen(item);
                                }} />
                            </Tooltip>}
                          <CloudDownloadIcon
                            onClick={(e) => {
                              e.stopPropagation();
                              handleParseEvent(item.pageName, item.link)
                            }} />
                        </Stack>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Link href={item.link} underline="always">
                        {'Event page'}
                      </Link><br />
                      {rawWebEvents[item.pageName] && (
                        <>
                          {rawWebEvents[item.pageName].farms && (
                            <Box>
                              Tier 3 Farms: {(rawWebEvents[item.pageName].farms ?? []).map((id) => (
                                <ItemBase key={`${id}-farms`} itemId={id} size={getItemBaseStyling('builder').baseSize} />
                              ))}
                            </Box>
                          )}
                          {rawWebEvents[item.pageName].materials && (
                            <>
                              {Object.entries(rawWebEvents[item.pageName].materials)
                                .sort(([idA], [idB]) => itemsJson[idA as keyof typeof itemsJson].sortId - itemsJson[idB as keyof typeof itemsJson].sortId)
                                .map(([id, quantity], idx) => (
                                  <ItemBase key={`${id}`} itemId={id} size={getItemBaseStyling('builder').baseSize}>
                                    <Typography {...getItemBaseStyling('builder').numberCSS}>{formatNumber(quantity)}</Typography>
                                  </ItemBase>
                                ))}
                            </>
                          )}
                        </>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Box>
              ))
          }
        </DialogContent>
        <DialogActions sx={{ justifyContent: "flex-start" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleFetchEvents}
            disabled={loading["LIST"]}
          >
            Fetch Events, months:
          </Button>
          <TextField
            value={monthsAgo}
            size="small"
            onChange={(e) => setMonthsAGo(Number(e.target.value) || 6)}
          />
          {error && (
            <Typography>
              Error: {error.message}
            </Typography>
          )}
        </DialogActions>
      </Dialog>
      <AddEventToDepotDialog
        open={addEventToDepotDialogOpen}
        onClose={() => setAddEventToDepotDialogOpen(false)}
        variant="builder"
        onSubmit={submitEvent}
        eventsData={eventsData}
        handledEvent={handledEvent}
        selectedEvent={selectedEvent}
        onSelectorChange={handleSelectorChange}
      />
    </>
  );
});

ScraperDialog.displayName = "ScraperDialog";
export default ScraperDialog;