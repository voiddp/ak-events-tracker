import * as cheerio from 'cheerio';
import { getItemByCnName } from '@/utils/ItemUtils';
import itemsJson from '@/data/items.json';
import { argNames } from './constants';
import { emptyWebEvent, WebEventsData } from './types';
import { getUrl } from './api';
import { addModuleBox, applyDictionary, escapeRegExp, isMostlyEnglish, parseChineseNumber } from './utils';

export const findENTitle = ($: cheerio.CheerioAPI): string | null => {
    let result: string | null = null;

    const unescaped = $.html().replace(/\\/g, '');
    const match = unescaped.match(/class=['"]fnameheader[^>]*>([^<]+)</);
    const title = match ? match[1].trim() : null;
    if (title && isMostlyEnglish(title)) {
        result = title;
    }
    const afterDictionary = applyDictionary(result);
    return (afterDictionary ? afterDictionary : result);
};

export const parseISHistoryTable = ($: cheerio.CheerioAPI, squadsSubpage: string, deepSubpage: string): Record<string, Date> => {
    const result: Record<string, Date> = {};

    // Find the theme update history table
    const themeUpdateHeader = $(`span.mw-headline`).filter((_, el) =>
        $(el).text().trim() === argNames.themeUpdateHistory
    );
    if (!themeUpdateHeader.length) return result;
    const historyTable = themeUpdateHeader.parent().next('table');
    if (!historyTable.length) return result;

    // Process each row in the table (skip header rows)
    historyTable.find('tr').each((i, row) => {
        //if (i < 2) return; // Skip first two header rows

        const cols = $(row).find('td');
        if (cols.length < 3) return;

        const dateText = $(cols[0]).text().trim();
        const updateContent = $(cols[1]).text().trim();
        const details = $(cols[2]).html() || '';

        // Parse date
        const dateMatch = dateText.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/);
        if (!dateMatch) return;

        const year = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // 0-indexed month
        const day = parseInt(dateMatch[3]);
        const date = new Date(year, month, day);

        // Check for deep investigation
        if (updateContent.includes(deepSubpage)) {
            result[deepSubpage] = date;
        }

        // Check for narrator list entries
        const tempDiv = $('<div>').html(details);
        tempDiv.find('a').each((_, link) => {
            const href = $(link).attr('href') || '';
            if ((href.includes(squadsSubpage) || href.includes(encodeURIComponent(squadsSubpage)))) {
                const linkText = $(link).text().trim();
                if (linkText) {
                    result[linkText] = date;
                }
            }
        });
    });

    return result;
};

export const parseISMonthsTabber = (
    $: cheerio.CheerioAPI,
    IShistory: Record<string, Date>,
    ISpage: string,
    ISprefix: string,
    deepSubpage: string): WebEventsData => {

    const WebEventsData_IS: WebEventsData = {};

    // Get all dates excluding the deepInvestigation entry
    const dates = Object.entries(IShistory)
        .filter(([key]) => key !== deepSubpage)
        .sort(([, a], [, b]) => a.getTime() - b.getTime())
        .forEach(([name, date], idx) => {

            // Format date as YY/MM (e.g., "25/02" for February 2025)
            const yearShort = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString(); // Months are 0-indexed in JS
            const datePattern = `${yearShort}/${month}`;

            // Find the tabber panel with matching data-title
            const tabPanel = $(`article.tabber__panel[data-title*="${datePattern}"]`);

            if (tabPanel.length > 0) {
                // Process the tab panel content
                const panel_$ = cheerio.load(tabPanel.html() || "");
                let result: Record<string, number> = {};
                result = parseListDivs(panel_$, result);

                const webEvent = {
                    ...emptyWebEvent,
                    pageName: name,
                    date: date,
                    link: getUrl(ISpage),
                    materials: result,
                    name: `${ISprefix} Month ${idx + 1} - ${name}`,
                }
                WebEventsData_IS[webEvent.pageName] = webEvent;
            }

        });
    return WebEventsData_IS;
}

export const parseListDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
    $('ul').each((_, ul) => {
        $(ul)
            .find('li')
            .each((_, li) => {
                const $li = $(li);
                const name = $li.find('div[class*="-name"] b').text().trim();
                const numText = $li.find('div[class*="-num"]').text().trim();

                if (name && numText) {
                    const matchedItem = getItemByCnName(name);
                    const match = numText.match(/^(\d+)[x×*]$/);

                    if (match) {
                        const value = parseChineseNumber(match[1]) ?? 0;
                        if (value > 0) {
                            if (name === argNames.moduleBox) {
                                addModuleBox(value, result);
                            }
                            if (matchedItem) {
                                const id = matchedItem.id;
                                result[id] = (result[id] || 0) + value;
                            }
                        }
                    }
                }
            });
    });

    return result;
};

export const findFarms = ($: cheerio.CheerioAPI): string[] => {
    const dropKeywords = ['固定掉落', '大概率', '小概率', '概率掉落'];
    const foundItems: string[] = [];

    $('td').each((_, element) => {
        const dropRateFound = $(element).find('span').filter((_, span) => {
            const text = $(span).text().trim();
            return dropKeywords.includes(text);
        }).length > 0;

        if (dropRateFound) {
            $(element).find('a').each((_, link) => {
                const title = $(link).attr('title')?.trim();
                if (!title) return;

                const matchedItem = getItemByCnName(title, 3, true);

                if (matchedItem && !foundItems.includes(matchedItem.id)) {
                    foundItems.push(matchedItem.id);
                }
            });
        }
    });

    return foundItems;
};

