import { useCallback, useMemo } from "react";
import useSettings from '@/utils/hooks/useSettings'
import { EventsData, NamedEvent, SubmitEventProps, emptyEvent, reindexEvents } from "@/types/events";
import { AK_CALENDAR, AK_DAILY, AK_WEEKLY } from "@/utils/ItemUtils";
import useLocalStorage from "@/utils/hooks/useLocalStorage";

export type eventSelectorProps = {
    variant: "summary" | "builder";
    disabled: boolean;
};

function useEvents(): [
    EventsData,
    (newEventsData: EventsData) => void,
    (submit: SubmitEventProps) => false | [string, number][],
    (months?: number) => EventsData
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
                eventData: { ...emptyEvent, index: 99 },
            };
        }
        const foundEntry = Object.entries(eventsData).find(([, event]) => event.index === index);
        return {
            name: foundEntry ? foundEntry[0] : null,
            eventData: foundEntry ? foundEntry[1] : { ...emptyEvent, index: 99 },
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

    const createMonthEvent = (month: number, year: number): NamedEvent => {

        const daysInMonth = new Date(year, month, 0).getDate();
        const firstDayNum = new Date(year, month - 1, 1).getDay();
        const lastDayNum = new Date(year, month - 1, daysInMonth).getDay();

        const firstDay = (firstDayNum + 6) % 7;
        const lastDay = (lastDayNum + 6) % 7;

        const materials: Record<string, number> = {};

        //AK_CALENDAR
        for (const [dayStr, items] of Object.entries(AK_CALENDAR)) {
            const day = parseInt(dayStr);
            if (day <= daysInMonth) {
                for (const [id, amount] of Object.entries(items)) {
                    materials[id] = (materials[id] || 0) + amount;
                }
            }
        }
        //AK_DAILY
        for (const [id, amount] of Object.entries(AK_DAILY)) {
            materials[id] = (materials[id] || 0) + amount * daysInMonth;
        }

        //AK_WEEKLY
        let fullWeeks = Math.floor(daysInMonth / 7);
        if (firstDay <= 3) fullWeeks++;
        if (lastDay >= 3) fullWeeks++;

        for (const [id, amount] of Object.entries(AK_WEEKLY)) {
            materials[id] = (materials[id] || 0) + amount * fullWeeks;
        }

        const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' });
        return {
            name: `${monthName} ${year}`,
            index: month,
            materials
        }
    };

    const getNextMonthsData = (months: number = 6): EventsData => {
        const nextMonthsData: EventsData = {};
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();

        for (let i = 1; i <= months; i++) {
            const month = (currentMonth + i) % 12 || 12;
            const year = currentYear + Math.floor((currentMonth + i) / 12);
            const monthEvent = createMonthEvent(month, year);
            nextMonthsData[monthEvent.name] = monthEvent;
        }
        return nextMonthsData;
    }

    return [_eventsData, setEvents, submitEvent, getNextMonthsData]

}

export default useEvents;