import { getIconForKey } from "./iconMapper";
import React from "react";
import { SvgIconProps } from "@mui/material/SvgIcon";

export interface MenuItemTransformed {
    key: string;
    label: string;
    icon: React.ComponentType<SvgIconProps>;
    to: string | null;
    order: number;
    permissions?: any;
    items: MenuItemTransformed[];
}

interface ApiModule {
    _id?: string;
    key?: string;
    module_name?: string;
    name?: string;
    url?: string;
    order?: number;
    is_parent?: boolean;
    permissions?: any;
    sub_modules?: ApiModule[]; // Support both plural and singular
}

/**
 * Transform API module response to sidebar menu structure
 * Handles nested sub_modules (parent -> child -> child)
 * Filters based on permissions.access
 * Sorts by order field
 * 
 * @param modules - Raw API response array
 * @returns Transformed menu structure
 */
export function transformModulesToMenu(modules: ApiModule[] = []): MenuItemTransformed[] {
    if (!Array.isArray(modules) || modules.length === 0) {
        return [];
    }

    // Helper function to check if module has access
    const hasAccess = (module: ApiModule): boolean => {
        return module.permissions?.access === true;
    };

    // Recursively transform sub_modules with access filtering
    const transformSubModules = (subModules: ApiModule[] = []): MenuItemTransformed[] => {
        if (!Array.isArray(subModules) || subModules.length === 0) {
            return [];
        }

        return [...subModules]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((subModule): MenuItemTransformed | null => {
                const moduleKey = subModule.key || subModule._id || '';

                // Support both sub_modules (plural) and sub_module (singular)
                const nestedSubModules = subModule.sub_modules || [];
                const hasSubModules = Array.isArray(nestedSubModules) && nestedSubModules.length > 0;
                
                // Recursively transform nested children first
                const subItems = hasSubModules ? transformSubModules(nestedSubModules) : [];

                // If module has children, check if any child has access
                // If module has no children, check if module itself has access
                if (hasSubModules) {
                    // Parent module: Only show if at least one child has access
                    if (subItems.length === 0) {
                        return null; // No accessible children, hide parent
                    }
                } else {
                    // Leaf module: Only show if module has access
                    if (!hasAccess(subModule)) {
                        return null; // No access, hide module
                    }
                }

                return {
                    key: moduleKey,
                    label: subModule.module_name || subModule.name || 'Unnamed',
                    icon: getIconForKey(subModule.key),
                    to: subModule.url ? `/${subModule.url}` : null,
                    order: subModule.order || 0,
                    permissions: subModule.permissions,
                    // If has nested sub_modules, include them (already filtered)
                    items: subItems,
                };
            })
            .filter((item): item is MenuItemTransformed => item !== null);
    };

    const transformed = [...modules]
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((module): MenuItemTransformed | null => {
            const isParent = module.is_parent === true;
            // Support both sub_modules (plural) and sub_module (singular)
            const moduleSubModules = module.sub_modules || [];
            const hasSubModules = Array.isArray(moduleSubModules) && moduleSubModules.length > 0;

            // If it's a parent with sub_modules, create a group
            if (isParent && hasSubModules) {
                const subItems = transformSubModules(moduleSubModules);

                // Only include parent if it has accessible children
                if (subItems.length === 0) {
                    return null; // No accessible children, hide parent
                }

                return {
                    key: module.key || module._id || '',
                    label: module.module_name || module.name || 'Unnamed',
                    icon: getIconForKey(module.key),
                    to: null,
                    order: module.order || 0,
                    items: subItems,
                };
            }

            // If it's a parent but no sub_modules, treat as regular item
            // If it's not a parent, treat as regular item
            if (!hasSubModules) {
                // Leaf module: Only show if module has access
                if (!hasAccess(module)) {
                    return null; // No access, hide module
                }

                return {
                    key: module.key || module._id || '',
                    label: module.module_name || module.name || 'Unnamed',
                    icon: getIconForKey(module.key),
                    to: module.url ? `/${module.url}` : null,
                    order: module.order || 0,
                    permissions: module.permissions,
                    items: [],
                };
            }

            // Has sub_modules but not marked as parent - still create group
            const subItems = transformSubModules(moduleSubModules);
            if (subItems.length === 0) {
                return null; // No accessible children, hide parent
            }

            return {
                key: module.key || module._id || '',
                label: module.module_name || module.name || 'Unnamed',
                icon: getIconForKey(module.key),
                to: null,
                order: module.order || 0,
                items: subItems,
            };
        })
        .filter((item): item is MenuItemTransformed => item !== null); // Remove null entries

    return transformed;
}

interface FlatRoute {
    key: string;
    path: string;
    label: string;
}

/**
 * Flatten menu structure to get all routes for routing setup
 * @param menu - Transformed menu structure
 * @returns Flat array of all menu items with routes
 */
export function flattenMenuRoutes(menu: MenuItemTransformed[] = []): FlatRoute[] {
    const routes: FlatRoute[] = [];

    const traverse = (items: MenuItemTransformed[]): void => {
        items.forEach((item) => {
            if (item.to) {
                routes.push({
                    key: item.key,
                    path: item.to,
                    label: item.label,
                });
            }
            if (item.items && item.items.length > 0) {
                traverse(item.items);
            }
        });
    };
    traverse(menu);
    return routes;
}
