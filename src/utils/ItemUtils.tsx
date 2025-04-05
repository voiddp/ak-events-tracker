import itemsJson from '../data/items.json';
import { Item } from '@/types/item';

export const MAX_SAFE_INTEGER = 2147483647;

export const AK_CALENDAR = {
    1: { "4001": 2000 },
    8: { "4001": 4000 },
    15: { "4001": 6000 },
    22: { "4001": 8000 },
    29: { "4001": 10000 },
    2: { "2001": 10 },
    9: { "2002": 10 },
    16: { "2003": 6 },
    23: { "2004": 4 },
    30: { "2004": 5 },
    4: { "4006": 8 },
    18: { "4006": 25 },
    6: { "3301": 5 },
    13: { "3301": 10 },
    20: { "3302": 5 },
    27: { "3303": 6 },
    28: { "4006": 1 }
};

export const AK_DAILY = {
    "4001": 9500,
    "4006": 5,
    "2001": 8,
    "2002": 5,
    "2003": 6,
}

export const AK_WEEKLY = {
    "4001": 23000,
    "3301": 5,
    "2001": 4,
    "2002": 4,
    "2003": 4,
    "2004": 9,
    "4006": 30,
    "mod_unlock_token": 1
}

export const getItemBaseStyling = (variant: "tracker" | "summary" | "builder" | "selector" | "submit" | number, smaller: boolean = false) => {

    let size: number;
    let textAdjust = 12;

    switch (variant) {
        case "tracker": {
            size = 34;
            textAdjust = 8;
        };
            break;
        case "submit": {
            size = 28;
        };
            break;
        case "builder": {
            size = !smaller ? 40 : 32;
        }
            break;
        case "selector": {
            size = !smaller ? 32 : 28;
            textAdjust = 10;
        }
            break;
        default: {
            size = !smaller ? 64 : 56;
        };
            break;
    }

    return ({
        itemBaseSize: size,
        numberCSS: {
            component: "span",
            sx: {
                display: "inline-block",
                py: 0.25,
                px: 0.5,
                lineHeight: 1,
                mr: `${size / 16}px`,
                mb: `${size / 16}px`,
                alignSelf: "end",
                justifySelf: "end",
                backgroundColor: "background.paper",
                zIndex: 1,
                fontSize: `${size / 24 + textAdjust}px`,
            },
        }
    })
};

export const isMaterial = (id: string, tier?: number) => {
    return (Number(id) > 30000 && Number(id) < 32000 && (tier ? (itemsJson[id as keyof typeof itemsJson].tier === tier) : true))
};

const summarySortId: [string, number][] = [
    ["LMD", -3],
    ["EXP", -2],
    ["Certificate", -1],
    //all mats= 0
    ["Summary", 1],
    ["Catalyst", 3],
    ["chip", 2],
    ["Chip", 2],
    ["Data", 4],
];

export const customItemsSort = (idA: string, idB: string, lowTierFirst: boolean = false, variant?: string) => {
    const customSortId = summarySortId; //change for variants later

    const itemA = itemsJson[idA as keyof typeof itemsJson];
    const itemB = itemsJson[idB as keyof typeof itemsJson];
    const itemAlocalSortID = customSortId.find(keyword => itemA.name.includes(keyword[0]))?.[1] ?? 0;
    const itemBlocalSortID = customSortId.find(keyword => itemB.name.includes(keyword[0]))?.[1] ?? 0;
    return (
        (itemAlocalSortID - itemBlocalSortID) ||
        (!lowTierFirst ? (itemB.tier - itemA.tier) : (itemA.tier - itemB.tier)) ||
        (itemB.sortId - itemA.sortId)
    )
};

export const standardItemsSort = (idA: string, idB: string, reverse: boolean = false) => {
    const sortIdA = itemsJson[idA as keyof typeof itemsJson].sortId;
    const sortIdB = itemsJson[idB as keyof typeof itemsJson].sortId;
    return (!reverse
        ? sortIdA - sortIdB
        : sortIdB - sortIdA)
};

export const formatNumber = (num: number) => {
    return num < 1000
        ? num
        : num < 1000000
            ? `${num % 1000 === 0 ? `${num / 1000}` : (num / 1000).toFixed(1)}K`
            : `${num % 1000000 === 0 ? `${num / 1000000}` : (num / 1000000).toFixed(2)}M`;
};


export const getWidthFromValue = (value: string | number, defaultSizeInCh: string = "4ch"): string => {

    let numberDigits: number;
    let effectiveLengh = 0;

    if (!isNaN(Number(value))) {
        const numValue = Math.abs(Number(value));
        numberDigits = numValue === 0 ? 1 : Math.floor(Math.log10(numValue)) + 1;
        effectiveLengh = numberDigits;
    } else {
        const strValue = String(value).trim();
        if (!strValue) return defaultSizeInCh;

        for (const char of strValue) {
            effectiveLengh += char === char.toUpperCase() && char !== char.toLowerCase()
                ? 1.55
                : /\d/.test(char)
                    ? 1
                    : /[,.]/.test(char)
                        ? 0
                        : 1.15
        }
    }

    let startSize: number = 2.5;
    if (defaultSizeInCh.includes('ch'))
        startSize = Number(defaultSizeInCh.replace('ch', '').trim());

    if (startSize - effectiveLengh > 0) return defaultSizeInCh;
    else return `${2 + (effectiveLengh - 1)}ch`; // Start at 2.5ch for 1 char
};

export const getDefaultEventMaterials = (itemJson: Record<string, Item> = itemsJson): string[] => {
    return Object.keys(itemJson)
        .map((id) => itemJson[id as keyof typeof itemJson])
        .filter((item) =>
            ["EXP", "Dualchip"].every((keyword) => !item.name.includes(keyword)))
        .map((item) => item.id)
        .sort((idA, idB) => standardItemsSort(idA, idB));
};

export const getItemByCnName = (cnName: string, tier?: number, material: boolean = false, itemJson: Record<string, Item> = itemsJson): Item | undefined => {
    const matchedItem = Object.values(itemJson).find(
        (item) => {
            if (!(`cnName` in item)) return false;

            const isCnNameMatch = item.cnName === cnName;
            let matTierMatch = material ? isMaterial(item.id, tier) : true;
            return isCnNameMatch && matTierMatch;
        }
    ) as Item | undefined;
    return matchedItem;
}