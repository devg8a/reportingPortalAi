import React, { useEffect, useRef } from 'react';
import './App.css';
import AppRoutes from "./routes/AppRoutes";
import ToastProvider from "./common_components/Toast/ToastProvider";
import { useLocation, useNavigate } from 'react-router-dom';
import { abortAllApiCalls } from './helper/axios';
import { initializeNavigation } from './helper/navigationService';

function App(): React.ReactElement {
    const location = useLocation();
    const navigate = useNavigate();
    const prevPathRef = useRef<string>(location.pathname + location.search);

    // Initialize navigation service once
    useEffect(() => {
        initializeNavigation(navigate);
    }, [navigate]);

    useEffect(() => {
        const currentPath = location.pathname + location.search;

        return () => {
            if (prevPathRef.current !== currentPath) {
                abortAllApiCalls();
            }
            prevPathRef.current = currentPath;
        };
    }, [location.pathname, location.search]);

    return (
        <>
            <ToastProvider>
                <AppRoutes />
            </ToastProvider>
        </>
    );
}

export default App;
