import React, { useMemo, useState } from 'react';
import {
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Divider,
    Stack,
    Typography,
    useTheme,
    useMediaQuery
} from '@mui/material';
import ItemBase from "./ItemBase";
import { Event, NamedEvent, EventsData } from "@/lib/events/types"
import { getItemBaseStyling, customItemsSort, formatNumber } from "@/utils/ItemUtils";
import { createEmptyEvent, createEmptyNamedEvent } from '@/lib/events/utils';

interface EventsSelectorProps {
    variant: 'summary' | 'builder' | 'months';
    disabled?: boolean;
    eventsData: EventsData;
    selectedEvent?: Event | null;
    onChange?: (namedEvent: NamedEvent) => void;
}

export const EventsSelector = React.memo((props: EventsSelectorProps) => {
    const {
        variant,
        disabled = false,
        eventsData,
        selectedEvent,
        onChange,
    } = props;

    let label: string;
    let emptyOption: string;

    switch (variant) {
        case 'builder': {
            label = "Select event to modify";
            emptyOption = "Add new event";
            break;
        }
        case 'months': {
            label = "Select month";
            emptyOption = "no month selected";
            break;
        }
        case 'summary': {
            label = "Select future event";
            emptyOption = "without event";
            break;
        }
    };

    const [isSelectFinished, setIsSelectFinished] = useState(false);

    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
    const { itemBaseSize, numberCSS } = getItemBaseStyling('selector', fullScreen);
    const eventsList = useMemo(() => Object.entries(eventsData ?? {})
        .sort(([, a], [, b]) => a.index - b.index), [eventsData]);

    const handleChange = (eventIndex: number) => {
        setIsSelectFinished(true);
        if (eventIndex === -1) {
            onChange?.({ ...createEmptyNamedEvent() });
            return;
        }
        const foundEntry = Object.entries(eventsData).find(([, event]) => event.index === eventIndex);
        onChange?.({
            name: foundEntry ? foundEntry[0] : "",
            ...(foundEntry ? foundEntry[1] : createEmptyEvent()),
        });
        return;
    };

    return (<FormControl sx={{ flexGrow: 1 }}>
        <InputLabel>{label}</InputLabel>
        <Select
            disabled={disabled}
            value={eventsList.length === 0 ? -1 : (selectedEvent?.index ?? -1)}
            onChange={(e) => handleChange(Number(e.target.value))}
            onOpen={() => {
                setIsSelectFinished(false)
            }}
            label={label}
            fullWidth
        >
            <MenuItem value={-1} key={-1} className="no-underline">{emptyOption}</MenuItem>
            <Divider component="li" />
            {eventsList
                .map(([name, event]) => (
                    <MenuItem value={event.index} key={event.index} className="no-underline">
                        <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                            {`${event.index}: ${name} `} {!isSelectFinished ? (
                                <Stack direction="row">
                                    {(event.farms ?? []).map((id) => [id, 0] as [string, number])
                                        .concat(Object.entries(event.materials)
                                            .sort(([itemIdA], [itemIdB]) => customItemsSort(itemIdA, itemIdB)))
                                        .slice(0, fullScreen ? 4 : 10)
                                        .map(([id, quantity], idx) => (
                                            <ItemBase key={`${id}${quantity === 0 && "-farm"} `} itemId={id} size={itemBaseSize}>
                                                <Typography {...numberCSS}>{quantity === 0 ? ["Ⅰ", "Ⅱ", "Ⅲ"][idx] : formatNumber(quantity)}</Typography>
                                            </ItemBase>
                                        ))}
                                    <small>{"..."}</small>
                                </Stack>) : null}
                        </Stack>
                    </MenuItem>
                ))}
        </Select>
    </FormControl>)

});
EventsSelector.displayName = "EventsSelector";
export default EventsSelector;