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

export type SubmitEventProps = {
    targetName: string,
    sourceName: string | null,
    targetEventIndex: number,
    materialsToDepot: [string, number][],
    materialsToEvent: Record<string, number> | false,
    farms: string[],
    action: 'create' | 'modify' | 'replace' | 'remove',
}

export interface EventsSelectorProps {
    dataType: 'events' | 'months' | 'defaults' | 'web' | 'summary';
    emptyItem?: string;
    disabled?: boolean;
    eventsData: EventsData;
    selectedEvent?: Event | null;
    onChange?: (namedEvent: NamedEvent) => void;
}