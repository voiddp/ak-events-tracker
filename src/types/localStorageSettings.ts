export interface LocalStorageSettings {
    version: string;
    eventsIncomeData: EventsData;
}

export interface Event {
    index: number;
    materials: {
        [key: string]: number;
    };
    farms?: string[];
}

export interface EventsData {
    [key: string]: Event; 
}

export const defaultSettings: LocalStorageSettings = {
    version: "1",
    eventsIncomeData: {}, 
};