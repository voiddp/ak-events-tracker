import * as cheerio from 'cheerio';
import { fetchHtml, fetchJson } from '@/lib/axios/server';
import { Session } from '@/lib/axios/types';
import {
  PageResult,
  MediaWikiApiResponse,
  ApiContext,
  ProgressUpdater,
  WebEventsData,
  WebEvent
} from './types';
import {
  pageNames,
  templates,
  argNames,
  sssModuleFirstTime,
  moduleChunk
} from './constants';
import {
  parseISHistoryTable,
  parseISMonthsTabber,
  parseISSquadsPage,
  parseNumDivs,
  findENTitle,
  findFarms,
  parseTextRewards,
  parseShopInEvent,
  parseListDivs,
  parseSSSPageByNum
} from './parsers';
import { addItemsSet, getAniEventsList, isDateTextValid } from './utils';

export const getUrl = (pageTitle: string) => {
  return `https://prts.wiki/w/${encodeURIComponent(pageTitle)}`;
};

export const getApiUrl = (pageTitle: string) => {
  return `https://prts.wiki/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=revisions&rvprop=content&rvslots=main&format=json`;
};

export const getWikitextFromApiJson = async (pageName: string, context: ApiContext) => {
  const response = await fetchJson<MediaWikiApiResponse>(getApiUrl(pageName), context.session);
  const page = Object.values(response.query.pages ?? {})[0] ?? [];
  return page?.revisions?.[0]?.slots?.main?.['*'] || '';
};

export const fetchArgumentsByName = async (pageName: string, argument: string, context: ApiContext) => {
  const wikitext = await getWikitextFromApiJson(pageName, context);
  if (!wikitext) return null;
  const argumentRegex = new RegExp(`${argument}([^|\\]\\n]+)`, 'g');
  const matches = wikitext.match(argumentRegex);
  if (!matches) return null;
  return matches.map(m => m.replace(argument, ''));
};

export const fetchTemplateArguments = async (pageName: string, templateName: string, context: ApiContext) => {
  const wikitext = await getWikitextFromApiJson(pageName, context);
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
};

export const fetchEvents = async (monthsAgoDate: Date, context: ApiContext): Promise<WebEventsData> => {
  const html = await fetchHtml(getUrl(pageNames.events), context.session);
  const $ = cheerio.load(html);
  const eventsResult: WebEventsData = {};

  $('tr').each((_, element) => {
    if ($(element).find('td').css('display') === 'none') return true;

    const dateText = $(element).find('td').first().text().trim();
    const titleElement = $(element).find('td').eq(1).find('a');
    const today = new Date();

    if (isDateTextValid(dateText) && titleElement.length) {
      const date = new Date(dateText);
      if (date >= monthsAgoDate && date <= today) {
        const title = titleElement.text().trim();
        const link = titleElement.attr('href') || '';
        eventsResult[title] = {
          pageName: title,
          date: date,
          link: `https://prts.wiki${link}`,
        };
      }
    }
  });

  return eventsResult;
};

