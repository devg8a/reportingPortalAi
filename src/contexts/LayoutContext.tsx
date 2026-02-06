import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface LayoutContextType {
    isFullScreen: boolean;
    isSidebarVisible: boolean;
    toggleFullScreen: () => void;
    exitFullScreen: () => void;
    isDense: boolean;
    toggleDensity: () => void;
}

interface LayoutProviderProps {
    children: ReactNode;
}

const LayoutContext = createContext<LayoutContextType | null>(null);

export function LayoutProvider({ children }: LayoutProviderProps): React.ReactElement {
    const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(true);
    const [isDense, setIsDense] = useState<boolean>(false);

    const toggleFullScreen = useCallback((): void => {
        setIsFullScreen((prev) => {
            const newValue = !prev;
            setIsSidebarVisible(!newValue);
            return newValue;
        });
    }, []);

    const exitFullScreen = useCallback((): void => {
        setIsFullScreen(false);
        setIsSidebarVisible(true);
    }, []);

    const toggleDensity = (): void => setIsDense(prev => !prev);

    return (
        <LayoutContext.Provider
            value={{
                isFullScreen,
                isSidebarVisible,
                toggleFullScreen,
                exitFullScreen,
                isDense,
                toggleDensity
            }}
        >
            {children}
        </LayoutContext.Provider>
    );
}

export function useLayout(): LayoutContextType {
    const context = useContext(LayoutContext);
    if (!context) {
        throw new Error("useLayout must be used within LayoutProvider");
    }
    return context;
}
