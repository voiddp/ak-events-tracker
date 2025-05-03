import { NamedEvent } from "@/lib/events/types";
import { Session } from '@/lib/axios/types';

export interface PageResult {
    title: string | null;
    items: Record<string, number>;
    farms: string[] | null;
    infinite: string[] | null;
}

export interface MediaWikiApiResponse {
    query: {
        pages: Record<string, {
            revisions?: Array<{
                slots?: {
                    main?: {
                        '*'?: string;
                    };
                };
            }>;
        }>;
    };
}

export type WebEvent = {
    pageName: string;
    date?: Date;
    link: string;
    webDisable?: boolean;
    //+remove for release;
    title?: string;
    //-
} & Omit<Partial<NamedEvent>, 'index'>

export type WebEventsData = {
    [pageName: string]: WebEvent
}

export type ProgressUpdater = (key: string, value: number) => void;

export type ApiContext = {
    session: Session;
    setProgress?: ProgressUpdater;
};