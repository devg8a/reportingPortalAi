const getCurrentUserId = (): string | null => {
    try {
        const authData = localStorage.getItem("V2_ReportingPortal");
        if (!authData) return null;
        const parsed = JSON.parse(authData);
        const user = parsed?.user;
        return user?.id || null;
    } catch {
        return null;
    }
};

export {getCurrentUserId}