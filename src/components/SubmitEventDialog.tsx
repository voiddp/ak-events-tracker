import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Event, EventsData, emptyEvent, SubmitEventProps } from "@/types/events";
import EventsSelector from "./EventsSelector";
import { formatNumber, getWidthFromValue, standardItemsSort } from "../utils/ItemUtils"
import ItemEditBox from "./ItemEditBox";

type NamedEvent = Event & {
    name: string;
};

interface Props {
    open: boolean;
    onClose: () => void;
    variant: "tracker" | "builder";
    onSubmit: (submit: SubmitEventProps) => void;
    eventsData: EventsData;
    handledEvent: NamedEvent;
    selectedEvent?: NamedEvent;
    onSelectorChange?: (namedEvent: NamedEvent) => void
}

const SubmitEventDialog = (props: Props) => {
    const { open, onClose, variant, onSubmit, eventsData, handledEvent, selectedEvent, onSelectorChange } = props;

    const [rawMaterials, setRawMaterials] = useState<Record<string, number>>({});
    const [rawFarms, setRawFarms] = useState<string[]>([]);
    const [rawName, setRawName] = useState<string>('');
    const [isNumbersMatch, setisNumbersMatch] = useState<boolean>(true);
    const [replace, setReplace] = useState(false);
    const [focused, setFocused] = useState<string | false>(false);

    useEffect(() => {
        if (!open) return;
        setRawMaterials(handledEvent.materials ?? {});
        setRawFarms(handledEvent?.farms ?? []);
        setRawName(handledEvent.name ?? "")
        setisNumbersMatch(true);
        setFocused(false);
    }, [open, handledEvent]);

    useEffect(() => {
        if (!open) return;
        if (selectedEvent && selectedEvent.index !== -1)
            setReplace(true);
        else
            setReplace(false);
    }, [open, selectedEvent]
    )

    const handleInputChange = (id: string, value: number) => {
        setRawMaterials((prev) => {
            const newValue = Math.max(0, Math.min(value || 0, handledEvent.materials[id] ?? 0));
            const updated = { ...prev, [id]: newValue };

            const allValuesMatch = Object.entries(updated).every(
                ([key, val]) => val === (handledEvent.materials[key] ?? 0)
            );
            setisNumbersMatch(allValuesMatch);
            return updated;
        });
    };

    const handleDialogClose = () => {
        setRawMaterials({});
        setRawFarms([]);
        onClose();
    };

    const handleSubmit = () => {
        const _newName = replace ? rawName : false;

        const materialsToDepot = variant === "builder"
            ? []
            : Object.entries(rawMaterials).filter(([_, value]) => value > 0);
        let materialsToEvent: Record<string, number> | boolean = false;

        materialsToEvent = variant === "tracker" && !isNumbersMatch
            ? Object.fromEntries(
                Object.entries(handledEvent.materials ?? {})
                    .map(([id, quantity]) => ([id, quantity - (rawMaterials[id] ?? 0)] as [string, number]))
                    .filter(([_, quantity]) => quantity > 0)
            )
            : variant === "builder" &&
            Object.fromEntries(
                Object.entries(rawMaterials ?? {})
                    .filter(([_, quantity]) => quantity > 0));
        /* console.log(handledEvent.name, selectedEvent?.index ?? -1, materialsToDepot, materialsToEvent, rawFarms, _newName); */
        onSubmit({
            eventName: handledEvent.name, 
            selectedEventIndex: selectedEvent?.index ?? -1, 
            materialsToDepot, 
            materialsToEvent, 
            farms: rawFarms, 
            replaceName:_newName});
        handleDialogClose();
    };

    const isSubmitDisabled = Object.values(rawMaterials).every((value) => value === 0);

    const getTitle = (
        variant: "tracker" | "builder",
        selectedEvent: NamedEvent | undefined,
        replace: boolean,
        isNumbersMatch: boolean,
        rawFarms: string[]
    ): string => {
        if (variant === "builder") {
            const baseTitle = "Event in Tracker";
            const optional = (selectedEvent?.index ?? -1) === -1
                ? "add/update"
                : replace ? "replace" : "add to";
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        if (variant === "tracker") {
            const baseTitle = "Add to Depot";
            const optional = `remove ${isNumbersMatch && rawFarms.length === 0 ? "" : "from "}Event`
            return [baseTitle, optional].filter(Boolean).join(" (") + (optional ? ")" : "");
        }

        return ""; // Fallback in case of unexpected variant
    };

    return (
        <Dialog open={open} onClose={handleDialogClose}>
            <DialogTitle>
                <Stack direction="column" width="100%">
                    {getTitle(variant, selectedEvent, replace, isNumbersMatch, rawFarms)}
                    <Stack direction="row" alignItems="stretch">
                        <TextField
                            value={rawName}
                            disabled={(variant !== "builder")}
                            onChange={(e) => {
                                setRawName(e.target.value);
                                if (rawName !== handledEvent.name && rawName !== '') {
                                    setReplace(true);
                                } else {
                                    setReplace(false);
                                }
                            }}
                            onFocus={(e) => e.target.select()}
                            size="small"
                            fullWidth
                            type="text"
                        />
                        <Checkbox
                            disabled={selectedEvent?.index === -1 || variant !== "builder"}
                            checked={replace}
                            onChange={() => setReplace(!replace)} />
                    </Stack>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap"
            }}>
                {Object.keys(rawMaterials).length > 0 && (
                    <Stack direction="row" gap={0.7} flexWrap="wrap">
                        {Object.entries(rawMaterials)
                        .sort(([a],[b]) => standardItemsSort(a,b))
                        .map(([id, quantity]) => (
                            <ItemEditBox
                                key={`${id}-itemEdit`}
                                itemId={id}
                                value={quantity !== 0 ? (focused !== id ? formatNumber(quantity) : quantity) : ""}
                                width={getWidthFromValue(quantity !== 0 ? (focused !== id ? formatNumber(quantity) : quantity) : "")}
                                onFocus={() => {
                                    setFocused(id);
                                }}
                                onChange={(value) => handleInputChange(id, value)}
                                onIconClick={(id) => {
                                    setFocused(id)
                                }}
                            />
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions sx={{ gap: 1 }}>
                {(variant === "builder")
                    && <EventsSelector
                        variant='builder'
                        eventsData={eventsData}
                        selectedEvent={selectedEvent ?? emptyEvent}
                        onChange={onSelectorChange}
                    />
                }
                <Button disabled={isSubmitDisabled} onClick={handleSubmit} variant="contained">
                    Submit
                </Button>
                <Button onClick={handleDialogClose}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
};

export default SubmitEventDialog;