import { createContext } from "react";

export type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
    severity?: ToastSeverity;
    duration?: number;
}

export interface ToastContextType {
    show: (message: string, options?: ToastOptions) => string;
    success: (message: string, options?: ToastOptions) => string;
    error: (message: string, options?: ToastOptions) => string;
    warning: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    close: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
