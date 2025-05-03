import { WebEventsData } from "../prtsWiki/types";

export type Event = {
    index: number;
    materials: {
        [key: string]: number;
    };
    farms?: string[];
    infinite?: string[];
}

export type NamedEvent = Event & {
    name: string;
};

export type EventsData = {
    [name: string]: Event;
}

export type SubmitEventProps = {
    targetName: string,
    sourceName: string | null,
    targetEventIndex: number,
    materialsToDepot: [string, number][],
    materialsToEvent: Record<string, number> | false,
    farms: string[],
    infinite: string[],
    action: 'create' | 'modify' | 'replace' | 'remove',
}

export interface EventsSelectorProps {
    dataType: 'events' | 'months' | 'defaults' | 'defaultsWeb' | 'summary';
    emptyItem?: string;
    disabled?: boolean;
    eventsData: EventsData;
    selectedEvent?: Event | null;
    onChange?: (namedEvent: NamedEvent) => void;
}

export type SubmitSource = EventsSelectorProps['dataType'] | 'current' | 'currentWeb'

export interface TrackerDefaults {
    lastUpdated?: string;
    webEventsData?: WebEventsData;
    eventsData?: EventsData;
}