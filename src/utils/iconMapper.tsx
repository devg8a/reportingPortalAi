import React from "react";
import { DescriptionOutlined, PersonOutline, Security } from "@mui/icons-material";
import BarChartIcon from '@mui/icons-material/BarChart';
import HomeFilledIcon from '@mui/icons-material/HomeFilled';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EmailIcon from '@mui/icons-material/Email';
import SearchIcon from '@mui/icons-material/Search';
import DescriptionIcon from '@mui/icons-material/Description';
import FavoriteIcon from '@mui/icons-material/Favorite';
import InventoryIcon from '@mui/icons-material/Inventory';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CompassIcon from '@mui/icons-material/Explore';
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";

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

const EmployeePerfomIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M2.5 16.6667C4.44649 14.6021 7.08918 13.3333 10 13.3333C12.9108 13.3333 15.5535 14.6021 17.5 16.6667M13.75 6.25C13.75 8.32107 12.0711 10 10 10C7.92893 10 6.25 8.32107 6.25 6.25C6.25 4.17893 7.92893 2.5 10 2.5C12.0711 2.5 13.75 4.17893 13.75 6.25Z"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);
const AccountPerformIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M18.3337 5.83325L11.7765 12.3904C11.4465 12.7205 11.2814 12.8855 11.0912 12.9473C10.9238 13.0017 10.7435 13.0017 10.5761 12.9473C10.3859 12.8855 10.2209 12.7205 9.89085 12.3904L7.6098 10.1094C7.27979 9.77938 7.11478 9.61437 6.92451 9.55255C6.75714 9.49817 6.57685 9.49817 6.40948 9.55255C6.2192 9.61437 6.0542 9.77938 5.72418 10.1094L1.66699 14.1666M18.3337 5.83325H12.5003M18.3337 5.83325V11.6666"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);
const DivergenceReportIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M14.334 11.667c.23 0 .346 0 .44.051a.44.44 0 0 1 .183.203c.041.098.031.202.01.411a6.666 6.666 0 1 1-7.299-7.299c.209-.02.314-.031.412.01a.45.45 0 0 1 .202.184c.052.093.052.209.052.44V11c0 .233 0 .35.045.44.04.078.104.141.182.181.09.046.206.046.44.046zm-2.667-9.334c0-.23 0-.346.051-.44a.44.44 0 0 1 .203-.183c.098-.041.203-.031.412-.01A6.67 6.67 0 0 1 18.3 7.668c.021.209.032.313-.01.411a.44.44 0 0 1-.183.203c-.094.051-.21.051-.44.051h-5.333c-.234 0-.35 0-.44-.045a.4.4 0 0 1-.182-.182c-.045-.09-.045-.206-.045-.44z"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
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

const MenuEmailIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="m17.917 15-5.536-5M7.62 10l-5.535 5m-.417-9.167 6.804 4.763c.551.386.827.579 1.126.653.265.066.542.066.806 0 .3-.074.576-.267 1.127-.653l6.804-4.763M5.667 16.667h8.667c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 0 0 1.092-1.092c.273-.535.273-1.235.273-2.635V7.333c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.092c-.535-.273-1.235-.273-2.635-.273H5.667c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 0 0-1.093 1.092c-.272.535-.272 1.235-.272 2.635v5.334c0 1.4 0 2.1.272 2.635a2.5 2.5 0 0 0 1.093 1.092c.535.273 1.235.273 2.635.273"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);
const MenuSearchIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="m17.5 17.5-2.917-2.917m2.084-5a7.083 7.083 0 1 1-14.167 0 7.083 7.083 0 0 1 14.167 0"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const FileAttachmentIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M10.417 1.667h2.25c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.092 1.093c.273.535.273 1.235.273 2.635v8.666c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.093c-.535.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 0 1-1.092-1.093c-.273-.534-.273-1.235-.273-2.635v-.583m10-2.917h-3.75m3.75-3.333h-2.916m2.916 6.667H6.667M5 8.333V3.75a1.25 1.25 0 0 1 2.5 0v4.583a2.5 2.5 0 1 1-5 0V5"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const LtvReportIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M7.5 15.417h5M5.833 12.5h8.334m-10-10.833h11.666c.92 0 1.667.829 1.667 1.852v12.963c0 1.022-.746 1.851-1.667 1.851H4.167c-.92 0-1.667-.829-1.667-1.851V3.519c0-1.023.746-1.852 1.667-1.852m5.831 3.51c-.583-.65-1.556-.824-2.286-.23-.73.595-.834 1.589-.26 2.292s2.546 2.344 2.546 2.344 1.972-1.64 2.546-2.344c.574-.703.483-1.703-.26-2.292s-1.703-.42-2.286.23"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const InventoryReportIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M16.666 4.167c0 1.38-2.984 2.5-6.666 2.5s-6.667-1.12-6.667-2.5m13.333 0c0-1.381-2.984-2.5-6.666-2.5s-6.667 1.119-6.667 2.5m13.333 0v11.666c0 1.381-2.984 2.5-6.666 2.5s-6.667-1.119-6.667-2.5V4.167m13.333 3.889c0 1.38-2.984 2.5-6.666 2.5s-6.667-1.12-6.667-2.5m13.333 3.886c0 1.38-2.984 2.5-6.666 2.5s-6.667-1.12-6.667-2.5"
            stroke="#71717A"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const ClientIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="m13.334 15 2.5-2.5m0 0 2.5 2.5m-2.5-2.5v5M12.917 2.742a3.334 3.334 0 0 1 0 6.182M10 12.5H6.667c-1.553 0-2.33 0-2.942.254a3.33 3.33 0 0 0-1.804 1.804c-.254.612-.254 1.389-.254 2.942M11.25 5.833a3.333 3.333 0 1 1-6.666 0 3.333 3.333 0 0 1 6.666 0"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const PublisherPerformIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M10 12.5 7.5 10m2.5 2.5a18.6 18.6 0 0 0 3.333-1.667M10 12.5v4.167s2.525-.459 3.333-1.667c.9-1.35 0-4.167 0-4.167M7.5 10a18.3 18.3 0 0 1 1.666-3.292 10.73 10.73 0 0 1 9.167-5.041c0 2.266-.65 6.25-5 9.166M7.5 10H3.333S3.791 7.475 5 6.667c1.35-.9 4.166 0 4.166 0M3.75 13.75c-1.25 1.05-1.667 4.167-1.667 4.167S5.2 17.5 6.25 16.25c.591-.7.583-1.775-.075-2.425a1.817 1.817 0 0 0-2.425-.075"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const OutReachPerformIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M2.5 9.167V17.5m10-8.333V17.5m-5-15v15m10-15v15"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);
const OutReachTrackersIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M13.334 11.145c2.943.579 5 1.9 5 3.438 0 2.071-3.731 3.75-8.334 3.75s-8.333-1.679-8.333-3.75c0-1.537 2.057-2.859 5-3.438M10 14.167V2.5l4.432 2.727c.323.199.485.298.536.424a.42.42 0 0 1-.01.339c-.058.122-.225.212-.56.392L10 8.75"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);
const OppIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M13.334 6.667v-2.5l2.5-2.5.833 1.666 1.667.834-2.5 2.5zm0 0L10 10m8.334 0A8.333 8.333 0 1 1 10 1.667M14.167 10A4.167 4.167 0 1 1 10 5.833"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const BillingSummaryIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M3.333 6.5c0-1.4 0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093C5.233 2.5 5.933 2.5 7.333 2.5h5.333c1.4 0 2.1 0 2.635.272a2.5 2.5 0 0 1 1.093 1.093c.272.535.272 1.235.272 2.635v11l-2.291-1.667L12.29 17.5 10 15.833 7.708 17.5l-2.083-1.667L3.333 17.5z"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);


const CommisionTrackerIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M7.5 7.5h.009m4.991 5h.009m.825-5.833-6.667 6.666m8.251-9.167c.172.415.501.744.916.917l1.454.602a1.694 1.694 0 0 1 .917 2.213l-.602 1.454a1.7 1.7 0 0 0 0 1.297l.601 1.453a1.695 1.695 0 0 1-.917 2.214l-1.453.601a1.7 1.7 0 0 0-.917.916l-.603 1.455a1.693 1.693 0 0 1-2.213.916l-1.453-.602a1.7 1.7 0 0 0-1.296.001l-1.454.602a1.694 1.694 0 0 1-2.212-.916l-.603-1.455a1.7 1.7 0 0 0-.915-.917l-1.455-.603a1.693 1.693 0 0 1-.917-2.212l.602-1.453a1.7 1.7 0 0 0 0-1.296l-.602-1.456a1.694 1.694 0 0 1 .917-2.213l1.453-.602c.415-.172.745-.5.917-.915l.602-1.455A1.694 1.694 0 0 1 7.9 1.796l1.453.602c.415.171.881.17 1.296-.001l1.455-.6a1.694 1.694 0 0 1 2.213.916l.602 1.455zM7.917 7.5a.417.417 0 1 1-.833 0 .417.417 0 0 1 .833 0m5 5a.417.417 0 1 1-.833 0 .417.417 0 0 1 .833 0"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const CustomCalculationIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="m14.583 5.417-9.166 9.166M7.083 8.75V5.417M5.417 7.083H8.75m2.5 5.834h3.333M6.5 17.5h7c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 0 0 1.092-1.092c.273-.535.273-1.235.273-2.635v-7c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.093C15.6 2.5 14.9 2.5 13.5 2.5h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 0 0-1.093 1.093C2.5 4.4 2.5 5.1 2.5 6.5v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 0 0 1.093 1.092C4.4 17.5 5.1 17.5 6.5 17.5"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const PadiMediaIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M13.334 6.667v-2.5l2.5-2.5.833 1.666 1.667.834-2.5 2.5zm0 0L10 10m8.334 0A8.333 8.333 0 1 1 10 1.667M14.167 10A4.167 4.167 0 1 1 10 5.833"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const affiliateIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M10 18.333a8.333 8.333 0 1 0 0-16.666 8.333 8.333 0 0 0 0 16.666"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M10 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M10 11.667a1.667 1.667 0 1 0 0-3.334 1.667 1.667 0 0 0 0 3.334"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const SalesIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M18.334 10A8.333 8.333 0 0 1 10 18.333M18.334 10A8.333 8.333 0 0 0 10 1.667M18.334 10H15m-5 8.333A8.333 8.333 0 0 1 1.667 10M10 18.333V15m-8.333-5A8.333 8.333 0 0 1 10 1.667M1.667 10H5m5-8.333V5"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const MonthlyProjIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="m10.834 5.833-.93-1.859c-.268-.535-.401-.803-.6-.998a1.7 1.7 0 0 0-.624-.385C8.416 2.5 8.117 2.5 7.52 2.5H4.334c-.934 0-1.4 0-1.757.182-.314.16-.569.414-.728.728-.182.357-.182.823-.182 1.757v.666m0 0h12.667c1.4 0 2.1 0 2.635.273a2.5 2.5 0 0 1 1.092 1.092c.273.535.273 1.235.273 2.635V13.5c0 1.4 0 2.1-.273 2.635a2.5 2.5 0 0 1-1.092 1.092c-.535.273-1.235.273-2.635.273H5.667c-1.4 0-2.1 0-2.635-.273a2.5 2.5 0 0 1-1.093-1.092c-.272-.535-.272-1.235-.272-2.635z"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const RolePermissionIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M14.167 9.167v-2.5a4.167 4.167 0 0 0-8.334 0v2.5M6.5 17.5h7c1.4 0 2.1 0 2.635-.273a2.5 2.5 0 0 0 1.092-1.092c.273-.535.273-1.235.273-2.635v-.333c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.093c-.535-.272-1.235-.272-2.635-.272h-7c-1.4 0-2.1 0-2.635.272a2.5 2.5 0 0 0-1.093 1.093c-.272.534-.272 1.235-.272 2.635v.333c0 1.4 0 2.1.272 2.635a2.5 2.5 0 0 0 1.093 1.092C4.4 17.5 5.1 17.5 6.5 17.5"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const HolidayIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M7.5 12.5h5m5-5.833h-15m10.833-5v2.5m-6.666-2.5v2.5M6.5 18.333h7c1.4 0 2.1 0 2.635-.272a2.5 2.5 0 0 0 1.092-1.093c.273-.534.273-1.235.273-2.635v-7c0-1.4 0-2.1-.273-2.635a2.5 2.5 0 0 0-1.092-1.092c-.535-.273-1.235-.273-2.635-.273h-7c-1.4 0-2.1 0-2.635.273a2.5 2.5 0 0 0-1.093 1.092C2.5 5.233 2.5 5.933 2.5 7.333v7c0 1.4 0 2.1.272 2.635a2.5 2.5 0 0 0 1.093 1.093c.535.272 1.235.272 2.635.272"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const ClientActivityIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M9.167 3.75h6.083c.934 0 1.4 0 1.757.182.314.16.569.414.728.728.182.357.182.823.182 1.757V7.5c0 .777 0 1.165-.127 1.471a1.66 1.66 0 0 1-.902.902c-.306.127-.694.127-1.471.127m-4.583 6.25H4.75c-.933 0-1.4 0-1.756-.182a1.67 1.67 0 0 1-.729-.728c-.181-.357-.181-.823-.181-1.757V12.5c0-.777 0-1.165.127-1.471.169-.408.493-.733.902-.902C3.419 10 3.807 10 4.583 10m4 2.083h2.834c.233 0 .35 0 .44-.045a.4.4 0 0 0 .181-.182c.046-.09.046-.206.046-.44V8.584c0-.233 0-.35-.046-.439a.4.4 0 0 0-.182-.182c-.089-.045-.206-.045-.439-.045H8.584c-.234 0-.35 0-.44.045a.4.4 0 0 0-.182.182c-.045.09-.045.206-.045.44v2.833c0 .233 0 .35.045.439.04.078.104.142.183.182.089.045.205.045.439.045m6.25 6.25h2.834c.233 0 .35 0 .44-.045a.4.4 0 0 0 .181-.182c.046-.09.046-.206.046-.44v-2.833c0-.233 0-.35-.046-.439a.4.4 0 0 0-.182-.182c-.089-.045-.206-.045-.439-.045h-2.833c-.234 0-.35 0-.44.045a.4.4 0 0 0-.182.182c-.045.09-.045.206-.045.44v2.833c0 .233 0 .35.045.439.04.078.104.142.183.182.089.045.205.045.439.045m-12.5-12.5h2.834c.233 0 .35 0 .44-.045a.4.4 0 0 0 .181-.182c.046-.09.046-.206.046-.44V2.334c0-.233 0-.35-.046-.439a.4.4 0 0 0-.182-.182c-.089-.045-.206-.045-.439-.045H2.334c-.234 0-.35 0-.44.045a.4.4 0 0 0-.182.182c-.045.09-.045.206-.045.44v2.833c0 .233 0 .35.045.439.04.078.104.142.183.182.089.045.205.045.439.045"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const ApiHealthIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M9.352 2.026c.237-.13.355-.197.48-.222a.8.8 0 0 1 .336 0c.125.025.243.091.48.222l6.166 3.426c.25.139.375.208.465.307q.122.132.179.303c.042.128.042.27.042.556v6.764c0 .286 0 .428-.042.556a.8.8 0 0 1-.178.303c-.091.099-.216.168-.466.307l-6.166 3.426c-.237.13-.355.197-.48.222a.8.8 0 0 1-.336 0c-.125-.026-.243-.091-.48-.222l-6.166-3.426c-.25-.139-.375-.208-.465-.307a.8.8 0 0 1-.179-.303c-.042-.128-.042-.27-.042-.556V6.618c0-.286 0-.428.042-.556a.8.8 0 0 1 .179-.303c.09-.099.215-.168.465-.307z"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            clipRule="evenodd"
            d="M9.997 7.557c-.833-.974-2.222-1.236-3.266-.345-1.044.892-1.19 2.383-.37 3.438.524.676 1.869 1.928 2.768 2.742.298.27.448.405.626.46.154.046.33.046.484 0 .179-.055.328-.19.627-.46.899-.813 2.243-2.066 2.768-2.742a2.464 2.464 0 0 0-.37-3.438c-1.062-.882-2.434-.63-3.267.345"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const CreateReportIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M13.333 3.333c.775 0 1.162 0 1.48.086a2.5 2.5 0 0 1 1.768 1.767c.085.318.085.706.085 1.48v7.667c0 1.4 0 2.1-.272 2.635a2.5 2.5 0 0 1-1.093 1.093c-.534.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 0 1-1.093-1.093c-.272-.534-.272-1.235-.272-2.635V6.667c0-.775 0-1.163.085-1.48a2.5 2.5 0 0 1 1.768-1.768c.318-.086.705-.086 1.48-.086M10 14.167v-5m-2.5 2.5h5M8 5h4c.466 0 .7 0 .878-.09a.83.83 0 0 0 .364-.365c.091-.178.091-.412.091-.878V3c0-.467 0-.7-.09-.878a.83.83 0 0 0-.365-.364c-.178-.091-.412-.091-.878-.091H8c-.467 0-.7 0-.879.09a.83.83 0 0 0-.364.365c-.09.178-.09.411-.09.878v.667c0 .466 0 .7.09.878.08.157.208.284.364.364C7.3 5 7.533 5 8 5"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const CreateTemplateIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M10 9.167v5m-2.5-2.5h5m5.834 4.166a1.666 1.666 0 0 1-1.667 1.667H3.334a1.667 1.667 0 0 1-1.667-1.667V4.167A1.667 1.667 0 0 1 3.334 2.5H7.5L9.167 5h7.5a1.667 1.667 0 0 1 1.667 1.667z"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const LtvIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M11.666 1.891v3.442c0 .467 0 .7.091.879.08.157.207.284.364.364.179.09.412.09.879.09h3.442M6.666 12.5V15m6.667-4.167V15M10 8.75V15m6.666-6.676v6.01c0 1.4 0 2.1-.272 2.634a2.5 2.5 0 0 1-1.093 1.093c-.534.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 0 1-1.093-1.093c-.272-.534-.272-1.235-.272-2.635V5.667c0-1.4 0-2.1.272-2.635a2.5 2.5 0 0 1 1.093-1.093c.535-.272 1.235-.272 2.635-.272h2.676c.612 0 .918 0 1.205.069a2.5 2.5 0 0 1 .723.3c.252.154.469.37.9.802l2.658 2.657c.432.433.648.649.803.901.137.224.238.468.3.723.068.287.068.593.068 1.205"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

