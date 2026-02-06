import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import PageContainer from "../common_components/PageContainer";
import CenteredPageName from "../common_components/CenteredPageName";
import AnalyticsLineChart from "../common_components/AnalyticsLineChart/AnalyticsLineChart";
import { fetchHolidays } from "../redux/userDataSlice";
import { AppDispatch } from "../redux/store";
import { CalendarDate } from "@internationalized/date";
import UserDrawer from "../common_components/UserDrawer";
import TableRowExpanded from "../common_components/TableRowExpanded";
import TableToolbarActions from "../common_components/TableToolbarActions";
import TableToolbar from "../common_components/TableToolbar";
import PasswordInput from "../common_components/PasswordInput";
import RoleSelectInput from "../common_components/RoleSelectInput";
import SelectInput from "../common_components/SelectInput";
import Pagination from "../common_components/Pagination";
import PageTitle from "../common_components/PageTitle";
import PagesCommonHeader from "../common_components/PagesCommonHeader";
import OverrideRoleDrawer from "../common_components/OverrideRoleDrawer";
import NavItem from "../common_components/NavItem";
import LastUpdatedInfo from "../common_components/LastUpdatedInfo";
import ModuleAccessTable from "../common_components/ModuleAccessTable";
import MultiSelectInput from "../common_components/MultiSelectInput";
import NameInput from "../common_components/NameInput";
import ColumnFilter from "../common_components/ColumnFilter";
import AppButton from "../common_components/AppButton";
import AllPermissions from "../common_components/AllPermissions";
import CustomDatePicker from "../common_components/daterangepicker/CustomDatePicker";
import CustomMonthPicker from "../common_components/daterangepicker/CustomMonthPicker";
// import CustomMonthPicker from "common_components/daterangepicker/CustomMonthPicker";

