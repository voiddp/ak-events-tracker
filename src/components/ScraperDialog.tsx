import React, { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box, DialogActions, Stack, IconButton, TextField, Link, Tooltip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EventsData } from '../types/localStorageSettings'
import { usePrtsWiki } from '../hooks/usePrtsWiki';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ItemBase from '@/components/ItemBase';
import itemsJson from '../data/items.json';
import AddEventToDepotDialog from '@/components/AddEventToDepotDialog';
import MoveToInboxIcon from '@mui/icons-material/MoveToInbox';

interface ScraperDialogProps {
  open: boolean;
  onClose: () => void;
  /* addEvent: (handledEvent: EventsData) => void; */
}

const ScraperDialog: React.FC<ScraperDialogProps> = ({ open, onClose }) => {
  const { error, loading, getEventList, getItemsFromPage, ProgressElement } = usePrtsWiki();

  const [webEvents, setWebEvents] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<EventsData>({});
  const [hasFetched, setHasFetched] = useState(false);
  const [monthsAgo, setMonthsAGo] = useState(6);

  const [addEventToDepotDialogOpen, setAddEventToDepotDialogOpen] = useState<boolean>(false);
  const [handledEvent, setHandledEvent] = useState({
    name: "" as string,
    materials: {} as Record<string, number>,
    farms: [] as string[],
  });

  const handleSubmit = () => {

  };

  const handleFetchEvents = async () => {
    try {
      const data = await getEventList(monthsAgo);
      if (!data) return;

      setWebEvents(data);
      setHasFetched(true);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const handleParseEvent = async (title: string, link: string) => {
    try {
      const result = await getItemsFromPage(title, link);
      if (!result) return;

      const { items, farms } = result;

      setEventsData((prev) => {
        const _next = { ...prev };
        _next[title] = { index: 1, materials: items };
        if (farms && farms.length > 0) {
          _next[title].farms = farms;
        }
        return _next;
      })
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  }

  const pageNames = {
    events: '活动一览',
    operations: '关卡一览/常态事务'
  };

  const templates = {
    anihilations: '剿灭作战',
    sss: '保全派驻/Ver2',
  };

  const itemBaseSize = useMemo(() => (40 * 0.7), []);

  const numberCSS = useMemo(() => ({
    component: "span",
    sx: {
      display: "inline-block",
      py: 0.25,
      px: 0.5,
      lineHeight: 1,
      mr: `${itemBaseSize / 16}px`,
      mb: `${itemBaseSize / 16}px`,
      alignSelf: "end",
      justifySelf: "end",
      backgroundColor: "background.paper",
      zIndex: 1,
      fontSize: `${itemBaseSize / 24 + 8}px`,
    },
  }), [itemBaseSize]);

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        {loading["LIST"] && ProgressElement("LIST")}
        <DialogTitle>CN events from prts</DialogTitle>
        <DialogContent>
          {hasFetched && webEvents
            .sort((itemA, itemB) => itemB.date - itemA.date)
            .map((item, index) => (
              <Box key={index} position="relative" sx={{ mt: 1 }}>
                {loading[item.title] && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    height={0}
                    zIndex={2}
                  >
                    {ProgressElement(item.title)}
                  </Box>
                )}
                <Accordion sx={{
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                      <Typography>{`(${(item.date as Date).toISOString().split('T')[0]}) ${item.title}`}</Typography>
                      <Stack direction="row" gap={2}>
                        <CloudDownloadIcon
                          onClick={(e) => {
                            e.stopPropagation();
                            handleParseEvent(item.title, item.link)
                          }} />
                        <Tooltip title="add mats to event list">
                          <MoveToInboxIcon
                            sx={{
                              transition: "opacity 0.1s",
                              "&:focus, &:hover": {
                                opacity: 0.5,
                              },
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (Object.keys(eventsData[item.title]?.materials ?? {}).length === 0) return;
                              setHandledEvent({ name : item.title, materials: eventsData[item.title].materials ?? {}, farms: eventsData[item.title].farms ?? [] });
                              setAddEventToDepotDialogOpen(true);
                            }} />
                        </Tooltip>
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Link href={item.link} underline="always">
                      {'Event page'}
                    </Link>
                    {eventsData[item.title] && (
                      <>
                        {eventsData[item.title].farms && (
                          <Box>
                            Tier 3 Farms: {(eventsData[item.title].farms ?? []).map((id) => (
                              <ItemBase key={`${id}-farms`} itemId={id} size={itemBaseSize} />
                            ))}
                          </Box>
                        )}
                        {eventsData[item.title].materials && (
                          <>
                            {Object.entries(eventsData[item.title].materials)
                              .sort(([idA], [idB]) => itemsJson[idA as keyof typeof itemsJson].sortId - itemsJson[idB as keyof typeof itemsJson].sortId)
                              .map(([id, quantity], idx) => (
                                <ItemBase key={`${id}`} itemId={id} size={itemBaseSize}>
                                  <Typography {...numberCSS}>{quantity}</Typography>
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
        onSubmit={handleSubmit}
        eventMaterials={handledEvent.materials}
        eventFarms={handledEvent.farms}
        mode="web"
      />
    </>
  );
};

export default ScraperDialog;