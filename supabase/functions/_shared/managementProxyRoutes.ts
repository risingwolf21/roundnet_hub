// Allow-list for the management-proxy edge function.
// Only the Management API endpoints the admin UI actually needs may be proxied.

export type AllowedRoute = { method: string; pattern: RegExp };

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildAllowedRoutes = (projectRef: string): AllowedRoute[] => {
  const ref = escapeRegExp(projectRef);
  return [
    { method: 'GET', pattern: new RegExp(`^/v1/projects/${ref}/analytics/endpoints/logs\\.all(\\?.*)?$`) },
    { method: 'POST', pattern: new RegExp(`^/v1/projects/${ref}/database/query$`) },
  ];
};

export const isAllowedRoute = (routes: AllowedRoute[], method: string, path: string) =>
  routes.some((route) => route.method === method.toUpperCase() && route.pattern.test(path));

export const projectRefFromUrl = (supabaseUrl: string) => new URL(supabaseUrl).hostname.split('.')[0];
