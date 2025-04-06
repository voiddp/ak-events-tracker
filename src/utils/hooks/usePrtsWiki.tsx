'use client'
import { useCallback, useState } from 'react';
import * as cheerio from 'cheerio';
import itemsJson from '@/data/items.json';
import { getItemByCnName } from '@/utils/ItemUtils';
import { fetchHtml, fetchJson } from '@/lib/axiosServer';
import { LinearProgress } from '@mui/material';
import { randomBytes } from 'crypto';
import { WebEvent, WebEventsData, emptyEvent, emptyWebEvent } from '@/types/events';
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
  operations: '关卡一览/常态事务',
  integratedStrategyList: '模板:集成战略导航',
  IS_navbox: '模板:Navbox_集成战略'
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
  curAniDate: `结束时间`,
  link: `link=`,
  themeUpdateHistory: '主题更新记录',
  totals: '报酬合计',
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

  const getWikitextFromApiJson = async (pageName: string) => {
    setError(null);
    try {
      const response = await fetchJson<MediaWikiApiResponse>(getApiUrl(pageName), sessionId);
      const page = Object.values(response.query.pages)[0];
      const wikitext = page.revisions?.[0]?.slots?.main?.['*'] || '';
      return wikitext;

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }
  };

  const fetchArgumentsByName = async (pageName: string, argument: string) => {
    setError(null);
    try {
      const wikitext = await getWikitextFromApiJson(pageName);
      if (!wikitext) return null;
      const argumentRegex = new RegExp(`${argument}([^|\\]\\n]+)`, 'g');
      const matches = wikitext.match(argumentRegex)
      if (!matches) return null;

      const values = matches.map(m => m.replace(argument, ''));
      return values;

    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
    }

  }

  const fetchTemplateArguments = async (pageName: string, templateName: string) => {
    setError(null);
    try {
      const wikitext = await getWikitextFromApiJson(pageName);
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

      setProgress(prev => ({ ...prev ?? {}, "LIST": 10 }));
      //get normal events
      const webEvents = await fetchEvents(monthsAgoDate);

      setProgress(prev => ({ ...prev ?? {}, "LIST": 20 }));
      //get SSS last event
      const sssArgs = await fetchTemplateArguments(pageNames.operations, templates.sss);

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
      setProgress(prev => ({ ...prev ?? {}, "LIST": 30 }));
      //get anihilation events      
      const aniArgs = await fetchTemplateArguments(pageNames.operations, templates.anihilations);
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

      //Integrated Strategies
      const ISEvents = await fetchLastISEvents(monthsAgoDate);
      if (ISEvents && Object.keys(ISEvents).length > 0) {
        Object.values(ISEvents).forEach(event =>
          webEvents[event.pageName] = { ...event }
        )
      };

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


  const fetchLastISEvents = async (monthsAgoDate: Date) => {
    setError(null);
    try {
      setProgress(prev => ({ ...prev ?? {}, "LIST": prev["LIST"] + 10 }));
      const ISPages = await fetchArgumentsByName(pageNames.integratedStrategyList, argNames.link);
      if (!ISPages || ISPages.length < 2) return null;

      setProgress(prev => ({ ...prev ?? {}, "LIST": prev["LIST"] + 10 }));
      const NAV_wikiText = await getWikitextFromApiJson(pageNames.IS_navbox);
      if (!NAV_wikiText) return null;

      const resultData: WebEventsData = {};
      for (let i = 1; i <= 2; i++) {
        const ISpage = ISPages[ISPages.length - i];
        const ISprefix = `IS${ISPages.length - i}:`

        //get subpages
        const pattern = new RegExp(`\\[\\[${ISpage}\\/([^\\]\\|]+)(?:[\\]\\|])?`, 'g');
        const matches: string[] = [];
        let match;
        while ((match = pattern.exec(NAV_wikiText)) !== null && matches.length < 2) {
          const subpage = match[1];
          if (subpage) {
            matches.push(subpage);
          }
        }
        if (matches.length < 2) return;
        const [squadsSubpage, deepSubpage] = matches;
        /* const ISsquads = `${ISpage}/${squadsSubpage}`;
        const ISdeep = `${ISpage}/${deepSubpage}`; */
        /* console.log(getUrl(ISpage), `
        `, getUrl(`${ISpage}/${squadsSubpage}`), `
        `, getUrl(`${ISpage}/${deepSubpage}`)); */

        setProgress(prev => ({ ...prev ?? {}, "LIST": prev["LIST"] + 10 }));
        const html_main = await fetchHtml(getUrl(ISpage), sessionId);
        const $_main = cheerio.load(html_main);
        const IShistoryDates = parseISHistoryTable($_main, squadsSubpage, deepSubpage);
        if (IShistoryDates && Object.keys(IShistoryDates).length > 0) {
          /* console.log(IShistoryDates); */
          //if any IS months in target date - fetch ani months
          if (Object.entries(IShistoryDates)
            .some(([name, date]) =>
              name !== deepSubpage && date >= monthsAgoDate)) {

            const ISMonthlyEvents = parseISMonthsTabber($_main, IShistoryDates, ISpage, ISprefix, deepSubpage);
            if (ISMonthlyEvents && Object.keys(ISMonthlyEvents).length > 0) {

              //fetch squads page
              setProgress(prev => ({ ...prev ?? {}, "LIST": prev["LIST"] + 10 }));
              const html_squads = await fetchHtml(getUrl(`${ISpage}/${squadsSubpage}`), sessionId);
              const $_squads = cheerio.load(html_squads);

              const squadsData = parseISSquadsPage($_squads, Object.keys(IShistoryDates));
              Object.values(ISMonthlyEvents).forEach(event => {
                if (event.date && event.date >= monthsAgoDate) {

                  const _event = {
                    ...emptyEvent,
                    ...event,
                    webDisable: true,
                  }
                  const _page = event.pageName;

                  if (squadsData[_page])
                    _event.name = _event.name?.replace(event.pageName, squadsData[_page].title);

                  Object.entries(squadsData[_page].materials)
                    .forEach(([id, amount]) => {
                      if (!_event.materials) _event.materials = {};

                      _event.materials[id] = (_event.materials[id] ?? 0) + amount;
                    });
                  resultData[_page] = _event;
                }
              })
            }
          };
        }

        //deep investigation - fetch once
        if (IShistoryDates[deepSubpage] >= monthsAgoDate) {

          setProgress(prev => ({ ...prev ?? {}, "LIST": prev["LIST"] + 10 }));
          const html = await fetchHtml(getUrl(`${ISpage}/${deepSubpage}`), sessionId);
          const $ = cheerio.load(html);
          let deepResult: Record<string, number> = {};
          deepResult = parseNumDivs($, deepResult);
          const deepEvent = {
            ...emptyEvent,
            date: IShistoryDates[deepSubpage],
            materials: deepResult,
            pageName: `${ISpage}/${deepSubpage}`,
            link: getUrl(`${ISpage}/${deepSubpage}`),
            name: `${ISprefix} Deep Investigations`
          }
          resultData[deepEvent.pageName] = deepEvent;
        }
      }
      return resultData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      throw err;
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
      result = parseTextRewards($, result);
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

const parseISHistoryTable = ($: cheerio.CheerioAPI, squadsSubpage: string, deepSubpage: string): Record<string, Date> => {

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

const parseISMonthsTabber = (
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

        const matchedItem = getItemByCnName(title, 3, true);

        if (matchedItem && !foundItems.includes(matchedItem.id)) {
          foundItems.push(matchedItem.id);
        }
      });
    }
  });

  return foundItems;
};

const parseNumDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
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
    } else if ($element.is('div')) {
      //parse one divs outside of table ros same way
      const $div = $element;
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
    }
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

const parseTextRewards = ($: cheerio.CheerioAPI, result: Record<string, number>) => {

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

function parseISSquadsPage($: cheerio.CheerioAPI, keywords: string[]) {

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