import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box, DialogActions, Stack, IconButton, TextField, Link, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EventsData, NamedEvent, SubmitEventProps } from '@/lib/events/types'
import { WebEventsData, WebEvent } from '@/lib/prtsWiki/types'
import { usePrtsWiki } from '@/lib/prtsWiki/client';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ItemBase from '@/components/ItemBase';
import SubmitEventDialog from '@/components/SubmitEventDialog';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';
import { formatNumber, standardItemsSort, getItemBaseStyling, isMaterial } from '@/utils/ItemUtils'
import { Close } from "@mui/icons-material";
import { createEmptyWebEvent } from '@/lib/prtsWiki/utils';


interface Props {
  open: boolean;
  onClose: () => void;
  eventsData: EventsData;
  defaultList: WebEventsData;
  submitEvent: (submit: SubmitEventProps) => void;
}

const WebEventsDialog = React.memo((props: Props) => {
  const { open, onClose, eventsData, submitEvent, defaultList } = props;
  const { webEvents, setWebEvents, error, loading, getEventList, getDataFromPage, ProgressElement } = usePrtsWiki();

  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

  const [rawWebEvents, setRawWebEvents] = useState<WebEventsData>({});
  const [monthsAgo, setMonthsAGo] = useState(6);

  const [submitEventDialogOpen, setSubmitEventDialogOpen] = useState<boolean>(false);
  const [submitedEvent, setSubmitedEvent] = useState(createEmptyWebEvent());
  const [selectedEvent, setSelectedEvent] = useState<NamedEvent>();

  useEffect(() => {
    if (!open) return;
    //use for release
    //setRawWebEvents(webEvents ?? {});
    //+remove for release;
    if (webEvents && Object.keys(webEvents).length > Object.keys(defaultList ?? {}).length) {
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
    } else {
      setRawWebEvents(defaultList ?? {});
      setWebEvents(defaultList ?? {});
    }
  }, [open, webEvents, setWebEvents, defaultList]
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
    setSubmitedEvent({
      ...item,
      name: item.name ?? item.pageName,
      materials: rawWebEvents[item.pageName].materials ?? {},
      farms: rawWebEvents[item.pageName].farms ?? []
    });
    setSubmitEventDialogOpen(true);
  }

  const getDateString = (date: Date) => {
    if (!date) return "";
    const _date = new Date(date);
    const day = String(_date.getDate()).padStart(2, '0');
    const month = String(_date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = _date.getFullYear();

    return `${day}-${month}-${year}`;
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md"
        fullScreen={fullScreen}
        sx={{ overflow: 'visible' }}>
        {loading["LIST"] && ProgressElement("LIST")}
        <DialogTitle justifyContent="space-between">
          <Stack direction="row" gap={1} mr={1}>
            {!fullScreen ? "From " : ""}prts.wiki:
            <TextField
              label="months"
              value={monthsAgo}
              size="small"
              sx={{ width: "4ch" }}
              slotProps={{
                htmlInput: {
                  onClick: (e: React.MouseEvent<HTMLInputElement>) => e.currentTarget.select(),
                  sx: { textAlign: "center" },
                }
              }}
              onChange={(e) => {
                setMonthsAGo(Number(e.target.value) || 1);
                e.target.select();
              }}
            />
            <Button
              variant="contained"
              color="primary"
              size={fullScreen ? "small" : "medium"}
              onClick={handleFetchEvents}
              disabled={loading["LIST"]}
              sx={{ minWidth: "fit-content", minHeight: "fit-content" }}
            >Fetch Events
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
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Link href={item.link} underline="always" alignSelf="left" noWrap fontSize={fullScreen ? "small" : "inherit"}>
                            {item.date ? `(${getDateString(item.date)})` : "Page link"}
                          </Link>
                          <Typography textAlign="center" fontSize={fullScreen ? "small" : "inherit"}>
                            {` ${item.name ?? item.pageName}`}
                          </Typography>
                        </Stack>
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
                      <Stack direction="column" justifyContent="space-between" alignItems="center" gap={1}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
                          {rawWebEvents[item.pageName] && rawWebEvents[item.pageName].farms && (
                            <Stack direction="row" alignItems="center" gap={0.5}>
                              {(rawWebEvents[item.pageName].farms ?? []).map((id) => (
                                <ItemBase key={`${id}-farms`} itemId={id} size={getItemBaseStyling('builder', fullScreen).itemBaseSize * 1.1} />
                              ))} T3 Farms
                            </Stack>
                          )}
                        </Stack>
                        <Stack direction="row" alignItems="center" justifyContent="center" flexWrap="wrap">
                          {rawWebEvents[item.pageName] && rawWebEvents[item.pageName].materials && (
                            <>
                              {Object.entries(rawWebEvents[item.pageName].materials ?? {})
                                .sort(([idA], [idB]) => standardItemsSort(idA, idB))
                                .map(([id, quantity], idx) => (
                                  <ItemBase key={`${id}`} itemId={id} size={getItemBaseStyling('builder', fullScreen).itemBaseSize}>
                                    <Typography {...getItemBaseStyling('builder', fullScreen).numberCSS}>{formatNumber(quantity)}</Typography>
                                  </ItemBase>
                                ))}
                            </>
                          )}
                        </Stack>
                      </Stack>
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
        submitedEvent={submitedEvent}
        selectedEvent={selectedEvent}
        onSelectorChange={handleSelectorChange}
      />
    </>
  );
});

WebEventsDialog.displayName = "WebEventsDialog";
export default WebEventsDialog;