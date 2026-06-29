export type AccessUser = Record<string, any>;

export const PUBLIC_AUTH_PATHS = ["/login"];

const ROUTE_ORDER = [
  "/management-dashboard",
  "/dashboard",
  "/hardware",
  "/software",
  "/network-inventory",
  "/network-metering",
  "/service-desk",
  "/tasklist",
  "/report",
  "/appmetering",
  "/app-restriction",
  "/web-restriction",
  "/software-distribution",
  "/patch-management",
  "/internet-metering",
  "/settings",
];

const MODULE_ROUTE_MAP: Record<string, string> = {
  management_dashboard: "/management-dashboard",
  managementdashboard: "/management-dashboard",
  dashboard: "/dashboard",
  it_operations_dashboard: "/dashboard",
  hardware: "/hardware",
  hardware_inventory: "/hardware",
  software: "/software",
  software_inventory: "/software",
  network: "/network-inventory",
  network_inventory: "/network-inventory",
  network_metering: "/network-metering",
  service_desk: "/service-desk",
  servicedesk: "/service-desk",
  tasklist: "/tasklist",
  task_list: "/tasklist",
  report: "/report",
  reports: "/report",
  settings: "/settings",
  appmetering: "/appmetering",
  app_metering: "/appmetering",
  app_restriction: "/app-restriction",
  web_restriction: "/web-restriction",
  software_distribution: "/software-distribution",
  patch_management: "/patch-management",
  internet_metering: "/internet-metering",
};

