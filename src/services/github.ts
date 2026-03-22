import axios from 'axios';

const GIST_ID = 'abbb593bdcd0bfc3d54a6284e81cc880';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || '';

export interface Scraper {
  key: string;
  name: string;
  enabled: boolean;
}

export interface Config {
  providers: Scraper[];
}

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
    
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      throw new Error('Configuration not found. Please check your Gist ID and Token.');
    }
    throw err;
  }
};

export const saveConfig = async (config: Config): Promise<void> => {
  await axios.patch(
    `https://api.github.com/gists/${GIST_ID}`,
    {
      files: {
        'scrapers.json': {
          content: JSON.stringify(config, null, 2),
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
