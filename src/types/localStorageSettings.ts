import { EventsData } from "./events";

export interface LocalStorageSettings {
    version: string;
    eventsIncomeData?: EventsData;
}

export const defaultSettings: LocalStorageSettings = {
    version: "1",
};