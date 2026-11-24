import configManager from './index';
import { ConfigModelProvider } from './types';

export const getConfiguredModelProviders = (): ConfigModelProvider[] => {
  return configManager.getConfig('modelProviders', []);
};

export const getConfiguredModelProviderById = (
  id: string,
): ConfigModelProvider | undefined => {
  return getConfiguredModelProviders().find((p) => p.id === id) ?? undefined;
};

export const getSearxngURL = () =>
  configManager.getConfig('search.searxngURL', '');

export const getSearchConfig = () => ({
  provider: (configManager.getConfig('search.provider', '') || 'searxng') as string,
  url: configManager.getConfig('search.searchURL', '') as string,
  apiKey: configManager.getConfig('search.searchAPIKey', '') as string,
});
