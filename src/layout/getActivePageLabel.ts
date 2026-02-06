import { SIDEBAR_RAIL } from "./sidebarRail.config";
import { ROUTES } from "../routes/routes.constants";
import { transformModulesToMenu } from "../utils/menuTransformer";
import { Module } from "../redux/userDataSlice";

interface MenuItem {
    key: string;
    label: string;
    to?: string;
    items?: MenuItem[];
    icon?: React.ComponentType<any>;
}

/**
 * Returns the UI label for the active route.
 * Keeps header/title logic centralized and DRY.
 * 
 * @param pathname - Current route pathname
 * @param modules - Modules from Redux store (optional, for dynamic menu)
 * @returns Page label
 */
export function getActivePageLabel(pathname: string, modules: Module[] = []): string {
    if (pathname === ROUTES.profile.path) return "Profile";

    // Rail first (Home/Favorites/Settings)
    for (const item of SIDEBAR_RAIL) {
        if (item.to && item.to === pathname) return item.label;
    }

    // Helper function to recursively search menu items
    const findLabelInMenu = (items: MenuItem[]): string | null => {
        for (const item of items) {
            if (item.to === pathname) return item.label;
            if (item.items && item.items.length > 0) {
                const found = findLabelInMenu(item.items);
                if (found) return found;
            }
        }
        return null;
    };

    // Menu groups (Dynamic from API)
    if (modules && modules.length > 0) {
        const dynamicMenu = transformModulesToMenu(modules);
        for (const group of dynamicMenu) {
            const found = findLabelInMenu(group.items || []);
            if (found) return found;
            // Also check if group itself has a direct link
            if (group.to === pathname) return group.label;
        }
    }

    return "Account Overview";
}