export const parseNumDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
    $('tr, div:not(tr div)').each((_, element) => {

        const $element = $(element);
        if ($element.is('tr')) {
            if ($element.text().includes(argNames.totals)) return; //ignore "totals" row, count only normals

            $element.find('div').each((_, div) => {
                //parse multiple divs in tr
                const $div = $(div);
                const title = $div.find('a').attr('title');

                if (title) {
                    const matchedItem = getItemByCnName(title);

                    const valueText = $div.find('span').text().trim();
                    const value = parseChineseNumber(valueText) ?? 0;

                    if (title === argNames.moduleBox) addModuleBox(value, result);

                    if (matchedItem) {
                        const id = matchedItem.id;

                        if (value > 0) {
                            result[id] = (result[id] || 0) + value;
                        }
                    }
                }
            });
        } else if ($element.is('div')) {
            //parse one divs outside of table ros same way
            const $div = $element;
            const title = $div.find('a').attr('title');

            if (title) {
                const matchedItem = getItemByCnName(title);

                const valueText = $div.find('span').text().trim();
                const value = parseChineseNumber(valueText) ?? 0;

                if (title === argNames.moduleBox) addModuleBox(value, result);

                if (matchedItem) {
                    const id = matchedItem.id;

                    if (value > 0) {
                        result[id] = (result[id] || 0) + value;
                    }
                }
            }
        }
    });

    return result;
};

export const parseShopInEvent = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
    $('tr').each((_, row) => {
        const tds = $(row).find('td');
        if (tds.length < 2) return;

        let itemId: string | undefined;
        let multiplier = 1;
        let amount = 0;

        tds.each((_, td) => {
            const text = $(td).text().trim();

            if (itemId && amount !== 0) return;

            if (!itemId) {
                const foundItem = Object.values(itemsJson).find(item => {
                    if (!('cnName' in item)) return false;
                    const nameRegex = new RegExp(
                        `^${escapeRegExp(item.cnName)}(?:\\s*[x×*]\\s*\\d+)?$`
                    );
                    return nameRegex.test(text)
                });
                if (foundItem) {
                    itemId = foundItem.id;

                    const multiplierMatch = text.match(/[x×*]\s*(\d+)$/);
                    if (multiplierMatch) {
                        multiplier = parseInt(multiplierMatch[1], 10);
                    }
                }
            } else if (amount === 0) {
                amount = parseChineseNumber(text) ?? 0;
                return false;
            }
        });

        if (itemId && amount > 0) {
            result[itemId] = (result[itemId] ?? 0) + amount * multiplier;
        }
    });
    return result;
};

export const parseTextRewards = ($: cheerio.CheerioAPI, result: Record<string, number>) => {

    //restrict text search to ouside of inner elements of table rows (other cases) and known li evenpoint case
    $('p, span, li:not([class*="eventpoint"])').not('tr p, tr span, tr li')
        .each((_, element) => {
            const fullText = $(element).text();
            const splits = fullText.split(/[,.;]/).map(part => part.trim()).filter(part => part);
            // if (!text.includes('日')) return; not restrict to sign-ins.

            Object.values(itemsJson).forEach((item) => {
                const { cnName } = item as { cnName: string };
                if (!cnName) return;
                const regex = new RegExp(`${cnName}[x×*]\s*(\\d+)`, 'g');
                let match;
                splits.forEach((text) => {
                    while ((match = regex.exec(text)) !== null) {
                        const quantity = parseChineseNumber(match[1]) ?? 0;
                        if (quantity > 0) {
                            result[item.id] = (result[item.id] ?? 0) + quantity;
                        }
                    }
                })
            });
        });
    return result;
};

export const parseISSquadsPage = ($: cheerio.CheerioAPI, keywords: string[]) => {
    const result: Record<string, { materials: Record<string, number>, title: string }> = {};
    let currentKeyword: string | null = null;
    let currentChunk = $('<div></div>');
    let currentTitle: string | null = null;

    // Find all h2 elements
    $('h2').each((i, h2) => {
        const $h2 = $(h2);
        const h2Text = $h2.text();
        if (!h2Text) return;

        // Check if this h2 contains any of keyword names
        const matchedKeyword = keywords.find(keyword => h2Text.includes(keyword));
        if (matchedKeyword) {
            // if chunk is started - end it and process
            if (currentKeyword && currentChunk.contents().length > 0) {

                const materials = parseNumDivs(cheerio.load(currentChunk.html() || ""), {});
                result[currentKeyword] = {
                    title: currentTitle || '',
                    materials,
                }
            }

            // Start new chunk
            currentKeyword = matchedKeyword;
            currentChunk = $('<div></div>');

            // Get the title from the following <p><b> element
            currentTitle = $h2.next('p').find('b').first().text().trim();

            // Start collecting elements for this chunk
            const chunkElements = $h2.nextUntil('h2');
            chunkElements.each((_, el) => {
                currentChunk.append($(el));
            });
        }
    });
    // Process the last chunk if it exists
    if (currentKeyword && currentChunk.contents().length > 0) {
        const materials = parseNumDivs(cheerio.load(currentChunk.html() || ""), {});
        result[currentKeyword] = {
            title: currentTitle || '',
            materials,
        }
    }

    return result;
}


