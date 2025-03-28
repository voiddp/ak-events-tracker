import { useMemo, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box, DialogActions, Stack, IconButton, TextField } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { EventsData } from '../types/localStorageSettings'
import { usePrtsWiki } from '../hooks/usePrtsWiki';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import ItemBase from '@/components/ItemBase';

interface ScraperDialogProps {
  open: boolean;
  onClose: () => void;
}

const ScraperDialog: React.FC<ScraperDialogProps> = ({ open, onClose }) => {
  const { error, isLoading, getEventList, getItemsFromPage, LoadingSpinner } = usePrtsWiki();

  const [webEvents, setWebEvents] = useState<any[]>([]);
  const [eventsData, setEventsData] = useState<EventsData>({});
  const [hasFetched, setHasFetched] = useState(false);
  const [monthsAgo, setMonthsAGo] = useState(6);

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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>CN events from prts</DialogTitle>
      <DialogContent>
        {hasFetched && webEvents
          .sort((itemA, itemB) => itemB.date - itemA.date)
          .map((item, index) => (
            <Accordion key={index}>
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                  <Typography>{`(${(item.date as Date).toISOString().split('T')[0]}) ${item.title}`}</Typography>
                  {!isLoading && (<CloudDownloadIcon
                    onClick={(e) => {
                      e.stopPropagation();
                      handleParseEvent(item.title, item.link)
                    }} />)}
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Link: <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a>
                </Typography>
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
                        {Object.entries(eventsData[item.title].materials).map(([id, quantity], idx) => (
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
          ))
        }
      </DialogContent>
      <DialogActions sx={{ justifyContent: "flex-start" }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleFetchEvents}
          disabled={isLoading}
        >
          Fetch Events, months:
        </Button>
        <TextField
          value={monthsAgo}
          size="small"
          onChange={(e) => setMonthsAGo(Number(e.target.value) || 6)}
        />
        {isLoading && <LoadingSpinner />}
        {error && (
          <Typography>
            Error: {error.message}
          </Typography>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ScraperDialog;