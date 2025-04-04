import itemsJson from '../data/items.json';

export const getItemBaseStyling = (variant: "tracker" | "summary" | "builder" | "selector" | number, smaller: boolean = false) => {

    let size: number;
    let adjust: number;

    switch (variant) {
        case "tracker": {
            size = 40 * 0.7;
            adjust = 8;
        };
            break;
        case "builder": {
            size = !smaller ? 40: 32;
            adjust = 12;
        }
            break;
        case "selector": {
            size = !smaller ? 32 : 28;
            adjust = 10;
        }
            break;
        default: {
            size = !smaller ? 64 : 56;
            adjust = 12;
        };
            break;
    }

    return ({
        baseSize: size,
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
                fontSize: `${size / 24 + adjust}px`,
            },
        }
    })
};

export const isTier3Material = (id: string) => {
    return (Number(id) > 30000 && Number(id) < 32000 && itemsJson[id as keyof typeof itemsJson].tier === 3)
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
              ? 1.4
              : 1.15
        }
    }    
    
    let startSize: number = 2.5;
    if (defaultSizeInCh.includes('ch'))
        startSize = Number(defaultSizeInCh.replace('ch', '').trim());

    if (startSize - effectiveLengh > 0) return defaultSizeInCh;
    else return `${2 + (effectiveLengh - 1 )}ch`; // Start at 2.5ch for 1 char
};