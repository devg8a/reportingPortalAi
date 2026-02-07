/**
 * Centralized route configuration.
 *
 * RULE: Do not hardcode route strings anywhere else in the app.
 * Always import and use `ROUTES.<key>.path`.
 */

export interface RouteConfig {
    readonly name: string;
    readonly path: string;
}

export interface RoutesConfig {
    readonly root: RouteConfig;
    readonly login: RouteConfig;
    readonly register: RouteConfig;
    readonly verify: RouteConfig;
    readonly forgotPassword: RouteConfig;
    readonly resetPassword: RouteConfig;
    readonly home: RouteConfig;
    readonly favorites: RouteConfig;
    readonly settings: RouteConfig;
    readonly activeClientList: RouteConfig;
    readonly accountSummary: RouteConfig;
    readonly accountPerformance: RouteConfig;
    readonly ltvReport: RouteConfig;
    readonly userList: RouteConfig;
    readonly rolesPermission: RouteConfig;
    readonly rolePermissionCreate: RouteConfig;
    readonly rolePermissionEdit: RouteConfig;
    readonly profile: RouteConfig;
    readonly activeClient: RouteConfig;
    readonly notFound: RouteConfig;
    readonly clients: RouteConfig;
    readonly proTeamLeaguePerformance: RouteConfig;
    readonly emailMarketing: RouteConfig;
}

export const ROUTES: RoutesConfig = Object.freeze({
    root: Object.freeze({ name: "root", path: "/" }),

    // Public
    login: Object.freeze({ name: "login", path: "/login" }),
    register: Object.freeze({ name: "register", path: "/register" }),

    verify: Object.freeze({ name: "verify", path: "/verify" }),
    forgotPassword: Object.freeze({ name: "forgotPassword", path: "/forgot-password" }),
    resetPassword: Object.freeze({ name: "resetPassword", path: "/reset-password" }),

    // Protected
    // Legacy/entry route (redirects to Account Summary)

    // Icon-rail pages
    home: Object.freeze({ name: "home", path: "/home" }),
    favorites: Object.freeze({ name: "favorites", path: "/favorites" }),
    settings: Object.freeze({ name: "settings", path: "/settings" }),

    // Menu pages (Management)
    activeClientList: Object.freeze({
        name: "activeClientList",
        path: "/active-client-list",
    }),
    accountSummary: Object.freeze({
        name: "accountSummary",
        path: "/account-summary",
    }),
    accountPerformance: Object.freeze({
        name: "accountPerformance",
        path: "/account-performance",
    }),
    ltvReport: Object.freeze({ name: "ltvReport", path: "/ltv-report" }),

    // User Management
    userList: Object.freeze({ name: "userList", path: "/user-list" }),
    rolesPermission: Object.freeze({ name: "rolesPermission", path: "/roles-permissions" }),
    rolePermissionCreate: Object.freeze({ name: "rolePermissionCreate", path: "/role-permission-create" }),
    rolePermissionEdit: Object.freeze({ name: "rolePermissionEdit", path: "/role-permission-edit/:id" }),

    profile: Object.freeze({ name: "profile", path: "/profile" }),

    activeClient: Object.freeze({ name: "active_clients", path: "/active-clients" }),
    clients: Object.freeze({ name: "clients", path: "/clients" }),
    proTeamLeaguePerformance: Object.freeze({ name: "proTeamLeaguePerformance", path: "/pro-team-league-performance" }),
    emailMarketing: Object.freeze({ name: "emailMarketing", path: "/email-marketing" }),

    // Fallback
    notFound: Object.freeze({ name: "notFound", path: "/notfound" }),
});