export const fetchLastISEvents = async (monthsAgoDate: Date, context: ApiContext, eventList: WebEventsData): Promise<WebEventsData | null> => {
  try {
    context.setProgress?.("LIST", 50);
    const ISPages = await fetchArgumentsByName(pageNames.integratedStrategyList, argNames.link, context);
    if (!ISPages || ISPages.length < 2) return null;

    context.setProgress?.("LIST", 60);
    const NAV_wikiText = await getWikitextFromApiJson(pageNames.IS_navbox, context);
    if (!NAV_wikiText) return null;

    const resultData: WebEventsData = {};

    for (let i = 1; i <= 2; i++) {
      const ISpage = ISPages[ISPages.length - i];
      const ISprefix = `IS${ISPages.length - i}:`;

      const pattern = new RegExp(`\\[\\[${ISpage}\\/([^\\]\\|]+)(?:[\\]\\|])?`, 'g');
      const matches: string[] = [];
      let match;
      while ((match = pattern.exec(NAV_wikiText)) !== null && matches.length < 2) {
        const subpage = match[1];
        if (subpage) matches.push(subpage);
      }
      if (matches.length < 2) continue;
      const [squadsSubpage, deepSubpage] = matches;

      context.setProgress?.("LIST", 70);
      const html_main = await fetchHtml(getUrl(ISpage), context.session);
      const $_main = cheerio.load(html_main);
      const IShistoryDates = parseISHistoryTable($_main, squadsSubpage, deepSubpage);

      if (IShistoryDates && Object.keys(IShistoryDates ?? {}).length > 0) {
        if (Object.entries(IShistoryDates ?? {}).some(([name, date]) =>
          name !== deepSubpage && date >= monthsAgoDate)) {
          
          //remove same named event from EventList
          delete eventList[ISpage];

          const ISMonthlyEvents = parseISMonthsTabber($_main, IShistoryDates, ISpage, ISprefix, deepSubpage);
          if (ISMonthlyEvents && Object.keys(ISMonthlyEvents ?? {}).length > 0) {
            context.setProgress?.("LIST", 40);
            const html_squads = await fetchHtml(getUrl(`${ISpage}/${squadsSubpage}`), context.session);
            const $_squads = cheerio.load(html_squads);
            const squadsData = parseISSquadsPage($_squads, Object.keys(IShistoryDates ?? {}));

            Object.values(ISMonthlyEvents ?? {}).forEach(event => {
              if (event.date && event.date >= monthsAgoDate) {
                const _event = {
                  ...event,
                  webDisable: true,
                };
                const _page = event.pageName;

                if (squadsData[_page]) {
                  _event.name = _event.name?.replace(event.pageName, squadsData[_page].title);
                }

                Object.entries(squadsData[_page]?.materials ?? {}).forEach(([id, amount]) => {
                  if (!_event.materials) _event.materials = {};
                  _event.materials[id] = (_event.materials[id] ?? 0) + amount;
                });
                resultData[_page] = _event;
              }
            });
          }
        }
      }

      if (IShistoryDates[deepSubpage] >= monthsAgoDate) {
        context.setProgress?.("LIST", 80);
        const html = await fetchHtml(getUrl(`${ISpage}/${deepSubpage}`), context.session);
        const $ = cheerio.load(html);
        const deepResult = parseNumDivs($, {});

        resultData[`${ISpage}/${deepSubpage}`] = {
          date: IShistoryDates[deepSubpage],
          materials: deepResult,
          pageName: `${ISpage}/${deepSubpage}`,
          link: getUrl(`${ISpage}/${deepSubpage}`),
          name: `${ISprefix} Deep Investigations`
        };
      }
    }
    return resultData;
  } catch (err) {
    throw err;
  }
};

export const getDataFromPage = async (pageName: string, page_link: string, context: ApiContext): Promise<PageResult | undefined> => {
  if (!page_link || !pageName) return;

  try {
    context.setProgress?.(pageName, 90);
    const html = await fetchHtml(page_link, context.session);
    const $ = cheerio.load(html);

    let result: Record<string, number> = {};
    const title = findENTitle($, pageName);
    const farms = findFarms($);
    result = parseTextRewards($, result);
    const { materials, infinite } = parseShopInEvent($, result);
    result = materials;
    result = parseNumDivs($, result);
    result = parseListDivs($, result);

    return { title, items: result, farms, infinite };
  } catch (err) {
    throw err;
  }
};

export const getEventList = async (monthsAgo: number, context: ApiContext) => {
  try {
    const today = new Date();
    const monthsAgoDate = new Date();
    monthsAgoDate.setMonth(today.getMonth() - monthsAgo);

    //correction by -7 days for server building list job to have ongoing events
    if (context.session.isServerJob) monthsAgoDate.setDate(monthsAgoDate.getDate() - 7);

    //shift IS start 1.25 month back
    const isStartDate = new Date(monthsAgoDate);
    isStartDate.setMonth(isStartDate.getMonth() - 1);
    isStartDate.setDate(isStartDate.getDate() - 7);

    context.setProgress?.("LIST", 10);
    const webEvents = await fetchEvents(monthsAgoDate, context);

    context.setProgress?.("LIST", 20);
    const sssArgs = await fetchTemplateArguments(pageNames.operations, templates.sss, context);
    if (sssArgs) {
      const dateText = sssArgs[argNames.sssEndDate];
      if (isDateTextValid(dateText)) {
        const date = new Date(dateText);
        date.setMonth(date.getMonth() - 4); // -4 months

        if (date > monthsAgoDate) {
          //fetch SSS data and add fixed modules
          const sssHtml = await fetchHtml(getUrl(pageNames.operations), context.session);
          const $_sss = cheerio.load(sssHtml);
          const results = parseNumDivs($_sss, {});
          addItemsSet(sssModuleFirstTime, 1, results);

          webEvents[sssArgs[argNames.sssMission]] = {
            pageName: sssArgs[argNames.sssMission],
            name: `SSS: ${sssArgs[argNames.sssMission]}`,
            link: getUrl(pageNames.operations),
            materials: results,
            webDisable: true,
            date
          };
        }
        //get one previous SSS if another -4 months date fits
        const sssPrevDate = new Date(date);
        sssPrevDate.setMonth(date.getMonth() - 4); // -4 more months
        if (sssPrevDate > monthsAgoDate) {
          const numMatch = sssArgs[argNames.sssMission].match(/#(\d{1,2})/);
          const sssPrevNum = numMatch ? (parseInt(numMatch[1], 10) - 1) : null;

          const sssHtml = await fetchHtml(getUrl(pageNames.all_sss), context.session);
          const $_sss = cheerio.load(sssHtml);

          const sssPrev = parseSSSPageByNum($_sss, `#${sssPrevNum}`);

          if (sssPrev)
            webEvents[sssPrev.pageName] = {
              ...sssPrev,
              date: sssPrevDate
            };
        }
      }
    }

    context.setProgress?.("LIST", 30);
    const aniArgs = await fetchTemplateArguments(pageNames.operations, templates.anihilations, context);
    if (aniArgs) {
      getAniEventsList(aniArgs)
        .filter(event => event.date && event.date >= monthsAgoDate)
        .forEach(event => {
          webEvents[event.pageName] = event;
        });
    }

    context.setProgress?.("LIST", 40);
    const ISEvents = await fetchLastISEvents(isStartDate, context, webEvents);
    if (ISEvents) {
      Object.values(ISEvents ?? {}).forEach(event => {
        webEvents[event.pageName] = event;
      });
    }

    return webEvents;
  } catch (err) {
    throw err;
  }
};

export const getEverythingAtOnce = async (session: Session, setProgress?: ProgressUpdater) => {
  const context: ApiContext = { session, setProgress };

  try {
    const eventsList = await getEventList(6, context);
    if (!eventsList || Object.keys(eventsList ?? {}).length === 0) return;

    const results: WebEvent[] = [];
    const entries = Object.entries(eventsList ?? {});

    for (const [i, [_, event]] of entries.entries()) {
      try {
        let webEvent: WebEvent;
        if (event.webDisable || Object.keys(event.materials ?? {}).length > 0) {
          webEvent = { ...event };
        } else {
          /* // Update progress
          setProgress?.({ current: i + 1, total: entries.length }); */

          const pageResult = await getDataFromPage(event.pageName, event.link, context);
          if (!pageResult) continue;

          webEvent = {
            ...event,
            materials: pageResult?.items ?? {},
          };

          if (pageResult?.farms) {
            webEvent.farms = pageResult.farms;
          }
          if (pageResult?.infinite) {
            webEvent.infinite = pageResult.infinite;
          }
          if (pageResult?.title) {
            webEvent.name = pageResult.title;
          }

          //force 1 unparsed moduleChunk into all "BATTLEPLAN" = CC
          //for now till better algorithm
          if (webEvent.name &&
            (webEvent.name.toLowerCase().includes("battleplan"))) {
            addItemsSet(moduleChunk, 1, webEvent.materials ?? {});
            webEvent.webDisable = true;
          };

        }
        results.push(webEvent);
      } catch (err) {
        console.error(`Failed to process ${event.pageName}:`, err);
      }
    }
    return results.reduce((acc, event) => {
      acc[event.pageName] = event;
      return acc;
    }, {} as WebEventsData);

  } catch (err) {
    throw err;
  }
};