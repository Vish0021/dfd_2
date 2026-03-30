import { STORES } from '../../data/stores';

interface SuggestedRoute {
  title: string;
  uri: string;
}

interface RouteDescription {
  suggestedRoutes: SuggestedRoute[];
  itemTitle: string;
}

export function getRouteDescription(): RouteDescription {
  return {
    suggestedRoutes: STORES.map((store) => ({
      title: store.name,
      uri: `/store/${store.id}`,
    })),
    itemTitle: 'Store',
  };
}
