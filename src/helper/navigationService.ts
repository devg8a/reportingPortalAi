/**
 * Global Navigation Service
 * 
 * This service allows navigation from anywhere in the app (including axios.ts)
 * without requiring React Router hooks. It's initialized once in App.tsx
 * and can be used throughout the application.
 */

type NavigateFunction = (to: string, options?: { replace?: boolean; state?: any }) => void;

let navigateFunction: NavigateFunction | null = null;

/**
 * Initialize the navigation service with React Router's navigate function
 * Call this once in App.tsx or main router component
 */
export const initializeNavigation = (navigate: NavigateFunction): void => {
    navigateFunction = navigate;
};

/**
 * Navigate to a route programmatically
 * Works from anywhere in the app, including axios interceptors
 */
export const navigateTo = (path: string, options?: { replace?: boolean; state?: any }): void => {
    if (navigateFunction) {
        navigateFunction(path, options);
    } else {
        // Fallback to window.location if navigate not initialized (shouldn't happen in normal flow)
        console.warn('Navigation service not initialized, falling back to window.location');
        window.location.href = path;
    }
};

/**
 * Check if navigation service is initialized
 */
export const isNavigationInitialized = (): boolean => {
    return navigateFunction !== null;
};
