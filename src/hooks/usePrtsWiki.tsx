'use client'
import { useState, useEffect } from 'react';
import * as cheerio from 'cheerio';
import itemsJson from '../data/items.json';
import { fetchHtml, fetchJson } from '../lib/axiosServer';

type WebEvent = {
  date: Date;
  title: string;
  link: string;
};

type ItemResult = {
  items: Record<string, number>;
  farms: string[];
};

interface MediaWikiApiResponse {
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

const pageNames = {
  events: '活动一览',
  operations: '关卡一览/常态事务'
};

const templates = {
  anihilations: '剿灭作战',
  sss: '保全派驻/Ver2',
};

const argNames = {
  sssMission: '派驻周期名',
  sssEndDate: '派驻周期刷新时间',
  aniPrefix: '委托',
  curAniPrefix: '轮换委托',
  curAniDate: `结束时间`
};

const getUrl = (pageTitle: string) => {
  return `https://prts.wiki/w/${encodeURIComponent(pageTitle)}`
}

const getApiUrl = (pageTitle: string) => {
  return `https://prts.wiki/api.php?
    action=query&
    titles=${encodeURIComponent(pageTitle)}&
    prop=revisions&
    rvprop=content&
    rvslots=main&
    format=json`
};

export const usePrtsWiki = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = async (monthsAgoDate: Date): Promise<WebEvent[]> => {
    setIsLoading(true);
    setError(null);
    try {

      const html = await fetchHtml(getUrl(pageNames.events));
      const $ = cheerio.load(html);

      const eventsArray: WebEvent[] = [];

      $('tr').each((_, element) => {
        const dateText = $(element).find('td').first().text().trim();
        const titleElement = $(element).find('td').eq(1).find('a');
        const today = new Date();

        if ((isDateTextValid(dateText)) && titleElement.length) {
          const date = new Date(dateText);

          if (date >= monthsAgoDate && date <= today) {

            const title = titleElement.text().trim();
            const link = titleElement.attr('href') || '';
            eventsArray.push({
              date: date,
              title,
              link: `https://prts.wiki${link}`
            });
          }

        }
      });

      return eventsArray;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchArgumentList = async (pageTitle: string, templateName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchJson<MediaWikiApiResponse>(getApiUrl(pageTitle));
      const page = Object.values(response.query.pages)[0];
      const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';
      if (!wikitext) return null;

      const templateRegex = new RegExp(`\\{\\{${templateName}\\s*\\|([^}]+)\\}\\}`);
      const match = wikitext.match(templateRegex);

      if (!match) return null;
      const args: Record<string, string> = {};
      match[1].split('|').forEach(part => {
        const [key, ...valueParts] = part.split('=').map(s => s.trim());
        if (key && valueParts.length) {
          args[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '');
        }
      });
      return args;

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getEventList = async (monthsAgo: number) => {
    try {
      const today = new Date();
      const monthsAgoDate = new Date();
      monthsAgoDate.setMonth(today.getMonth() - monthsAgo);

      //get normal events
      const webEvents = await fetchEvents(monthsAgoDate);


      //get SSS last event
      const sssArgs = await fetchArgumentList(pageNames.operations, templates.sss);

      if (sssArgs) {
        const link = getUrl(pageNames.operations);
        const dateText = (sssArgs[argNames.sssEndDate]);
        let date = new Date();
        if (isDateTextValid(dateText)) {
          date = new Date(sssArgs[argNames.sssEndDate]);
          date.setDate(date.getDate() - 4 * 4 * 7) //-4 months for SSS start date
        }

        if (date <= today && date > monthsAgoDate) {
          const sssEvent: WebEvent = { title: `SSS: ${sssArgs[argNames.sssMission]}`, link, date }
          webEvents.push(sssEvent);
        }
      }

      //get anihilation events      
      const aniArgs = await fetchArgumentList(pageNames.operations, templates.anihilations);
      if (aniArgs) {
        const anniEventList = getAniEventsList(aniArgs);

        anniEventList.filter(event => event.date >= monthsAgoDate && event.date <= today)
          .forEach(event => webEvents.push(event));
      }


      return webEvents.filter(event => event.date >= monthsAgoDate && event.date <= today)

    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }

  const getItemsFromPage = async (cnTitle: string, page_link: string): Promise<ItemResult | undefined> => {
    if (!page_link || !cnTitle) return;

    setIsLoading(true);
    setError(null);
    try {
      const html = await fetchHtml(page_link);
      const $ = cheerio.load(html);

      let result: Record<string, number> = {};
      const farms = findFarms($);
      result = parseSignInEvent($, result);
      result = parseShopInEvent($, result);
      result = parseNumDivs($, result);
      result = parseListDivs($, result);

      return { items: result, farms };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Loading component to be used by consumers
  const LoadingSpinner = () => (
    <div className="flex justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );

  return {
    getEventList,
    getItemsFromPage,
    error,
    isLoading,
    LoadingSpinner
  };
};

// Helper functions moved inside the hook file since they're only used here
const parseListDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('ul').each((_, ul) => {
    $(ul)
      .find('li')
      .each((_, li) => {
        const $li = $(li);
        const name = $li.find('div[class*="-name"] b').text().trim();
        const numText = $li.find('div[class*="-num"]').text().trim();

        if (name && numText) {
          const matchedItem = Object.values(itemsJson).find(
            (item) => 'cnName' in item && item.cnName === name
          );

          if (matchedItem) {
            const id = matchedItem.id;
            const match = numText.match(/^(\d+)[x×*]$/);

            if (match) {
              const value = parseChineseNumber(match[1]) ?? 0;
              if (value > 0) {
                result[id] = (result[id] || 0) + value;
              }
            }
          }
        }
      });
  });

  return result;
};

const parseChineseNumber = (input: string): number | null => {
  if (!input) return null;
  const match = input.match(/^(\d+)([万千百])?$/);

  if (match) {
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

const findFarms = ($: cheerio.CheerioAPI): string[] => {
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

        const matchedItem = Object.values(itemsJson).find(
          (item) => item.tier === 3 && `cnName` in item && item.cnName === title
        );

        if (matchedItem && !foundItems.includes(matchedItem.id)) {
          foundItems.push(matchedItem.id);
        }
      });
    }
  });

  return foundItems;
};

const parseNumDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('tr').each((_, tr) => {
    const $tr = $(tr);
    if ($tr.text().includes('报酬合计')) return;

    $tr.find('div').each((_, div) => {
      const $div = $(div);
      const title = $div.find('a').attr('title');

      if (title) {
        const matchedItem = Object.values(itemsJson).find(
          (item) => 'cnName' in item && item.cnName === title
        );

        if (matchedItem) {
          const id = matchedItem.id;
          const valueText = $div.find('span').text().trim();
          const value = parseChineseNumber(valueText) ?? 0;

          if (value > 0) {
            result[id] = (result[id] || 0) + value;
          }
        }
      }
    });
  });

  return result;
};

const parseShopInEvent = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('tr').each((_, row) => {
    const tds = $(row).find('td');
    if (tds.length < 2) return;

    let itemId: string | undefined;
    let multiplier = 1;
    let amount = 0;

    tds.each((_, td) => {
      const text = $(td).text().trim();

      if (!itemId) {
        itemId = Object.values(itemsJson).find(
          (item) => `cnName` in item && text.includes(item.cnName)
        )?.id;
        const match = text.match(/(?:[x×*])(\d+)/);
        if (match) multiplier = parseInt(match[1], 10);
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

const parseSignInEvent = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('p').each((_, element) => {
    const text = $(element).text();
    if (!text.includes('日')) return;

    Object.values(itemsJson).forEach((item) => {
      const { cnName } = item as { cnName: string };
      if (!cnName) return;
      const regex = new RegExp(`${cnName}[\\*xX](\\d+)`, 'g');
      let match;

      while ((match = regex.exec(text)) !== null) {
        const quantity = parseChineseNumber(match[1]) ?? 0;
        if (quantity > 0) {
          result[item.id] = (result[item.id] ?? 0) + quantity;
        }
      }
    });
  });
  return result;
};

const getAniEventsList = (data: Record<string, string>): WebEvent[] => {
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

  currentDate = subtractWeeks(currentDate, 8);

  // 3. Process events in reverse order (newest to oldest)
  const lastNumber = Number(data[`${argNames.curAniPrefix}${aniNumber}`]);
  for (let i = lastNumber; i >= 1; i--) {
    const eventKey = `${argNames.aniPrefix}${i}`;
    const title = data[eventKey];
    if (title) {
      events.push({
        date: new Date(currentDate),
        title: `Anihilation #${i}: ${title}`,
        link: getUrl(title)
      });

      // Move back 8 weeks for the previous event
      currentDate = subtractWeeks(currentDate, 8);
    }
  }
  return events;
}

const isDateTextValid = (dateText: string): boolean => {
  const dateTextRegExp = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/;

  return dateTextRegExp.test(dateText)
}

const subtractWeeks = (date: Date, weeks: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() - (weeks * 7));
  return result;
}