function safeParse(raw: string | null) {
  if (!raw || raw === "undefined" || raw === "null") return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function boolValue(value: any) {
  if (value === true || value === 1) return true;
  const text = String(value ?? "").trim().toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(text);
}

function normalizeKey(value: any) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cleanPath(pathname = "") {
  const path = String(pathname || "/").split("?")[0].split("#")[0];
  if (!path || path === "/") return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function getStoredAccessUser(): AccessUser | null {
  if (typeof window === "undefined") return null;

  const keys = ["ema-auth", "user", "authUser", "currentUser", "emaUser", "ema-user", "userData", "auth", "authData", "loginUser"];

  for (const key of keys) {
    const parsed = safeParse(localStorage.getItem(key)) || safeParse(sessionStorage.getItem(key));
    if (!parsed) continue;

    const user = parsed.user || parsed.data?.user || parsed.data || parsed.profile || parsed;
    if (user && typeof user === "object") return user;
  }

  return null;
}

export function saveAccessUser(user: AccessUser | null | undefined) {
  if (typeof window === "undefined" || !user) return;

  const raw = safeParse(localStorage.getItem("ema-auth")) || {};
  localStorage.setItem("ema-auth", JSON.stringify({ ...raw, user }));
}

export function extractUser(source?: any): AccessUser | null {
  return source?.user || source?.data?.user || source?.data || source?.profile || getStoredAccessUser();
}

export function getUserRoles(user?: AccessUser | null) {
  const raw = [
    user?.role,
    user?.Role,
    user?.roleName,
    user?.RoleName,
    ...(Array.isArray(user?.roles) ? user.roles : []),
  ];

  return Array.from(new Set(raw.flatMap((x) => String(x || "").split(/[,|;]/)).map(normalizeKey).filter(Boolean)));
}

export function isSuperAccessUser(user?: AccessUser | null) {
  return Boolean(user?.isSuperAdmin || user?.isSystemAdmin) ||
    getUserRoles(user).some((role) => ["super_admin", "superadmin", "system_administrator", "system_admin"].includes(role));
}

function routeMatches(pathname: string, allowedRoute: string) {
  const path = cleanPath(pathname);
  const allowed = cleanPath(allowedRoute);
  return path === allowed || path.startsWith(allowed + "/");
}

function getRouteFromModuleKey(key: any) {
  return MODULE_ROUTE_MAP[normalizeKey(key)] || "";
}

function getRoutesFromModuleAccess(user?: AccessUser | null) {
  const moduleAccess = user?.moduleAccess || user?.permissions?.modules || {};
  if (!moduleAccess || typeof moduleAccess !== "object") return [];

  return Object.entries(moduleAccess)
    .filter(([key, value]: any) => {
      if (key === "*") return isSuperAccessUser(user);
      if (!value || typeof value !== "object") return false;

      const access = value.access ?? value.canAccess ?? value.CanAccess;
      const view = value.view ?? value.canView ?? value.CanView;
      const enabled = value.enabled ?? value.isEnabled ?? value.IsEnabled;

      return boolValue(access) && boolValue(view) && (enabled === undefined || enabled === null || boolValue(enabled));
    })
    .map(([key, value]: any) => value.routePath || value.RoutePath || getRouteFromModuleKey(key))
    .filter(Boolean);
}

function getRoutesFromAllowedRoutes(user?: AccessUser | null) {
  const allowedRoutes = Array.isArray(user?.allowedRoutes) ? user.allowedRoutes.map(String) : [];

  if (allowedRoutes.includes("*")) {
    return isSuperAccessUser(user) || String(user?.authSource || "").toUpperCase() === "LEGACY" ? ["*"] : [];
  }

  return allowedRoutes.filter((route) => route.startsWith("/"));
}

function getRoutesFromPermissions(user?: AccessUser | null) {
  const permissions =
    user?.modulePermissions ||
    user?.roleModulePermissions ||
    user?.RoleModulePermissions ||
    user?.permissions?.modulePermissions ||
    [];

  const modules = user?.modules || user?.allowedModules || [];
  const moduleById = new Map<string, any>();

  if (Array.isArray(modules)) {
    modules.forEach((m: any) => {
      const id = String(m.ModuleID ?? m.moduleID ?? m.id ?? "");
      if (id) moduleById.set(id, m);
    });
  }

  if (!Array.isArray(permissions)) return [];

  return permissions
    .filter((p: any) => {
      const access = p.CanAccess ?? p.canAccess;
      const view = p.CanView ?? p.canView;
      const enabled = p.IsEnabled ?? p.isEnabled;
      return boolValue(access) && boolValue(view) && (enabled === undefined || enabled === null || boolValue(enabled));
    })
    .map((p: any) => {
      const id = String(p.ModuleID ?? p.moduleID ?? "");
      const m = moduleById.get(id) || p;
      return m.RoutePath || m.routePath || getRouteFromModuleKey(m.ModuleKey || m.moduleKey || m.ModuleName || m.moduleName);
    })
    .filter(Boolean);
}

export function getAllowedRoutesForUser(user?: AccessUser | null) {
  const realUser = user || getStoredAccessUser();
  if (!realUser) return [];

  if (isSuperAccessUser(realUser)) return ["*"];

  const routes = [
    ...getRoutesFromPermissions(realUser),
    ...getRoutesFromModuleAccess(realUser),
    ...getRoutesFromAllowedRoutes(realUser),
  ];

  return Array.from(new Set(routes.map(cleanPath).filter(Boolean)));
}

export function canAccessRoute(user: AccessUser | null | undefined, pathname: string) {
  const path = cleanPath(pathname);
  if (path === "/" || PUBLIC_AUTH_PATHS.includes(path)) return true;

  const allowedRoutes = getAllowedRoutesForUser(user);
  if (allowedRoutes.includes("*")) return true;

  return allowedRoutes.some((route) => routeMatches(path, route));
}

export function canViewPath(pathOrUser: string | AccessUser | null | undefined, userOrPath?: AccessUser | string | null) {
  const path = typeof pathOrUser === "string" ? pathOrUser : typeof userOrPath === "string" ? userOrPath : "";
  const user = typeof pathOrUser === "string"
    ? typeof userOrPath === "object" && userOrPath ? userOrPath : getStoredAccessUser()
    : pathOrUser || getStoredAccessUser();

  return canAccessRoute(user, path);
}

export const canViewRoute = canViewPath;

export function getDefaultRouteForUser(user?: AccessUser | null) {
  const routes = getAllowedRoutesForUser(user);

  if (routes.includes("*")) return "/dashboard";

  for (const route of ROUTE_ORDER) {
    if (routes.some((allowed) => cleanPath(allowed) === route)) return route;
  }

  return routes[0] || "/login";
}

export const getAccessLandingPath = getDefaultRouteForUser;

export function getRouteModuleKeys(pathname = "") {
  const path = cleanPath(pathname);
  return Object.entries(MODULE_ROUTE_MAP)
    .filter(([, route]) => path === cleanPath(route) || path.startsWith(cleanPath(route) + "/"))
    .map(([key]) => key);
}
