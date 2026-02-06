import React from "react";
import PageContainer from "../common_components/PageContainer";
import CenteredPageName from "../common_components/CenteredPageName";

export default function Dashboard(): React.ReactElement {
    return (
        <PageContainer>
            <CenteredPageName title="Dashboard" />
        </PageContainer>
    );
}
