import { AK_CALENDAR, AK_DAILY, AK_WEEKLY } from "@/utils/ItemUtils";
import { EventsData, NamedEvent, Event } from "./types";
import { WebEventsData, WebEvent } from "../prtsWiki/types";
import { GL_EVENT_DATES, IS_START_MONTH_SHIFT } from "./constants";

export const createEmptyEvent = () => {
    return { index: -1, materials: {} } as Event;
}

export const createEmptyNamedEvent = () => {
    return { ...createEmptyEvent(), name: "", farms: [] } as NamedEvent;
}

const createMonthEvent = (month: number, year: number, startDay: number = 1): NamedEvent | undefined => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayNum = new Date(year, month - 1, 1).getDay();
    const lastDayNum = new Date(year, month - 1, daysInMonth).getDay();

    //to 1-7 = mon-sun
    const firstDay = 1 + (firstDayNum + 6) % 7;
    const lastDay = 1 + (lastDayNum + 6) % 7;

    const materials: Record<string, number> = {};
    const remainingDays = daysInMonth - (startDay !== 1 ? startDay : 0);

    if (!remainingDays) return;

    // AK_CALENDAR - only include days after startDay
    for (const [dayStr, items] of Object.entries(AK_CALENDAR)) {
        const day = parseInt(dayStr);
        if (day > startDay && day <= daysInMonth) {
            for (const [id, amount] of Object.entries(items)) {
                materials[id] = (materials[id] || 0) + amount;
            }
        }
    }

    // AK_DAILY
    for (const [id, amount] of Object.entries(AK_DAILY)) {
        materials[id] = (materials[id] || 0) + amount * remainingDays;
    }

    // AK_WEEKLY - calculate partial weeks based on start day
    let fullWeeks = 0;
    let daysLeft = remainingDays;
    daysLeft -= (8 - firstDay); //remove all days of first week
    daysLeft -= lastDay; //remove last week days
    //add first/last weeks based on wednesday - end of weekly farm normally
    if (firstDay <= 3) fullWeeks++;
    if (lastDay >= 3) fullWeeks++;
    //mid-weeks
    fullWeeks += Math.floor(daysLeft / 7);

    if (fullWeeks) {
        for (const [id, amount] of Object.entries(AK_WEEKLY)) {
            materials[id] = (materials[id] || 0) + amount * fullWeeks;
        }
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

export const getNextMonthsData = (months: number = 7): EventsData => {
    const nextMonthsData: EventsData = {};
    const nextMonthsArray: NamedEvent[] = [];
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    for (let i = 0; i < months; i++) {
        const month = (currentMonth + i) % 12 || 12;
        const year = currentYear + Math.floor((currentMonth + i - 1) / 12);

        const monthEvent = i === 0
            ? createMonthEvent(month, year, currentDay)
            : createMonthEvent(month, year);

        if (!monthEvent) continue;

        nextMonthsArray.push(monthEvent);
    }
    nextMonthsArray.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime())
        .reduce((acc, event, idx) => {
            acc[event.name] = { ...event, index: idx + 1 };
            return acc;
        }, nextMonthsData);
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
    const _webEvents: WebEventsData = { ...webEvents };

    const nextMonthsEvents = getNextMonthsData(7);
    if (!nextMonthsEvents || Object.keys(nextMonthsEvents).length === 0) return;

    const sortedEvents = Object.entries(_webEvents)
        .filter(([_, wEvent]) =>
            (wEvent.materials && Object.keys(wEvent.materials).length > 0)
            || (wEvent.farms && wEvent.farms.length > 0)
            && wEvent.date)
        //sort pure events first
        .sort(([, a], [, b]) => {
            const sort = new Date(a.date!).getTime() - new Date(b.date!).getTime();
            return sort !== 0 ? sort
                : (a.farms ? -1 : 0) + (b.farms ? 1 : 0); //events with farms first 
        })
    //Apply +6 months shift and known dates with relative positioning
    const shiftedEvents = applyGLDatesShift(sortedEvents)
        //remove one month ago dates to auto clear shifted events/IS etc
        .filter(([_, wEvent]) => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);        
        return wEvent.date && wEvent.date >= oneMonthAgo;
    });
    const _eventsData = shiftedEvents.concat(
        Object.entries(nextMonthsEvents).map(([name, event]) => {
            //name is May 31, 2025, convert to last day of month date
            const date = new Date(name);
            const webEvent: WebEvent = {
                ...event,
                pageName: name,
                name: `${date.toLocaleString('en-US', {
                    month: 'long',
                    year: 'numeric'
                })} - Missions/Logins`,
                date: date,
                link: ""
            }
            return [name, webEvent] as [string, WebEvent];
        }))
        .sort(([, a], [, b]) => {
            return new Date(a.date!).getTime() - new Date(b.date!).getTime();
        }).reduce((acc, [_, event], idx) => {
            const _name = event.name ?? event.pageName;
            acc[_name] = {
                index: idx,
                materials: event.materials ?? {},
            }
            if (event.farms) {
                acc[_name].farms = event.farms;
            }
            if (event.infinite) {
                acc[_name].infinite = event.infinite;
            }
            return acc
        }, {} as EventsData)
    return _eventsData;
}

