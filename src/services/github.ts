import axios from 'axios';

const GIST_ID = 'abbb593bdcd0bfc3d54a6284e81cc880';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';

export interface Scraper {
  key: string;
  name: string;
  enabled: boolean;
}

export type PrioritizeBy = 'latency' | 'size' | 'balanced';

export interface ScraperPreferences {
  prioritizeBy: PrioritizeBy;
  maxPreferredSizeGb: number;
}

export interface Config {
  providers: Scraper[];
  preferences?: ScraperPreferences;
}

export interface BackendMeta {
  version: string;
  name: string;
  description?: string;
}

export interface StreamResult {
  server: string;
  url: string;
  type: string;
  quality: string;
  latencyMs?: number;
  fileSizeGb?: number;
  providerKey?: string;
}

const DEFAULT_PREFERENCES: ScraperPreferences = {
  prioritizeBy: 'latency',
  maxPreferredSizeGb: 3,
};

export const BACKEND_URLS = (import.meta.env.VITE_BACKEND_URLS || 'https://scrapers-api.onrender.com').split(',');

export const fetchBackendMeta = async (url: string): Promise<BackendMeta> => {
  const response = await axios.get(`${url}/meta`);
  return response.data;
};

export const fetchConfig = async (): Promise<Config> => {
  try {
    const response = await axios.get(`https://api.github.com/gists/${GIST_ID}`, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    });
    const content = response.data.files['scrapers.json'].content;
    
    // Robustly handle potential double-encoding
    let data = JSON.parse(content);
    if (typeof data === 'string') {
      console.warn('Configuration data was double-encoded, parsing again...');
      data = JSON.parse(data);
    }
    
    if (!data || !Array.isArray(data.providers)) {
      throw new Error('Invalid configuration format: Missing providers array');
    }
    
    // Force only Moviebox
    data.providers = [
      {
        key: "p_moviebox",
        name: "Moviebox",
        enabled: true
      }
    ];
    
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('Configuration not found. Please check your Gist ID and Token.');
    }
    throw err;
  }
};

export const saveConfig = async (config: Config): Promise<void> => {
  const toSave: Config = {
    providers: [
      {
        key: "p_moviebox",
        name: "Moviebox",
        enabled: true
      }
    ],
    preferences: config.preferences ?? DEFAULT_PREFERENCES,
  };
  await axios.patch(
    `https://api.github.com/gists/${GIST_ID}`,
    {
      files: {
        'scrapers.json': {
          content: JSON.stringify(toSave, null, 2),
        },
      },
    },
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
      },
    }
  );
};

export const runLiveTest = async (
  tmdbId: string,
  scraperUrl: string
): Promise<{ streams: StreamResult[]; logs: string[] }> => {
  const streams: StreamResult[] = [];
  const logs: string[] = [];
  const url = `${scraperUrl}/api/scrape?tmdbId=${tmdbId}&stream=true`;
  const response = await fetch(url);


  if (!response.ok) {
    throw new Error(`Scrape failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.msgType === 'log') {
          logs.push(event.message);
        } else if (event.msgType === 'stream') {
          delete event.msgType;
          streams.push(event);
        }
      } catch {
        // skip malformed lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer);
      if (event.msgType === 'stream') {
        delete event.msgType;
        streams.push(event);
      }
    } catch {
      // skip
    }
  }

  return { streams, logs };
};

export { DEFAULT_PREFERENCES };
