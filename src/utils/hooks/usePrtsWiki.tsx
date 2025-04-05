'use client'
import { useCallback, useState } from 'react';
import * as cheerio from 'cheerio';
import itemsJson from '@/data/items.json';
import { getItemByCnName } from '@/utils/ItemUtils';
import { fetchHtml, fetchJson } from '@/lib/axiosServer';
import { LinearProgress } from '@mui/material';
import { randomBytes } from 'crypto';
import { WebEvent, WebEventsData, emptyWebEvent } from '@/types/events';
import useLocalStorage from './useLocalStorage';

type PageResult = {
  title: string | null;
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
  sideStory: '活动信息',
  itemLeveReward: '关卡报酬',
  itemIcon: '道具图标',

};

const argNames = {
  sssMission: '派驻周期名',
  sssEndDate: '派驻周期刷新时间',
  aniPrefix: '委托',
  curAniPrefix: '轮换委托',
  curAniDate: `结束时间`
};

const dictionary = {
  '复刻': 'Rerun',
  'IN RETROSPECT': 'Rerun',
  '签到': 'Sign-in'
}

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

  const [webEvents, setWebEvents] = useLocalStorage<WebEventsData>("prtsWikiData", {});
  const sessionId = randomBytes(8).toString('hex')

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const fetchEvents = useCallback(
    async (monthsAgoDate: Date): Promise<WebEventsData> => {
      setError(null);
      try {

        const html = await fetchHtml(getUrl(pageNames.events), sessionId);
        const $ = cheerio.load(html);

        const eventsResult: WebEventsData = webEvents ?? {};

        $('tr').each((_, element) => {
          if ($(element).find('td').css('display') === 'none') return true;

          const dateText = $(element).find('td').first().text().trim();
          const titleElement = $(element).find('td').eq(1).find('a');
          const today = new Date();

          if ((isDateTextValid(dateText)) && titleElement.length) {
            const date = new Date(dateText);

            if (date >= monthsAgoDate && date <= today) {

              const title = titleElement.text().trim();
              const link = titleElement.attr('href') || '';
              eventsResult[title] = {
                ...eventsResult[title] ?? emptyWebEvent,
                pageName: title,
                date: date,
                link: `https://prts.wiki${link}`,
              }
            }

          }
        });

        return eventsResult;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        throw err;
      }
    }, [webEvents, sessionId]
  );

  const fetchArgumentList = async (pageName: string, templateName: string) => {
    setError(null);
    try {
      const response = await fetchJson<MediaWikiApiResponse>(getApiUrl(pageName), sessionId);
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
    }
  };

  const getEventList = async (monthsAgo: number) => {

    setLoading(prev => ({ ...prev ?? {}, "LIST": true }))

    try {
      const today = new Date();
      const monthsAgoDate = new Date();
      monthsAgoDate.setMonth(today.getMonth() - monthsAgo);
      setProgress(prev => ({ ...prev ?? {}, "LIST": 25 }));
      //get normal events
      const webEvents = await fetchEvents(monthsAgoDate);

      setProgress(prev => ({ ...prev ?? {}, "LIST": 50 }));
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
          const pageName = `${sssArgs[argNames.sssMission]}`;
          const name = `SSS: ${sssArgs[argNames.sssMission]}`;
          webEvents[pageName] = { ...(webEvents[pageName] ?? emptyWebEvent), pageName, name, link, date }
        }
      }
      setProgress(prev => ({ ...prev ?? {}, "LIST": 75 }));
      //get anihilation events      
      const aniArgs = await fetchArgumentList(pageNames.operations, templates.anihilations);
      if (aniArgs) {
        const anniEventList = getAniEventsList(aniArgs);

        anniEventList.filter(event => event.date && (event.date >= monthsAgoDate && event.date <= today))
          .forEach(event => {
            webEvents[event.pageName] = {
              ...webEvents[event.pageName] ?? emptyWebEvent,
              pageName: event.pageName,
              name: event.name,
              link: event.link,
              date: event.date
            }
          });
      }

      //apply dictionary
      Object.entries(webEvents ?? {}).forEach(([_, event]) => {
        const afterDictionary = applyDictionary(event.pageName);
        if (afterDictionary) event.name = afterDictionary;
      });
      return Object.entries(webEvents ?? {}).filter(([_, event]) => event.date && (event.date >= monthsAgoDate && event.date <= today))
        .reduce((acc, [_, event]) => {
          acc[event.pageName] = event;
          return acc;
        }, {} as WebEventsData);

    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setProgress(prev => ({ ...prev ?? {}, "LIST": 100 }));
      setLoading(prev => {
        const next = { ...prev };
        delete next["LIST"];
        return next;
      });
    }
  }

  const getDataFromPage = async (pageName: string, page_link: string): Promise<PageResult | undefined> => {
    if (!page_link || !pageName) return;

    setLoading(prev => ({ ...prev ?? {}, [pageName]: true }))
    setError(null);
    try {
      pageName
      setProgress(prev => ({ ...prev ?? {}, [pageName]: 90 }));
      const html = await fetchHtml(page_link, sessionId);
      const $ = cheerio.load(html);

      let result: Record<string, number> = {};
      const title = findENTitle($);
      const farms = findFarms($);
      result = parseSignInEvent($, result);
      result = parseShopInEvent($, result);
      result = parseNumDivs($, result);
      result = parseListDivs($, result);
      return { title, items: result, farms };
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    } finally {
      setLoading(prev => {
        const next = { ...prev };
        delete next[pageName];
        return next;
      });
    }
  };


  // Loading component to be used by consumers
  const ProgressElement = (pageName: string) => {
    /* console.log(`${pageName} : ${loading[pageName]} ${progress[pageName]} `) */
    return (
      <div style={{ width: "100%" }}>
        <LinearProgress variant="determinate" value={progress[pageName] ?? 0} />
      </div>
    )
  };

  return {
    webEvents,
    setWebEvents,
    getEventList,
    getDataFromPage,
    error,
    loading,
    ProgressElement
  };
};

// Helper functions
const findENTitle = ($: cheerio.CheerioAPI): string | null => {
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

function unescapeHtml(escaped: string) {
  return escaped.replace(/\\(.)/g, '$1');
}
const isMostlyEnglish = (text: string): boolean => {
  const enLetters = text.match(/[A-Za-z]/g)?.length || 0;
  const totalLetters = text.replace(/\s+/g, '').length;
  return totalLetters > 0 && enLetters / totalLetters >= 0.5;
};

const parseListDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('ul').each((_, ul) => {
    $(ul)
      .find('li')
      .each((_, li) => {
        const $li = $(li);
        const name = $li.find('div[class*="-name"] b').text().trim();
        const numText = $li.find('div[class*="-num"]').text().trim();

        if (name && numText) {
          const matchedItem = getItemByCnName(name);

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

        const matchedItem = getItemByCnName(title,3,true);

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
        const matchedItem = getItemByCnName(title);

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

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
        ...emptyWebEvent,
        date: new Date(currentDate),
        pageName: title,
        name: `Anihilation #${i}: ${title}`,
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

const applyDictionary = (title: string | null): string | false => {
  let _title: string | false = false;
  if (!title?.trim()) return _title;

  Object.entries(dictionary).forEach(([key, value]) => {
    if (title.includes(key)) {
      _title = title.replace(key, ` ${value} `).trim();
    }
  });
  return _title;
}