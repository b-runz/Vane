import { getSearxngURL } from './config/serverRegistry';

export interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

// Search provider bridge. SEARCH_PROVIDER=searxng (default) uses the SearXNG instance.
// SEARCH_PROVIDER=tavily sends the query to any Tavily-compatible endpoint at SEARCH_URL
// (Tavily itself, freellmapi's /v1/search, or a custom relay), with an optional bearer key.
const searchTavilyCompatible = async (query: string) => {
  const url = process.env.SEARCH_URL;
  if (!url) throw new Error('SEARCH_URL is not set');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.SEARCH_API_KEY) {
    headers.Authorization = `Bearer ${process.env.SEARCH_API_KEY}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, max_results: 10 }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Search provider error: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    const results: SearxngSearchResult[] = (data.results ?? []).map(
      (r: any) => ({ title: r.title, url: r.url, content: r.content }),
    );
    return { results, suggestions: [] as string[] };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Search provider timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
) => {
  if (process.env.SEARCH_PROVIDER === 'tavily') {
    return searchTavilyCompatible(query);
  }

  const searxngURL = getSearxngURL();

  const url = new URL(`${searxngURL}/search?format=json`);
  url.searchParams.append('q', query);

  if (opts) {
    Object.keys(opts).forEach((key) => {
      const value = opts[key as keyof SearxngSearchOptions];
      if (Array.isArray(value)) {
        url.searchParams.append(key, value.join(','));
        return;
      }
      url.searchParams.append(key, value as string);
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`SearXNG error: ${res.statusText}`);
    }

    const data = await res.json();

    const results: SearxngSearchResult[] = data.results;
    const suggestions: string[] = data.suggestions;

    return { results, suggestions };
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('SearXNG search timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};
