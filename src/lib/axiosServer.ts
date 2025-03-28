'use server'
import axios, { AxiosResponse } from 'axios';

class AxiosClient {
  private static instance: AxiosClient;
  private lastRequestTime: number = 0;

  private constructor() { }

  public static createInstance(): AxiosClient {
    if (!AxiosClient.instance) {
      AxiosClient.instance = new AxiosClient();
    }
    return AxiosClient.instance;
  }

  public async fetchData<T>(url: string): Promise<T> {

    const userAgent = {
      headers: { 'User-Agent': 'voiddp EventDataScraper/1.0 (voiddp@gmail.com)' }
    };

    try {
      //delay repeated requests to 2sec
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const delay = Math.max(0, 2000 - timeSinceLastRequest);

      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const response: AxiosResponse<T> = await axios.get(url, userAgent);

      this.lastRequestTime = Date.now();

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      }
      throw new Error(`Request failed with status ${response.status}`);
    } catch (error) {
      console.error('Error fetching data from PRTS Wiki:', error);
      throw error;
    }
  }
}
const axiosClient = await AxiosClient.createInstance();

export async function fetchHtml(url: string): Promise<string> {
  if (!url) throw new Error('No page link provided');
  return await axiosClient.fetchData(url);
}

export async function fetchJson<T = any>(url: string): Promise<T> {
  if (!url) throw new Error('No page link provided');
  return await axiosClient.fetchData<T>(url);
}
