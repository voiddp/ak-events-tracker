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
    title?: string;
    date?: Date;        
    link: string;
  } & Event;

export type WebEventsData = {
    [label: string]: WebEvent
}

export const emptyEvent: Event = { index: -1, materials: {} }
export const emptyWebEvent: WebEvent = { ...emptyEvent, pageName:"", link:""};