export default function Home(): React.ReactElement {
    const dispatch = useDispatch<AppDispatch>();
    const [dateRange, setDateRange] = useState<any>(null);
    const [compareRange, setCompareRange] = useState<any>(null);
    const [monthValue, setMonthValue] = useState<any>(null);

    // Fetch holidays on component mount
    useEffect(() => {
        dispatch(fetchHolidays());
    }, [dispatch]);

    const handleDateChange = (startDate: CalendarDate, endDate: CalendarDate) => {
        console.log("Date range selected:");
        console.log("Start:", startDate.toString());
        console.log("End:", endDate.toString());
    };

    // Example chart data - Hourly data for 24 hours (12 AM - 11 PM)
    const hourlyCategories = [
        "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM",
        "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
        "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
        "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM"
    ];

    // Sample chart series data - Only Revenue and Sessions (as per screenshot)
    const chartSeries = [
        {
            name: "Revenue",
            data: [
                1, 0, 0, 0, 0, 44,
                0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0
            ],
            color: "#10B981", // Teal (matching screenshot)
        },
        {
            name: "Sessions",
            data: [
                50, 45, 50, 55, 60, 100,
                70, 110, 100, 70, 75, 80,
                85, 80, 75, 100, 90, 85,
                60, 65, 70, 65, 50, 40
            ],
            color: "#10B981", // Teal (matching screenshot)
            yAxisIndex: 1, // Right Y-axis
        },
    ];

    const handleApplyDate = ({ mainRange, compareRange }: { mainRange: any, compareRange: any }) => {
        console.log("APPLY CLICKED", mainRange, compareRange);
        setDateRange(mainRange);
        setCompareRange(compareRange);
    };

    const handleMonthChange = (value: any) => {
        setMonthValue(value);
        console.log("Selected value:", value);
    };

    return (
        <PageContainer>
            {/* <CenteredPageName title="Home" /> */}


            <div className="custom-month-picker">
                <CustomMonthPicker maxPastYears={5} onChange={handleMonthChange} value={monthValue} futureMonths={13} />
            </div>
            <CustomDatePicker onApply={handleApplyDate} value={dateRange} compareValue={compareRange} comparison={true} maxPastYears={3} />
            <div style={{ padding: "20px", maxWidth: "1200px" }}>

                <div style={{ marginTop: "40px" }}>
                    <h2 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: 600 }}>
                        Analytics Line Chart Demo
                    </h2>
                    <AnalyticsLineChart
                        series={chartSeries}
                        categories={hourlyCategories}
                        showLegend={true}
                        height={400}
                    />
                </div>

                <h1>Test all common components</h1>


                {/* <UserDrawer
                    open={true}
                    onClose={() => console.log("Drawer closed")}
                    userData={{
                        id: "u1",
                        first_name: "Rahul",
                        last_name: "Sharma",
                        email: "rahul@test.com",
                        role_id: "admin",
                        role: { name: "Admin" },
                        status: "Active",
                        user_type: "Manager",
                        location: "IN",
                        two_step_enabled: true,
                        employee_portfolio: [{ _id: "p1" }, { _id: "p2" }],
                        profile_pic: "",
                        permissions: {},
                        overrides: {}
                    }}
                    roleOptions={[
                        { value: "admin", label: "Admin", permissions: {} },
                        { value: "user", label: "User", permissions: {} }
                    ]}
                    designationOptions={[
                        { value: "Manager", label: "Manager" },
                        { value: "Executive", label: "Executive" }
                    ]}
                    employeePortfolioOptions={[
                        { value: "p1", label: "E-commerce" },
                        { value: "p2", label: "Lead Gen" }
                    ]}
                    onSave={async (values) => {
                        console.log("Saved Values:", values);
                        return true;
                    }}
                    onOverrideSave={(overrides) => {
                        console.log("Overrides Saved:", overrides);
                    }}
                /> */}

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "60px" }}>

                    <TableToolbar
                        title="Orders"
                        badgeText="Total"
                        badgeValue={120}
                        showSearch
                        showRows
                        showFullScreen
                        enableColumnVisibility
                        enableColumnFilters
                        showFilterRow={false}
                        onSearchChange={(text) => console.log("Search:", text)}
                        onColumnVisibilityClick={(e) => console.log("Column visibility")}
                        onFilterRowToggle={() => console.log("Toggle filters")}
                    />

                    <TableToolbarActions
                        showSearch
                        showRows
                        showFullScreen
                        enableColumnVisibility
                        enableColumnFilters
                        showFilterRow={false}
                        onSearchChange={(text) => console.log("Search:", text)}
                        onColumnVisibilityClick={() => console.log("Column visibility")}
                        onFilterRowToggle={() => console.log("Filter row toggle")}
                    />


                    <TableRowExpanded
                        row={{ id: 1, name: "Order #123" }}
                        detailColumns={[
                            {
                                label: "Order Info",
                                width: "50%",
                                rows: [
                                    { label: "Order ID: 123" },
                                    { label: "Status: Completed" },
                                ],
                            },
                            {
                                label: "Customer",
                                width: "50%",
                                rows: [
                                    { label: "Name: Rahul" },
                                    { label: "Country: India" },
                                ],
                            },
                        ]}
                        renderSidePanel={(row) => (
                            <div>Side Panel for {row.name}</div>
                        )}
                    />


                    <SelectInput
                        label="Status"
                        name="status"
                        value=""
                        required
                        placeholder="Select Status"
                        options={[
                            { label: "Active", value: "Active" },
                            { label: "Inactive", value: "Inactive" },
                        ]}
                        onChange={(e) => console.log("Selected:", e.target.value)}
                        onBlur={() => console.log("Blurred")}
                        errors="Status is required"
                        touched={true}
                    />



                    <RoleSelectInput
                        label="Role"
                        name="role"
                        value="admin"
                        required
                        placeholder="Select Role"
                        options={[
                            { label: "Admin", value: "admin" },
                            { label: "User", value: "user" },
                        ]}
                        overRideShowStatus={true}
                        hasOverrides={true}
                        onChange={(e) => console.log("Role:", e.target.value)}
                        onOverrideClick={() => console.log("Override clicked")}
                        errors=""
                        touched={false}
                    />


                    <PasswordInput
                        label="Password"
                        name="password"
                        Placeholder="Enter password"
                        value="Test@123"
                        onChange={(e) => console.log("Password:", e.target.value)}
                        onBlur={() => console.log("Blur")}
                        errors="Password is weak"
                        touched={true}
                    />


                    <Pagination
                        currentPage={2}
                        totalPages={10}
                        totalEntries={95}
                        itemsPerPage={10}
                        onPageChange={(page) => console.log("Page:", page)}
                    />

                    <PageTitle>
                        Dashboard Overview
                    </PageTitle>



                    <PagesCommonHeader
                        title="Users"
                        rightSection={<button>Add User</button>}
                        lastUpdatedSection={<span>Last updated: 2 mins ago</span>}
                    />


                    <PageContainer>
                        <div>Page Content Goes Here</div>
                    </PageContainer>


                    {/* <OverrideRoleDrawer
                        open={true}
                        userId="u123"
                        roleName="Account Manager"
                        onClose={() => console.log("Close")}
                        onSave={(data) => console.log("Saved Overrides:", data)}
                        initialPermissions={{}}
                        initialOverrides={{}}
                    /> */}



                    <NavItem
                        to="/dashboard"
                        icon={(props) => <svg {...props} />}
                        label="Dashboard"
                        isActive={true}
                        isCollapsed={false}
                        onClick={() => console.log("Nav clicked")}
                    />


                    <NameInput
                        label="First Name"
                        required
                        value="Rahul"
                        placeholder="Enter first name"
                        onChange={(e) => console.log(e.target.value)}
                        onBlur={() => console.log("blur")}
                        errors="First name required"
                        touched={true}
                    />


                    <MultiSelectInput
                        label="Employee Portfolio"
                        name="portfolio"
                        value={["seo", "ads"]}
                        options={[
                            { label: "SEO", value: "seo" },
                            { label: "Ads", value: "ads" },
                            { label: "E-commerce", value: "ecom" },
                        ]}
                        onChange={(e) => console.log(e.target.value)}
                        errors=""
                        touched={false}
                    />


                    <ModuleAccessTable
                        modules={[
                            { id: "1", name: "Dashboard" },
                            { id: "2", name: "Users", parentId: "1" },
                            { id: "3", name: "Reports", parentId: "1" },
                        ]}
                        permissions={{
                            "1": { read: true, write: true, create: true, fullAccess: true },
                            "2": { read: true },
                            "3": { read: false },
                        }}
                        onChange={(perms) => console.log(perms)}
                    />

                    <LastUpdatedInfo
                        updatedAt="2026-01-20T10:30:00Z"
                        onRefresh={() => console.log("refresh")}
                    />


                    <AllPermissions
                        modules={[
                            {
                                _id: "1",
                                key: "dashboard",
                                module_name: "Dashboard",
                                order: 1,
                                permissions: {
                                    access: true,
                                    client_scope: "assigned",
                                    refresh: true,
                                    actions: ["view"],
                                },
                            },
                            {
                                _id: "2",
                                key: "users",
                                module_name: "Users",
                                order: 2,
                                permissions: {
                                    access: true,
                                    client_scope: "all",
                                    refresh: false,
                                    actions: ["create", "edit", "delete"],
                                },
                            },
                        ]}
                        permissions={{
                            dashboard: {
                                access: true,
                                client_scope: "assigned",
                                refresh: true,
                                actions: ["view"],
                            },
                            users: {
                                access: true,
                                client_scope: "all",
                                refresh: false,
                                actions: ["create", "edit"],
                            },
                        }}
                        onChange={(perms) => console.log("Updated perms:", perms)}
                    />


                    <AppButton
                        variant="contained"
                        color="primary"
                        loading={false}
                        onClick={() => console.log("Clicked")}
                    >
                        Save Changes
                    </AppButton>

                    {/* <ColumnFilter
                        open={true}
                        anchorEl={document.body}
                        column={{ id: "status", label: "Status" }}
                        filterValue=""
                        filterOptions={[
                            { label: "Active", value: "active" },
                            { label: "Inactive", value: "inactive" },
                        ]}
                        onFilterChange={(col, val) => console.log(col, val)}
                        onClose={() => console.log("Close filter")}
                    /> */}


                    {/* <ColumnFilter
                        open={true}
                        anchorEl={document.body}
                        column={{ id: "name", label: "Name" }}
                        filterValue=""
                        onFilterChange={(col, val) => console.log(col, val)}
                        onClose={() => console.log("Close filter")}
                    /> */}

                    <AnalyticsLineChart
                        categories={[
                            "2026/01/01", "2026/01/02", "2026/01/03", "2026/01/04", "2026/01/05", "2026/01/06", "2026/01/07",
                            "2026/01/08", "2026/01/09", "2026/01/10", "2026/01/11", "2026/01/12", "2026/01/13", "2026/01/14",
                            "2026/01/15", "2026/01/16", "2026/01/17", "2026/01/18", "2026/01/19", "2026/01/20", "2026/01/21",
                            "2026/01/22", "2026/01/23", "2026/01/24", "2026/01/25", "2026/01/26", "2026/01/27", "2026/01/28",
                        ]}
                        series={[
                            {
                                name: "Revenue",
                                yAxisIndex: 0,
                                data: [
                                    48000, 32000, 28000, 30000, 22000, 24000, 20000,
                                    22000, 16000, 23000, 36000, 29000, 20000, 18000,
                                    27000, 16000, 26000, 31000, 20000, 18000, 9000,
                                    19000, 20000, 16500, 21000, 17500, 12000, 12500,
                                ],
                            },
                            {
                                name: "Spend",
                                yAxisIndex: 0,
                                data: [
                                    20000, 13000, 12000, 15000, 9500, 10000, 7500,
                                    9000, 7800, 8800, 16500, 12000, 9000, 5000,
                                    10000, 7500, 11000, 13000, 8000, 7000, 4000,
                                    8000, 6500, 7000, 8500, 6800, 5500, 6000,
                                ],
                            },
                            {
                                name: "Sessions",
                                yAxisIndex: 1, // secondary axis
                                data: [
                                    1200, 300, 280, 350, 260, 290, 240,
                                    270, 230, 260, 420, 380, 300, 220,
                                    340, 260, 360, 410, 300, 280, 180,
                                    320, 310, 290, 330, 300, 250, 260,
                                ],
                            },
                        ]}
                        showLegend
                        height={400}
                    />


                </div>


            </div>
        </PageContainer>
    );
}
