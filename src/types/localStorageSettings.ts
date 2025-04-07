import { EventsData } from "../lib/events/types";

export interface LocalStorageSettings {
    version: string;
    eventsIncomeData?: EventsData;
}

export const defaultSettings: LocalStorageSettings = {
    version: "1",
};