export const getEventsFromWebEvents = (webEvents: WebEventsData): EventsData => {
    return Object.entries(webEvents)
        .filter(([_, wEvent]) =>
            (wEvent.materials && Object.keys(wEvent.materials).length > 0)
            || (wEvent.farms && wEvent.farms.length > 0))
        .sort(([, a], [, b]) => {
            if (!a.date) return 1;
            if (!b.date) return -1;

            const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
            if (dateCompare !== 0) return dateCompare;

            const baseCompare = (a.name?.slice(0, -2) ?? "").localeCompare(b.name?.slice(0, -2) ?? "");
            if (baseCompare !== 0) return baseCompare;
            return (b.name?.slice(-2) ?? "").localeCompare(a.name?.slice(-2) ?? "");
        })
        .reduce((acc, [_, item], idx) => {
            const _name = `(${getDateString(item.date ?? new Date())}) ${item.name ?? item.pageName}`;
            acc[_name] = {
                index: idx,
                materials: item.materials ?? {},
            }
            if (item.farms) {
                acc[_name].farms = item.farms;
            }
            return acc
        }, {} as EventsData)
}

export const getDateString = (date: Date | string) => {
    if (!date) return "";
    const _date = new Date(date);
    const day = String(_date.getDate()).padStart(2, '0');
    const month = String(_date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const year = _date.getFullYear();

    return `${day}-${month}-${year}`;
}

export const applyGLDatesShift = (events: [string, WebEvent][]): [string, WebEvent][] => {
    let firstKnownEvent: { key: string; event: WebEvent; newDate: Date; sixMonthDate: Date } | null = null;

    for (const [eventName, fixedDate] of Object.entries(GL_EVENT_DATES)) {
        const existingEvent = events.find(([_, wEvent]) => wEvent.name === eventName && fixedDate !== "remove");
        if (existingEvent) {
            const [key, wEvent] = existingEvent;
            const newDate = new Date(fixedDate);
            const sixMonthDate = new Date(wEvent.date!);
            sixMonthDate.setMonth(sixMonthDate.getMonth() + 6);

            if (!firstKnownEvent || newDate.getTime() < firstKnownEvent.newDate.getTime()) {
                firstKnownEvent = {
                    key,
                    event: wEvent,
                    newDate,
                    sixMonthDate
                };
            }
        }
    }

    if (!firstKnownEvent) {
        return events.map(([key, wEvent]) => {
            const date = new Date(wEvent.date!);
            const name = wEvent.name || '';
            date.setMonth(date.getMonth() + 6
                + (name.startsWith("IS") ? IS_START_MONTH_SHIFT : 0));
            return [key, { ...wEvent, date }];
        });
    }
    const firstSixMonth = firstKnownEvent.sixMonthDate.getTime();
    const firstNew = firstKnownEvent.newDate.getTime();
    let runningShiftTime = firstNew - firstSixMonth;
    let prevNewDate = new Date(firstNew);
    let ignoredSixMonthDate: Date | null = null;
    console.log("shifting event dates result:");
    return events
        .filter(([_, { name }]) =>
            !name || !(name in GL_EVENT_DATES)
            || name in GL_EVENT_DATES && GL_EVENT_DATES[name] !== "remove")
        .map(([key, wEvent]) => {
            const name = wEvent.name || '';
            const sixMonthDate = new Date(wEvent.date!);
            sixMonthDate.setMonth(sixMonthDate.getMonth() + 6
                + (name.startsWith("IS") ? IS_START_MONTH_SHIFT : 0));

            if (name.startsWith("IS") || name.startsWith("Annihilation") || name.startsWith("SSS")) {
                console.log("+6m - operation:", name);
                return [key, { ...wEvent, date: sixMonthDate }];
            }

            const applyDiffToShift = (ignoredDate: Date | null, currentDate: Date, runningShiftTime: number): number => {
                if (ignoredDate) {
                    const ignoredDiff = currentDate.getTime() - ignoredDate.getTime();
                    runningShiftTime -= ignoredDiff;
                }
                return runningShiftTime;
            }

            // Handle known events
            if (name in GL_EVENT_DATES) {
                const newDate = new Date(GL_EVENT_DATES[name]);
                //event was moved back in shedule, save its date for ref
                if (newDate.getTime() < prevNewDate.getTime()) {
                    ignoredSixMonthDate = new Date(sixMonthDate);
                } else { //wasn't moved back shift
                    runningShiftTime = newDate.getTime() - sixMonthDate.getTime();

                    runningShiftTime = applyDiffToShift(ignoredSixMonthDate, sixMonthDate, runningShiftTime);
                    ignoredSixMonthDate = null;
                }
                prevNewDate = new Date(newDate);
                console.log(((newDate.getTime() - sixMonthDate.getTime()) / (1000 * 60 * 60 * 24)).toFixed(0), "days +6m shift - known date:", wEvent.name );
                return [key, { ...wEvent, date: newDate }];
            }

            runningShiftTime = applyDiffToShift(ignoredSixMonthDate, sixMonthDate, runningShiftTime);
            ignoredSixMonthDate = null;

            //Put events that were before first known relative to it
            const sixMonth = sixMonthDate.getTime();
            if (sixMonth < firstSixMonth
                && sixMonth > firstNew) {
                const timeDiff = firstSixMonth - sixMonth;
                const adjustedDate = new Date(firstNew - timeDiff);
                prevNewDate = new Date(adjustedDate);
                console.log(((adjustedDate.getTime() - sixMonthDate.getTime()) / (1000 * 60 * 60 * 24)).toFixed(0), "days +6m shift - event before known:", wEvent.name);
                return [key, { ...wEvent, date: adjustedDate }];
            } else if (sixMonth === firstSixMonth) {
                prevNewDate = new Date(firstKnownEvent.newDate);
                console.log("repeat date - event before known", wEvent.name);
                return [key, { ...wEvent, date: firstKnownEvent.newDate }];
            }

            // Normal shift for other unknown events (those before first known event)
            console.log((runningShiftTime / (1000 * 60 * 60 * 24)).toFixed(0), "days +6m shift - normal inverval:", wEvent.name);
            const adjustedDate = new Date(sixMonth + runningShiftTime);
            prevNewDate = new Date(adjustedDate);
            return [key, { ...wEvent, date: adjustedDate }];
        });
};
