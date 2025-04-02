import { useCallback, useEffect, useMemo, useState } from "react";
import useSettings from './useSettings'
import { Event, EventsData } from "../types/events";
import { Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography, useMediaQuery, useTheme } from "@mui/material";
import ItemBase from "@/components/ItemBase";
import { isTier3Material, getItemBaseStyling, customItemsSort, formatNumber } from "./ItemUtils";
import useLocalStorage from "./useLocalStorage";

export type eventSelectorProps = {
    variant: "summary" | "builder";
    disabled: boolean;
};

function useEvents(): [
    EventsData,
    (newEventsData: EventsData) => void,
    (
        eventName: string,
        selectedEventIndex: number,
        materialsToDepot: [string, number][],
        materialsToEvent: Record<string, number> | false,
        farms: string[],
        newEventName: string | false,
    ) => void,
    /* (variant: "summary" | "builder", disabled: boolean) => { selectedEvent: Event; SelectorComponent: React.JSX.Element } ,*/
] {
    const [eventsData, _setEvents] = useLocalStorage<EventsData>("eventsTracker", {});
    const [settings, setSettings] = useSettings();

    const removeOldStorage = useCallback(() => {
        if (settings.eventsIncomeData)
            setSettings(prev => {
                const { eventsIncomeData, ...rest } = prev;
                return rest;
            });
    }, [setSettings, settings.eventsIncomeData]
    );

    const setEvents = useCallback((newEventsData: EventsData) => {
        /* console.log("puting events into storage", newEventsData); */
        _setEvents(newEventsData);

        //If setEvent happened, and old storage exists, remove old storage
        if (Object.keys(newEventsData ?? {}).length > 0)
            removeOldStorage();

    }, [_setEvents, removeOldStorage]);


    //return events based on where storage was
    const _eventsData = useMemo(() => {
        if (Object.keys(eventsData ?? {}).length > 0) {
            return eventsData;
        } else if (settings.eventsIncomeData && Object.keys(settings.eventsIncomeData ?? {}).length > 0) {
            return settings.eventsIncomeData;
        };
        return {};
    }, [eventsData, settings.eventsIncomeData]);

    /*      useEffect(() => {
            if (
              !hasMigrated && 
              settings.eventsIncomeData && 
              Object.keys(settings.eventsIncomeData ?? {}).length > 0 &&
              Object.keys(eventsData ?? {}).length === 0 // Only migrate if eventsData is empty
            ) {
              console.log("Migrating old events:", settings.eventsIncomeData);
              setEvents(settings.eventsIncomeData);
              setHasMigrated(true);
          
              // Optional: Clear old data from settings
              //setSettings(prev => ({ ...prev, eventsIncomeData: undefined }));
            }
          }, [settings.eventsIncomeData, eventsData, hasMigrated, setEvents, setSettings]); */

    /*     const [settings, setSettings] = useSettings();
        const { formatNumber, customItemsSort, getItemBaseStyling } = useItemUtils();
    
        const setEvents = (newEventsData: EventsData) => {
            const _eventData = { ...newEventsData };
    
            setSettings((s) => ({ ...s, eventsIncomeData: _eventData }));
        }
        const eventsData = useMemo(() => settings.eventsIncomeData ?? {},[settings.eventsIncomeData]);
        const _eventsData = useMemo(() => eventsData ?? {},[eventsData]); */

    //+eventSelector vars
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));

    const [isSelectFinished, setSelectFinished] = useState(false);
    const emptyEvent: Event = useMemo(() => ({ index: -1, materials: {} }), []);
    const [selectedEvent, setSelectedEvent] = useState(emptyEvent);
    //-


    const eventsList = useMemo(() => Object.entries(eventsData ?? {})
        .sort(([, a], [, b]) => a.index - b.index), [eventsData]);

    /*     const handleEventMaterials = (itemsAdded: [string, number][], itemsLeft: Record<string, number> | false, putFn) => {
    
             if (depotUpdate.length != 0) putDepot(depotUpdate);
    
            if (!itemsLeft) {
                handleDeleteEvent(handledEvent.name);
            } else {
                setRawEvents((prev) => {
                    const _next = { ...prev };
                    _next[handledEvent.name].materials = materialsLeft;
                    return _next;
                });
            }
            setHandledEvent({ name: "", materials: {}, farms: [] });
    
        }; */

    const getEventByIndex = useCallback((index: number) => {
        if (index === -1) {
            return {
                name: null,
                eventData: { index: 99, materials: {} } as Event,
            };
        }
        const foundEntry = Object.entries(eventsData).find(([, event]) => event.index === index);
        return {
            name: foundEntry ? foundEntry[0] : null,
            eventData: foundEntry ? foundEntry[1] : { index: -1, materials: {} } as Event,
        };
    }, [eventsData]
    );

    const addItemsToEvent = (items: Record<string, number>, addItems: Record<string, number>) => {
        const _items = { ...items };

        Object.entries(addItems).forEach(([key, value]) => {
            if (_items[key]) {
                _items[key] += value;
            } else {
                _items[key] = value;
            }
        });

        return _items;
    };

    const submitEvent = useCallback((
        eventName: string,
        selectedEventIndex: number,
        materialsToDepot: [string, number][],
        materialsToEvent: Record<string, number> | false,
        farms: string[],
        replaceName: string | false,
    ) => {
        //case of mats to add to depot and delete event if needed
        const _eventsData = { ...eventsData };

        //handle tracker to depot && update/remove event
        if (materialsToDepot.length > 0) {
            putDepot(materialsToDepot);
            if (!materialsToEvent && farms.length === 0) {
                delete eventsData[eventName];
            } else if (materialsToEvent && _eventsData[eventName]) {
                _eventsData[eventName].materials = materialsToEvent;
            }
        } else {
            //handle builder - find event by index        
            //find by index and use, or build new
            const { name, eventData } = getEventByIndex(selectedEventIndex);
            const _name = name ? name : eventName;
            const _event = { ...eventData };

            //replace mats or add mats
            if (materialsToEvent) {
                if (!replaceName) {
                    _event.materials = addItemsToEvent(_event.materials, materialsToEvent);
                } else {
                    _event.materials = materialsToEvent;
                }
            };
            //add/delete farms
            if (replaceName) {
                if (farms.length > 0) {
                    _event.farms = [...farms];
                } else {
                    delete _event.farms;
                }
            }
            /* console.log("set event", _name, replaceName, _event); */
            //handle name change if new name is set.
            if (!replaceName) {
                _eventsData[_name] = _event;
            } else {
                _eventsData[replaceName] = _event;
                delete _eventsData[_name];
            };
        }

        const _reindexedData = reindexSortedEvents(
            Object.entries(_eventsData).sort(
                ([, a], [, b]) => a.index - b.index
            )
        );

        _setEvents(_reindexedData);
    }, [eventsData, _setEvents, getEventByIndex]);

    const putDepot = (update: [string, number][]) => {

    };

    const reindexSortedEvents = (eventsArray: [string, Event][]) => {

        return eventsArray.reduce((acc, [name, data], idx) => {
            if (data.farms) {
                if (data.farms.length === 0) {
                    delete data.farms;
                } else if (data.farms.length > 3) {
                    data.farms.splice(3);
                }
            }
            acc[name] = { ...data, index: idx };
            return acc;
        }, {} as EventsData);
    }

    const onSelectorChange = useCallback((index: number, variant: string) => {
        setSelectFinished(true);

        if (index === -1) {
            setSelectedEvent(emptyEvent);
        } else {
            const _event = Object.entries(eventsData).find(([, eventData]) => eventData.index === index)?.[1] ?? emptyEvent;
            setSelectedEvent(_event);
        };

        /*  if (balanceType === "event" && !_event.farms) {
              setApplyBalance(false);
              setBalanceType(null);
          }; */
    }, [emptyEvent, eventsData]
    )

    type handlerProps = {
        itemsAdded: [string, number][],
        itemsLeft: Record<string, number> | false,
        eventName: string;
        eventsStorage?: EventsData,
        handlerFn?: (props: any) => void,
    }

    /*     const handleEventsModification = (props: handlerProps) => {
            const {itemsAdded, itemsLeft, eventName, eventsStorage, handlerFn} = props;
    
            if (handlerFn && eventsStorage) {
                handlerFn(itemsAdded, itemsLeft, eventName, eventsStorage);
            }
    
            const storage = eventsStorage ? {...eventsStorage} : {...eventsData};
            
            if (itemsLeft)
            
        };
     */
    /* 
        const getEventSelector = useCallback(
            (variant: "summary" | "builder", disabled: boolean): { selectedEvent: Event; SelectorComponent: React.JSX.Element } => {
                const label = `Select ${variant === "summary" ? "future" : "modified"} Event`;
                const { baseSize, numberCSS } = getItemBaseStyling(variant);
                console.log(baseSize);
                return {
                    selectedEvent,
                    SelectorComponent:
                        (<FormControl sx={{ flexGrow: 1 }}>
                            <InputLabel>{label}</InputLabel>
                            <Select
                                disabled={disabled}
                                value={eventsList.length === 0 ? -1 : (selectedEvent?.index ?? -1)}
                                onChange={(e) => onSelectorChange(Number(e.target.value), variant)}
                                onOpen={() => {
                                    setSelectFinished(false)
                                }}
                                label={label}
                                fullWidth
                            >
                                <MenuItem value={-1} key={-1} className="no-underline">{`${variant === "builder" ? "Add new" : "without"} Event`}</MenuItem>
                                <Divider component="li" />
                                {eventsList
                                    .map(([name, event]) => (
                                        <MenuItem value={event.index} key={event.index} className="no-underline">
                                            <Stack direction="row" justifyContent="space-between" alignItems="center" width="stretch">
                                                {`${event.index}: ${name}`} {!isSelectFinished ? (
                                                    <Stack direction="row">
                                                        {(event.farms ?? []).map((id) => [id, 0] as [string, number])
                                                            .concat(Object.entries(event.materials)
                                                                .sort(([itemIdA], [itemIdB]) => customItemsSort(itemIdA, itemIdB)))
                                                            .slice(0, fullScreen ? 4 : 10)
                                                            .map(([id, quantity], idx) => (
                                                                <ItemBase key={`${id}${quantity === 0 && "-farm"}`} itemId={id} size={baseSize * 0.5}>
                                                                    <Typography {...numberCSS}>{quantity === 0 ? ["Ⅰ", "Ⅱ", "Ⅲ"][idx] : formatNumber(quantity)}</Typography>
                                                                </ItemBase>
                                                            ))}
                                                        {"..."}
                                                    </Stack>) : null}
                                            </Stack>
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>)
                };
            },
            [customItemsSort, eventsList, formatNumber, fullScreen, getItemBaseStyling, isSelectFinished, onSelectorChange, selectedEvent]
        ); */

    return [_eventsData, setEvents, submitEvent]

}

export default useEvents;