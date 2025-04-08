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
    eventName: string,
    selectedEventIndex: number,
    materialsToDepot: [string, number][],
    materialsToEvent: Record<string, number> | false,
    farms: string[],
    replaceName: string | false,
}

export type eventSelectorProps = {
    variant: "summary" | "builder";
    disabled: boolean;
};