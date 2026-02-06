import axios, { AxiosInstance, AxiosResponse, AxiosError, Method } from "axios";
import { ROUTES } from "../routes/routes.constants";
import { apiEndpoint } from "./commonApi";
import { navigateTo } from "./navigationService";
import { store } from "../redux/store";
import { removeModuleByKeySafe } from "../redux/userDataSlice";


type UserDataFromStore = {
    modulesLoaded?: boolean;
    activeModuleKey?: string | null;
};

const dispatchToRedux = (action: any): void => {
    try {
        const storeModule = require("../redux/store");
        storeModule?.store?.dispatch?.(action);
    } catch (e) {
        console.log("Redux dispatch skipped (store not ready yet)");
    }
};

const getUserDataFromRedux = (): UserDataFromStore => {
    const storeModule = require("../redux/store");
    const state = storeModule?.store?.getState?.();
    return (state?.userData || {}) as UserDataFromStore;
};

const isAuthApiCall = (path: string): boolean => {
    return path.includes("/api/auth/");
};

const isModulesApiCall = (path: string): boolean => {
    return path.includes("/api/modules");
};

interface AxiosInstanceWithController {
    controller: AbortController;
    instance: AxiosInstance;
}

interface AxiosInstances {
    [key: string]: AxiosInstanceWithController;
}

let axiosInstances: AxiosInstances = {};

const createInstance = (timeoutVal: number): AxiosInstanceWithController => {
    const controller = new AbortController();
    const customAxiosInstance: AxiosInstanceWithController = {
        controller,
        instance: axios.create({
            headers: {},
            signal: controller.signal,
            timeout: timeoutVal
        })
    };
    return customAxiosInstance;
};

const getInstance = (pathname: string, timeout: number): AxiosInstance => {
    const existingInstance = axiosInstances[pathname];

    if (existingInstance && !existingInstance.controller.signal.aborted) {
        return existingInstance.instance;
    }

    const customAxiosInstance = createInstance(timeout);
    axiosInstances[pathname] = customAxiosInstance;
    return customAxiosInstance.instance;
};

export const abortAllApiCalls = (): void => {
    Object.values(axiosInstances).forEach(obj => {
        obj.controller.abort();
    });
    axiosInstances = {};
};

const renewToken = (): void => {
    localStorage.clear();
    window.location.href = ROUTES.login.path;
};

const redirectToNotFound = (errorMessage: string): void => {
    // Store error message in sessionStorage to pass to NotFound page
    sessionStorage.setItem('notFoundErrorMessage', errorMessage);
    // Use navigation service for smooth navigation without page reload
    navigateTo(ROUTES.notFound.path, { replace: true });
};

interface ApiHeaders {
    [key: string]: string;
    'access-token'?: string;
}

interface ApiErrorResponse {
    statusCode?: number;
    status_code?: number;
    access_expire?: boolean;
    refresh_expire?: boolean;
    message?: string;
    success?: boolean;
    data?: any;
}

export const ApiCall = async <T = any>(
    method: Method,
    path: string,
    payload?: any,
    header?: ApiHeaders,
    timeout: number = 7 * 60 * 1000
): Promise<AxiosResponse<T> | AxiosError | undefined> => {
    try {
        const authApi = isAuthApiCall(path);
        const modulesApi = isModulesApiCall(path);

        // If a module is active but modules are not loaded yet,
        // we wait until fetchModules succeeds (after-login rule).
        if (!authApi && !modulesApi) {
            const { activeModuleKey, modulesLoaded } = getUserDataFromRedux();

            if (activeModuleKey && !modulesLoaded) {
                const maxWaitMs = 10000;
                const pollMs = 100;
                const start = Date.now();

                while (Date.now() - start < maxWaitMs) {
                    const latest = getUserDataFromRedux();
                    if (latest?.modulesLoaded) break;
                    await new Promise((r) => setTimeout(r, pollMs));
                }
            }
        }

        const instance = getInstance(`${window.location.pathname}${window.location.search}`, timeout);
        const hasPayload = payload !== undefined && payload !== null && payload !== "";
        const isFormData = payload instanceof FormData;


        const { activeModuleKey } = getUserDataFromRedux();
        const moduleKeyHeader =
            !authApi && !modulesApi && activeModuleKey ? { modulekey: activeModuleKey } : {};

        const response = await instance({
            method,
            url: apiEndpoint + path,
            responseType: 'json',
            data: hasPayload && method.toUpperCase() !== 'GET' ? payload : undefined,
            params: hasPayload && method.toUpperCase() === 'GET' ? payload : undefined,
            timeout,
            headers: {
                ...header,
                ...moduleKeyHeader,
                ...(isFormData || (!hasPayload || method.toUpperCase() === 'GET') ? {} : { "Content-Type": "application/json" }),
            },
        });
        return response;
    } catch (error) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.log('error', error);

        // Handle 403 Forbidden - Unauthorized Access
        if (axiosError?.response?.status === 403) {
            const moduleKey = error.config?.headers?.modulekey;
            console.log('moduleKey', moduleKey);
            dispatchToRedux(removeModuleByKeySafe(moduleKey));
            const errorMessage = axiosError?.response?.data?.message ||
                "Unauthorized Access: User do not have permission to access this resource. Contact Admin.";
            redirectToNotFound(errorMessage);
            return axiosError;
        }

        if (axiosError?.response?.status === 401) {
            renewToken();
        }
        if (axiosError.message === 'Network Error') {
            console.log(`${axiosError}, Server is not responding, please try again after some time`);
        }
        if (axiosError.response?.data?.statusCode === 401 && header && !header['access-token']) {
            if (axiosError.response.data.access_expire) {
                renewToken();
            } else if (axiosError.response.data.refresh_expire) {
                return axiosError.response as AxiosResponse<T>;
            }
        } else {
            return axiosError;
        }
    }
};
