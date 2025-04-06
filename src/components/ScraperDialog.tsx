import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box, DialogActions, Stack, IconButton, TextField, Link, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { WebEventsData, emptyWebEvent, EventsData, NamedEvent, WebEvent, SubmitEventProps } from '@/types/events'
import { usePrtsWiki } from '../utils/hooks/usePrtsWiki';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ItemBase from '@/components/ItemBase';
import SubmitEventDialog from '@/components/SubmitEventDialog';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { formatNumber, standardItemsSort, getItemBaseStyling, isMaterial } from '@/utils/ItemUtils'
import { Close } from "@mui/icons-material";


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

  const [submitEventDialogOpen, setSubmitEventDialogOpen] = useState<boolean>(false);
  const [handledEvent, setHandledEvent] = useState({ ...emptyWebEvent });
  const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();

  useEffect(() => {
    if (!open) return;
    //use for release
    //setRawWebEvents(webEvents ?? {});

    //+remove for release;
    setRawWebEvents((prev) => {
      const _next = webEvents ?? {};
      Object.keys(_next).forEach(key => {
        const title = _next[key]?.title ?? "";
        if (title) {
          _next[key].name = title;
          delete _next[key].title;
        }
      })
      return _next
    });
    //-
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
          _webEvent.name = title;
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
      ...item,
      name: item.name,
      materials: rawWebEvents[item.pageName].materials ?? {},
      farms: rawWebEvents[item.pageName].farms ?? []
    });
    setSubmitEventDialogOpen(true);
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md"
        fullScreen={fullScreen}
        sx={{ overflow: 'visible' }}>
        {loading["LIST"] && ProgressElement("LIST")}
        <DialogTitle justifyContent="space-between">
        <Stack direction="row" gap={1} mr={1}>
          From prts.wiki:
        <TextField
            label="months"
            value={monthsAgo}
            size="small"
            sx={{width:"4ch"}}
            slotProps={{
              htmlInput: {
                sx: {textAlign: "center"}
              }
            }}
            onChange={(e) => setMonthsAGo(Number(e.target.value) || 6)}
          /> 
        <Button
            variant="contained"
            color="primary"
            onClick={handleFetchEvents}
            disabled={loading["LIST"]}
          >
            Fetch Events
          </Button>
          </Stack>
          <IconButton onClick={handleClose} sx={{ display: { sm: "none" }, gridArea: "close" }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {error && (
            <Typography textAlign="center">
              Error: {error.message}
            </Typography>
          )}
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
                      <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch" pr={2}>
                        {item.date && <Typography>{`(${(new Date(item.date)).toISOString().split('T')[0]}) ${item.name ?? item.pageName}`}</Typography>}
                        <Stack direction="row" gap={2}>
                          {(Object.keys(rawWebEvents[item.pageName]?.materials ?? {}).length > 0
                            || rawWebEvents[item.pageName]?.farms) && <Tooltip title="Add event to Tracker">
                              <MoveToInboxIcon
                                fontSize="large"
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
                          {!rawWebEvents[item.pageName]?.webDisable
                            && <Tooltip title="pull event data from page">
                              <CloudDownloadIcon
                              fontSize="large"
                              sx={{
                                transition: "opacity 0.1s",
                                "&:focus, &:hover": {
                                  opacity: 0.5,
                                },
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleParseEvent(item.pageName, item.link)
                              }} />
                              </Tooltip>
                          }
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
                                <ItemBase key={`${id}-farms`} itemId={id} size={getItemBaseStyling('builder').itemBaseSize} />
                              ))}
                            </Box>
                          )}
                          {rawWebEvents[item.pageName].materials && (
                            <>
                              {Object.entries(rawWebEvents[item.pageName].materials ?? {})
                                .sort(([idA], [idB]) => standardItemsSort(idA, idB))
                                .map(([id, quantity], idx) => (
                                  <ItemBase key={`${id}`} itemId={id} size={getItemBaseStyling('builder').itemBaseSize}>
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
        </DialogActions>
      </Dialog>
      <SubmitEventDialog
        open={submitEventDialogOpen}
        onClose={() => setSubmitEventDialogOpen(false)}
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