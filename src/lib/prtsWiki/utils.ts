import { getUrl } from './api';
import { argNames, dictionary } from './constants';
import { WebEvent } from './types';

export const createEmptyWebEvent = () => {
    return { pageName: "", link: "" } as WebEvent;
}

export const isDateTextValid = (dateText: string): boolean => {
    const dateTextRegExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/;
    return dateTextRegExp.test(dateText)
}

export const subtractWeeks = (date: Date, weeks: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() - (weeks * 7));
    return result;
}

export const getAniEventsList = (data: Record<string, string>): WebEvent[] => {
    const events: WebEvent[] = [];

    // 1. Find current aniNumber (轮换委托)
    let aniNumber = 1;
    while (data[`${argNames.curAniPrefix}${aniNumber}`]
        && data[`${argNames.curAniPrefix}${aniNumber}${argNames.curAniDate}`]) {
        aniNumber++;
    }
    aniNumber--; // Get the last valid number

    if (aniNumber < 1) return events; // No current events found

    // 2. Get the end date of the current event
    const dateText = data[`${argNames.curAniPrefix}${aniNumber}${argNames.curAniDate}`];
    if (!isDateTextValid(dateText)) return events;

    let currentDate = new Date(dateText);

    // 3. Process events in reverse order (newest to oldest)
    const lastNumber = Number(data[`${argNames.curAniPrefix}${aniNumber}`]);
    for (let i = lastNumber; i >= 1; i--) {
        // Move back 8 week before #28, and 13 weeks after #28, from end Date
        const weeksToSub = i >= 28 ? 13 : 8;
        currentDate = subtractWeeks(currentDate, weeksToSub);

        const eventKey = `${argNames.aniPrefix}${i}`;
        const title = data[eventKey];
        if (title) {
            events.push({
                ...createEmptyWebEvent(),
                date: new Date(currentDate),
                pageName: title,
                name: `Annihilation #${i}: ${title}`,
                link: getUrl(title)
            });
        }
    }
    return events;
}

export const parseChineseNumber = (input: string): number | null => {
    if (!input) return null;
    const match = input.match(/^(∞|\d+)([万千百])?$/);

    if (match) {
        if (match[1]=== "∞") return Infinity;
        const num = parseInt(match[1], 10);
        const unit = match[2];

        if (!isNaN(num)) {
            switch (unit) {
                case '万': return num * 10000;
                case '千': return num * 1000;
                case '百': return num * 100;
                default: return num;
            }
        }
    }
    return null;
};

export const unescapeHtml = (escaped: string) => {
    return escaped.replace(/\\(.)/g, '$1');
}

export const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const isMostlyEnglish = (text: string): boolean => {
    const enLetters = text.match(/[A-Za-z]/g)?.length || 0;
    const totalLetters = text.replace(/\s+/g, '').length;
    return totalLetters > 0 && enLetters / totalLetters >= 0.5;
};

export const applyDictionary = (title: string | null): string | false => {
    let _title: string | false = false;
    if (!title?.trim()) return _title;

    Object.entries(dictionary).forEach(([key, value]) => {
        if (title.includes(key)) {
            const source = _title ? _title : title;
            _title = `${value}${source.includes(':') ? '' : ':'} ${source.replace(key, '').trim()}`;
        }
    });
    return _title;
}

export const addItemsSet = (set: Record<string, number>, number: number, result: Record<string, number>) => {
    Object.entries(set).forEach(([key, value]) => {
        result[key] = (result[key] ?? 0) + value * number;
    });
};

export const capitalizeWords = (str: string): string => {
    if (!str) return str;
    return str
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};