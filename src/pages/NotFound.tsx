import React, { useEffect, useState } from "react";

export default function NotFound(): React.ReactElement {
    const [errorMessage, setErrorMessage] = useState<string>("");
    useEffect(() => {
        // Get error message from sessionStorage (set by axios.ts on 403 error)
        const storedMessage = sessionStorage.getItem('notFoundErrorMessage');
        if (storedMessage) {
            setErrorMessage(storedMessage);
        }
    }, []);

    return (
        <>
            <h1>Access Denied</h1>
            {errorMessage && <p>{errorMessage}</p>}
        </>
    );
}
