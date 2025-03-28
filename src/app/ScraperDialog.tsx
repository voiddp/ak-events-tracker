import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Accordion, AccordionSummary, AccordionDetails, Button, Typography, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import fetchEvents, { WebEvents, getItemsFromPage } from '../server/webScraper';

interface ScraperDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Event {
  index: number;
  materials: {
    [key: string]: number;
  },
  farms?: string[]
};

interface EventsData {
  [key: string]: Event;
};


const ScraperDialog: React.FC<ScraperDialogProps> = ({ open, onClose }) => {
  const [data, setData] = useState<WebEvents[]>([]);
  const [eventsData, setEventsData] = useState<EventsData>({});

  const getEvents = async () => {
    const scrapedData = await fetchEvents();
    if (!scrapedData) return;

    setData(scrapedData);
  }

  const dictionary = {
    "sign-in": "签到"
  }

  const handleParseEvent = async (title: string, link: string) => {

    const result = await getItemsFromPage(title, link);
    if (!result) return;

    const { items, farms } = result;
    console.log(farms);
    setEventsData((prev) => {
      const _next = { ...prev };
      _next[title] = { index: 1, materials: items };
      if (farms && farms.length > 0) {
        _next[title].farms = farms;
      }

      return _next;
    })
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>CN events from prts</DialogTitle>
      <DialogContent>
        {data.length === 0 ? (
          <Button onClick={getEvents} variant="outlined" color="primary">
            Fetch Data
          </Button>
        ) : (
          data.map((item, index) => (
            <Accordion key={index}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>{item.title}</Typography>
                <div style={{ border: "1px solid", marginLeft: 'auto', display: 'inline-block' }} onClick={(e) => {
                  e.stopPropagation();
                  handleParseEvent(item.title, item.link)
                }}>
                  Scrap event
                </div>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>
                  Date: {item.date}
                  <br />
                  Link: <a href={item.link} target="_blank" rel="noopener noreferrer">{item.link}</a>
                </Typography>
                {eventsData[item.title] && (
                  <>
                    {eventsData[item.title].farms && (
                      <Box>
                        Found tier 3 Farms: {eventsData[item.title].farms?.toString()}
                      </Box>
                    )}
                    {eventsData[item.title].materials && (
                      <Box><ul>
                        {Object.entries(eventsData[item.title].materials).map(([material, number], idx) => (
                          <li key={idx}>
                            {material}: {number}
                          </li>
                        ))}
                      </ul></Box>
                    )}
                  </>
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ScraperDialog;