const IcpIcon = (props: SvgIconProps): React.ReactElement => (
    <SvgIcon {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" style={{ fill: 'none' }}>
        <path
            d="M13.333 3.333c.775 0 1.162 0 1.48.086a2.5 2.5 0 0 1 1.768 1.767c.085.318.085.706.085 1.48v7.667c0 1.4 0 2.1-.272 2.635a2.5 2.5 0 0 1-1.093 1.093c-.534.272-1.235.272-2.635.272H7.333c-1.4 0-2.1 0-2.635-.272a2.5 2.5 0 0 1-1.093-1.093c-.272-.534-.272-1.235-.272-2.635V6.667c0-.775 0-1.163.085-1.48a2.5 2.5 0 0 1 1.768-1.768c.318-.086.705-.086 1.48-.086M10 12.917v-3.75a1.25 1.25 0 1 1 2.5 0v3.75a2.5 2.5 0 1 1-5 0V9.583M8 5h4c.466 0 .7 0 .878-.09a.83.83 0 0 0 .364-.365c.091-.178.091-.412.091-.878V3c0-.467 0-.7-.09-.878a.83.83 0 0 0-.365-.364c-.178-.091-.412-.091-.878-.091H8c-.467 0-.7 0-.879.09a.83.83 0 0 0-.364.365c-.09.178-.09.411-.09.878v.667c0 .466 0 .7.09.878.08.157.208.284.364.364C7.3 5 7.533 5 8 5"
            stroke="#71717a"
            strokeWidth={1.44}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </SvgIcon>
);

type IconComponent = React.ComponentType<SvgIconProps>;

interface IconMap {
    [key: string]: IconComponent;
}

/**
 * Icon mapping based on module keys from API
 * Maps API response keys to Material-UI icons or custom SVG icons
 */
export const ICON_MAP: IconMap = {
    // User Management
    user_management: PeopleIcon,
    user_list: UserListIcon,
    roles: UserAndPermissionIcon,
    roles_permission: UserAndPermissionIcon,

    // Client Management
    client_management: BusinessIcon,
    active_clients: EmployeePerfomIcon,

    // Paid Media
    account_summary: EmployeePerfomIcon,
    account_performance: AccountPerformIcon,
    divergence_report: DivergenceReportIcon,
    meta: EmployeePerfomIcon,
    google_ads: SearchIcon,
    adword: SearchIcon,
    shopify: InventoryIcon,
    ga: AssessmentIcon,
    google_analytics: AssessmentIcon,
    email: MenuEmailIcon,
    search: MenuSearchIcon,
    request_form: FileAttachmentIcon,
    ltv_report: LtvReportIcon,
    inventory_report: InventoryReportIcon,

    // Employee Performance
    employee_performance: EmployeePerfomIcon,

    // Affiliate
    affiliate: TrendingUpIcon,
    publisher_performance: PublisherPerformIcon,
    outreach_performance: OutReachPerformIcon,
    outreach_trackers: OutReachTrackersIcon,
    opportunities_directory: OppIcon,


    // Finance & Commission
    finance_commission: AssessmentIcon,
    billing_summary: BillingSummaryIcon,
    commission_tracker: CommisionTrackerIcon,
    custom_calculation: CustomCalculationIcon,

    // Goal managemant
    paid_media_goal: PadiMediaIcon,
    affiliate_goal: affiliateIcon,
    sales_goal: SalesIcon,
    monthly_projection: MonthlyProjIcon,

    // system & settings
    users: EmployeePerfomIcon,
    clients: ClientIcon,
    roles_permissions: RolePermissionIcon,
    holiday_calendar: HolidayIcon,
    client_activity_logs: ClientActivityIcon,
    api_health_monitor: ApiHealthIcon,

    //Report builder
    create_report: CreateReportIcon,
    create_template: CreateTemplateIcon,

    // G8A performace
    ltv_retention_report: LtvIcon,
    icp_report: IcpIcon,


    // Default fallback icon
    default: EmployeePerfomIcon,

};

export function getIconForKey(key: string | null | undefined): IconComponent {
    if (!key) return ICON_MAP.default;

    const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
    return ICON_MAP[normalizedKey] || ICON_MAP.default;
}
