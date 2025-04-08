import { AK_CALENDAR, AK_DAILY, AK_WEEKLY } from "@/utils/ItemUtils";
import { EventsData, NamedEvent, Event } from "./types";
import { WebEventsData, WebEvent } from "../prtsWiki/types";

export const createEmptyEvent = () => {
    return { index: -1, materials: {} } as Event;
}

export const createEmptyNamedEvent = () => {
    return { ...createEmptyEvent(), name: "", farms: [] } as NamedEvent;
}

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

    const monthEventName = new Date(year, month - 1, daysInMonth)
        .toLocaleString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    return {
        name: monthEventName,
        index: month,
        materials
    }
};

export const getNextMonthsData = (months: number = 6): EventsData => {
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

export const reindexEvents = (eventsData: EventsData | [string, Event][]): EventsData => {
    const eventsArray = Array.isArray(eventsData)
        ? eventsData
        : Object.entries(eventsData).sort(([, a], [, b]) => a.index - b.index);

    return eventsArray.reduce((acc, [name, data], idx) => {
        const newData: Event = { ...data, index: idx };

        // Clean farms array
        if (newData.farms) {
            if (newData.farms.length === 0) {
                delete newData.farms;
            } else if (newData.farms.length > 3) {
                newData.farms = newData.farms.slice(0, 3);
            }
        }
        acc[name] = newData;
        return acc;
    }, {} as EventsData);
};

export const createDefaultEventsData = (webEvents: WebEventsData) => {
    if (!webEvents || Object.keys(webEvents).length === 0) return;
    const nextMonthsEvents = getNextMonthsData(6);
    if (!nextMonthsEvents || Object.keys(nextMonthsEvents).length === 0) return;
    /* const result = */
    //const _eventsData: EventsData = {};
    /* const _eventsData: EventsData = Object.fromEntries( */
    const _eventsData = Object.entries(webEvents)
        .filter(([_, wEvent]) =>
            (wEvent.materials && Object.keys(wEvent.materials).length > 0)
            || (wEvent.farms && wEvent.farms.length > 0))
        .map(([name, wEvent]) => {
            let _wEvent = { ...wEvent };
            if (_wEvent.date) {
                const date = new Date(_wEvent.date);
                //decrease web events date by 6 months to sort
                date.setMonth(date.getMonth() + 6);
                _wEvent.date = date;
            }
            return [name, _wEvent] as [string, WebEvent];
        }) //concat with Months events to sort
        .concat(
            Object.entries(nextMonthsEvents).map(([name, event]) => {
                //name is May 2025, convert to last day of month date
                const date = new Date(name);
                const webEvent: WebEvent = {
                    ...event,
                    pageName: name,
                    name,
                    date: date,
                    link: ""
                }
                return [name, webEvent] as [string, WebEvent];
            }))
        .sort(([, a], [, b]) => {
            if (a.date && b.date) {
                return new Date(a.date).getTime() - new Date(b.date).getTime();
            }
            if (!a.date) return -1;
            if (!b.date) return 1;
            return 0;
        }).reduce((acc, [_, event], idx) => {
            const _name = event.name ?? event.pageName;
            acc[_name] = {
                index: idx,
                materials: event.materials ?? {},
            }
            if (event.farms) {
                acc[_name].farms = event.farms;
            }
            return acc
        }, {} as EventsData)

    return _eventsData;
}

