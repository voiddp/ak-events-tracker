import { useCallback, useMemo } from "react";
import useSettings from '@/utils/hooks/useSettings'
import { EventsData, SubmitEventProps } from "@/lib/events/types";
import { createDefaultEventsData, createEmptyEvent, reindexEvents } from "@/lib/events/utils"
import useLocalStorage from "@/utils/hooks/useLocalStorage";
import { getNextMonthsData } from "@/lib/events/utils";
import { WebEventsData } from "@/lib/prtsWiki/types";

function useEvents(): [
    EventsData,
    (newEventsData: EventsData) => void,
    (submit: SubmitEventProps) => false | [string, number][],
    (months?: number) => EventsData,
    (webEvents: WebEventsData) => EventsData,
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
        _setEvents(newEventsData);

        //migrate: If setEvent happened, and old storage exists, remove old storage
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

    const getEventByIndex = useCallback((index: number) => {
        if (index === -1) {
            return {
                name: null,
                eventData: { ...createEmptyEvent(), index: 99 },
            };
        }
        const foundEntry = Object.entries(eventsData).find(([, event]) => event.index === index);
        return {
            name: foundEntry ? foundEntry[0] : null,
            eventData: foundEntry ? foundEntry[1] : { ...createEmptyEvent(), index: 99 },
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

    const submitEvent = useCallback((props: SubmitEventProps): false | [string, number][] => {
        const { eventName, selectedEventIndex, materialsToDepot, materialsToEvent, farms, replaceName } = props;
        const _eventsData = { ...eventsData };

        let result: [string, number][] | false = false;

        //handle tracker to depot && update/remove event
        if (materialsToDepot.length > 0) {
            result = materialsToDepot;
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
            if (farms.length > 0) {
                _event.farms = [...farms];
            };
            //handle name change if new name is set.
            if (!replaceName || _name === replaceName) {
                _eventsData[_name] = _event;
            } else {
                delete _eventsData[_name];
                _eventsData[replaceName] = _event;
            };
        }
        _setEvents(reindexEvents(_eventsData));
        return result;
    }, [eventsData, _setEvents, getEventByIndex]);

    const clientCreateDefaultEventsData = (webEvents: WebEventsData): EventsData => {
        return createDefaultEventsData(webEvents) ?? {};
    }
    return [_eventsData, setEvents, submitEvent, getNextMonthsData,
        clientCreateDefaultEventsData]
}
export default useEvents;