import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link'
import Image from "next/image";
import { List, ListItem } from '@mui/material';

interface AcknowledgementDialogProps {
  open: boolean;
  onClose: () => void;
}

const AcknowledgementDialog: React.FC<AcknowledgementDialogProps> = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="acknowledgement-dialog-title"
      aria-describedby="acknowledgement-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="acknowledgement-dialog-title">
        Acknowledgements
      </DialogTitle>
      <DialogContent>
        <List>
          <ListItem sx={{ flexDirection: "row", flexWrap: "wrap" }}><Typography>This <Link href="https://github.com/voiddp/ak-events-tracker" underline="always">github project</Link>
            &nbsp; is developed with end goal to be part of Krooster planner tools in combination with its summary and statistics (also by me)</Typography></ListItem>
          <ListItem><Typography><Link href="https://www.krooster.com/" underline='always'>Krooster</Link> for some components</Typography></ListItem>
          <ListItem><Typography>Aceship and PuppiizSunniiz for&nbsp;
            <Link href="https://github.com/PuppiizSunniiz/Arknight-Images" underline='always'>Arknight-Images</Link></Typography></ListItem>
          <ListItem><Typography>Kengxxiao repositories with AK data:
            <Link href="https://github.com/Kengxxiao/ArknightsGameData" underline='always'> ArknightsGameData CN</Link> and
            <Link href="https://github.com/Kengxxiao/ArknightsGameData_YoStar" underline='always'> ArknightsGameData Yostar</Link></Typography> </ListItem>
          <ListItem><Typography><Link href="https://prts.wiki/" underline='always'>prts.wiki</Link> team, for their work on CN wiki and its timely updates.
            Hope that web-scrapper of this site is not bothering your wiki much, it should be limited to polite delay levels</Typography></ListItem>

          <ListItem>Support all these creators on their sites.</ListItem>
          <ListItem>Or me, if you like what i do:
            <Link href='https://ko-fi.com/voiddp' target='_blank'><Image height='36' width='250' style={{ border: "0px", height: "36px", width: "250px" }} src='https://storage.ko-fi.com/cdn/kofi6.png?v=6' alt='Buy Me a Coffee at ko-fi.com' /></Link>
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" autoFocus>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AcknowledgementDialog;