'use server'
import axios, { AxiosResponse } from 'axios';
import * as cheerio from 'cheerio';
import itemsJson from '../data/items.json'

export type WebEvents = {
  date: string;
  title: string;
  link: string;
};

const prtsWiki_Events = 'https://prts.wiki/w/%E6%B4%BB%E5%8A%A8%E4%B8%80%E8%A7%88';

export default async function fetchEvents() {
  try {
    const response = await axios.get(prtsWiki_Events);
    const $ = cheerio.load(response.data);

    const scrapedData: WebEvents[] = [];
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 7);

    $('tr').each((_, element) => {
      const dateText = $(element).find('td').first().text().trim();
      const titleElement = $(element).find('td').eq(1).find('a');

      if (dateText.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/) && titleElement.length) {
        const date = new Date(dateText);
        if (date >= sixMonthsAgo && date <= today) {

          const title = titleElement.text().trim();
          const link = titleElement.attr('href') || '';
          scrapedData.push({
            date: dateText,
            title,
            link: `https://prts.wiki${link}`
          });
        }
      }
    });

    return scrapedData;
  } catch (error) {
    console.error('Error fetching data:', error);
  }
};

export async function getItemsFromPage(cnTitle: string, page_link: string) {

  if (!page_link || !cnTitle) return;

  let result: Record<string, number> = {};

  try {
    const response = await axios.get(page_link);
    if (!(response.status >= 200
      && response.status < 300
      && response.data)) return;

    const $ = cheerio.load(response.data);
    const farms = findFarms($);
    result = parseSignInEvent($, result);
    result = parseShopInEvent($, result);
    result = parseNumDivs($, result);
    result = parseListDivs($, result);




    return { items: result, farms };
  } catch (error) {
    console.error('Error fetching data:', error);
    return;
  }
};

const parseListDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('ul').each((_, ul) => {
    $(ul)
      .find('li')
      .each((_, li) => {
        const $li = $(li);

        // Find text and number divs by partial class name match
        const name = $li.find('div[class*="-name"] b').text().trim();
        const numText = $li.find('div[class*="-num"]').text().trim();

        if (name && numText) {
          // Find matching item from itemsJson
          const matchedItem = Object.values(itemsJson).find(
            (item) => 'cnName' in item && item.cnName === name
          );

          if (matchedItem) {
            const id = matchedItem.id;

            // Match number patterns like 20x, 20*, 20×
            const match = numText.match(/^(\d+)[x×*]$/);

            if (match) {
              const value = parseChineseNumber(match[1]) ?? 0;

              if ( value > 0) {
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

  // Match patterns like "2万", "3千", "4百", or just numbers like "100"
  const match = input.match(/^(\d+)([万千百])?$/);

  if (match) {
    const num = parseInt(match[1], 10);  // Extract the number part
    const unit = match[2];  // Extract the Chinese numeral part (if any)

    if (!isNaN(num)) {
      switch (unit) {
        case '万':
          return num * 10000;  // Multiply by 10,000 for 万
        case '千':
          return num * 1000;   // Multiply by 1,000 for 千
        case '百':
          return num * 100;    // Multiply by 100 for 百
        default:
          return num;          // Return the number as is if no unit
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
      // Now search for tier 3 item within this <td>
      $(element).find('a').each((_, link) => {
        const title = $(link).attr('title')?.trim();
        if (!title) return;

        const matchedItem = Object.values(itemsJson).find(
          (item) => item.tier === 3 && `cnName` in item && item.cnName === title
        );

        if (matchedItem) {
          if (!foundItems.includes(matchedItem.id)) {
            foundItems.push(matchedItem.id);
          }
        }
      });
    }
  });

  return foundItems;
};

const parseNumDivs = ($: cheerio.CheerioAPI, result: Record<string, number>) => {
  $('tr').each((_, tr) => {
    const $tr = $(tr);

    // Ignore rows with '报酬合计' - totals row
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
    if (tds.length < 2) return; // Ensure there are enough columns

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
    })
    if (itemId && amount > 0) {
      result[itemId] = (result[itemId] ?? 0) + amount * multiplier;
      itemId = undefined;
      multiplier = 1;
      amount = 0;
    }
  });
  return result;
};

function parseSignInEvent($: cheerio.CheerioAPI, result: Record<string, number>) {

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
}
