export type Event = {
    index: number;
    materials: {
        [key: string]: number;
    };
    farms?: string[];
}

export type NamedEvent = Event & {
    name: string;
};

export type EventsData = {
    [name: string]: Event;
}

export type WebEvent = {
    pageName: string;
    date?: Date;
    link: string;
    //+remove for release;
    title?: string;
    //-
} & Omit<Partial<NamedEvent>, 'index'>

export type WebEventsData = {
    [pageName: string]: WebEvent
}

export type SubmitEventProps = {
    eventName: string,
    selectedEventIndex: number,
    materialsToDepot: [string, number][],
    materialsToEvent: Record<string, number> | false,
    farms: string[],
    replaceName: string | false,
}

export const emptyEvent: Event = { index: -1, materials: {} }
export const emptyNamedEvent: NamedEvent = { ...emptyEvent, name: "", farms: [] }
export const emptyWebEvent: WebEvent = { pageName: "", link: "" };

export const reindexEvents = (eventsData: EventsData | [string, Event][]): EventsData => {
    const eventsArray = Array.isArray(eventsData)
        ? eventsData
        : Object.entries(eventsData).sort(([, a], [, b]) => a.index - b.index);

    return eventsArray.reduce((acc, [name, data], idx) => {
        const newData = { ...data, index: idx };

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
