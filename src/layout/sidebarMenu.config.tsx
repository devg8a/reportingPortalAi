import React from "react";
import { DescriptionOutlined, PersonOutline, Security } from "@mui/icons-material";
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeFilledIcon from '@mui/icons-material/HomeFilled';
import { ROUTES } from "../routes/routes.constants";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

export interface MenuItemConfig {
    key: string;
    label: string;
    icon: React.ComponentType<SvgIconProps>;
    to: string;
}

export interface MenuGroupConfig {
    key: string;
    label: string;
    items: MenuItemConfig[];
}

/**
 * Active Client List icon component using custom SVG
 */
const ActiveClientListIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <circle
            cx="12"
            cy="6"
            r="4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </SvgIcon>
);

const UserListIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} viewBox="0 0 24 24">

        <path
            d="M3 20c2.336-2.477 5.507-4 9-4s6.664 1.523 9 4M16.5 7.5a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0"
            stroke="#71717A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </SvgIcon>
);

const UserAndPermissionIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} viewBox="0 0 24 24">
        <path
            d="M14 2.27V6.4c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437c.214.11.494.11 1.054.11h4.13M14 17H8m8-4H8m12-3.012V17.2c0 1.68 0 2.52-.327 3.162a3 3 0 0 1-1.311 1.311C17.72 22 16.88 22 15.2 22H8.8c-1.68 0-2.52 0-3.162-.327a3 3 0 0 1-1.311-1.311C4 19.72 4 18.88 4 17.2V6.8c0-1.68 0-2.52.327-3.162a3 3 0 0 1 1.311-1.311C6.28 2 7.12 2 8.8 2h3.212c.733 0 1.1 0 1.446.083.306.073.598.195.867.36.303.185.562.444 1.08.963l3.19 3.188c.518.519.777.778.963 1.081a3 3 0 0 1 .36.867c.082.346.082.712.082 1.446"
            stroke="#71717A"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
    </SvgIcon>
);

/**
 * Sidebar config (single source of truth for menu).
 * Matches items visible in the Figma sidebar for node `87:2813`.
 */
export const SIDEBAR_MENU: readonly MenuGroupConfig[] = Object.freeze([
    {
        key: "management",
        label: "Management",
        items: [
            {
                key: "activeClientList",
                label: "Active Client List",
                icon: ActiveClientListIcon,
                to: ROUTES.activeClientList.path,
            },
            {
                key: "accountSummary",
                label: "Account Summary",
                icon: DescriptionOutlined,
                to: ROUTES.accountSummary.path,
            },
            {
                key: "accountPerformance",
                label: "Account Performance",
                icon: BarChartIcon,
                to: ROUTES.accountPerformance.path,
            },
            {
                key: "ltvReport",
                label: "LTV Report",
                icon: HomeFilledIcon,
                to: ROUTES.ltvReport.path,
            },
        ],
    },
    {
        key: "userManagement",
        label: "User Management",
        items: [
            {
                key: "userList",
                label: "User List",
                icon: UserListIcon,
                to: ROUTES.userList.path,
            },
            {
                key: "rolesPermission",
                label: "Roles & Permission",
                icon: UserAndPermissionIcon,
                to: ROUTES.rolesPermission.path,
            },
        ],
    },
]);
