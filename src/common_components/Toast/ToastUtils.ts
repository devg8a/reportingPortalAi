import { EventEmitter } from "events";

type ToastType = 'success' | 'error' | 'warning' | 'info';

const toastEmitter = new EventEmitter();

export const registerToastListener = (fn: (message: string, type: ToastType) => void) => {
    const handler = (message: string, type: ToastType) => fn(message, type);
    toastEmitter.on('toast', handler);
    return () => {
        toastEmitter.off('toast', handler);
    };
};

export const toast = {
    success: (msg: string) => toastEmitter.emit('toast', msg, 'success'),
    error: (msg: string) => toastEmitter.emit('toast', msg, 'error'),
    warning: (msg: string) => toastEmitter.emit('toast', msg, 'warning'),
    info: (msg: string) => toastEmitter.emit('toast', msg, 'info'),
};
