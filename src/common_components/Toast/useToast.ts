import { useContext } from "react";
import { ToastContext, ToastContextType } from "./ToastContext";

export default function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) {
        throw new Error("useToast must be used within <ToastProvider />");
    }
    return ctx;
}
