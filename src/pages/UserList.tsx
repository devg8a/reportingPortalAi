import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import AddIcon from "@mui/icons-material/Add";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import PageContainer from "../common_components/PageContainer";
import TableToolbar from "../common_components/TableToolbar";
import Pagination from "../common_components/Pagination";
import AppButton from "../common_components/AppButton";
import UserDrawer from "../common_components/UserDrawer";
import "../App.css";
import CommonTable from "../common_components/CommonTable";
import { ApiCall } from "../helper/axios";
import { AxiosResponse, AxiosError } from "axios";
import { useSelector } from "react-redux";
import { selectToken } from "../redux/authSlice";
import CustomLoader from "../common_components/CustomLoader";
import useToast from "../common_components/Toast/useToast";
import { CircularProgress } from "@mui/material";
import ConfirmActionModal from "../common_components/ConfirmActionModal";
import { TableColumn, SortConfig, PinnedColumns } from "../common_components/tableTypes";
import { getCurrentUserId } from "../helper/commonFunctions";

interface User {
    id: string;
    name: string;
    email: string;
    roleName: string;
    roleId: string | null;
    initials: string;
    profilePic: string | null;
    status: string;
    hasOverrides?: boolean; // Track if user has overrides
    raw: any;
}
const roleClassSequence = [
    "role-badge-1",
    "role-badge-2",
    "role-badge-3",
];
interface RoleOption {
    value: string;
    label: string;
    id?: string;
}

interface DesignationOption {
    value: string;
    label: string;
}

interface EmployeePortfolioOption {
    value: string;
    label: string;
    chipColor?: string;
    textColor?: string;
}

interface ApiErrorResponse {
    message?: string;
}


function getInitials(firstName = "", lastName = "") {
    const f = (firstName || "").trim();
    const l = (lastName || "").trim();
    const first = f ? f[0].toUpperCase() : "";
    const last = l ? l[0].toUpperCase() : "";
    return `${first}${last}` || "U";
}

function mapUsersFromApi(users: any[] = []): User[] {
    return (users || []).map((u) => {
        const firstName = u?.first_name || "";
        const lastName = u?.last_name || "";
        const overrides = u?.overrides || {};
        const hasOverrides = Object.keys(overrides).length > 0;
        return {
            id: u?._id,
            name: `${firstName} ${lastName}`.trim(),
            email: u?.email || "",
            roleName: u?.role_id?.name,
            roleId: u?.role_id?._id || null,
            initials: getInitials(firstName, lastName),
            profilePic: u?.profile_pic || null,
            status: u?.status || "",
            hasOverrides: hasOverrides,
            raw: u,
        };
    });
}

export default function UserList() {
    const toast = useToast();
    const token = useSelector(selectToken);
    const [activeTab, setActiveTab] = useState<"active" | "inactive">("active");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ columnId: null, direction: "asc" });
    const [searchText, setSearchText] = useState("");
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [rows, setRows] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const isInitialMount = useRef(true);
    const [activeCount, setActiveCount] = useState(0);
    const [inactiveCount, setInactiveCount] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [employeePortfolioOptions, setEmployeePortfolioOptions] = useState<EmployeePortfolioOption[]>([]);
    const [designationOptions, setDesignationOptions] = useState<DesignationOption[]>([]);
    const [editLoadingUserId, setEditLoadingUserId] = useState<string | null>(null);
    const [deleteState, setDeleteState] = useState<{ open: boolean; loading: boolean; payload: User | null }>({
        open: false,
        loading: false,
        payload: null,
    });

    // New state for table features
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
    const [columnVisibilityAnchor, setColumnVisibilityAnchor] = useState<null | HTMLElement>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, any>>({});
    const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
    const [showFilterRow, setShowFilterRow] = useState(false);
    const [activeFilterColumnId, setActiveFilterColumnId] = useState<string | null>(null);
    const [pinnedColumns, setPinnedColumns] = useState<PinnedColumns>({ left: [], right: [] });
    const isFirstLoad = useRef(true);

    const itemsPerPage = 10;

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const status = activeTab === "active" ? "active" : "inactive";

            const params = new URLSearchParams();
            params.set("page", String(currentPage));
            params.set("limit", String(itemsPerPage));

            if (searchText) params.set("searchText", searchText);
            params.set("status", status);
            const sortByMap: Record<string, string> = {
                userName: "first_name",
                email: "email",
                role: "designation",
            };
            if (sortConfig?.columnId) {
                params.set("sortBy", sortByMap[sortConfig.columnId] || "first_name");
                params.set("sortOrder", sortConfig.direction || "asc");
            }

            // Add column filters as params
            Object.keys(columnFilters).forEach((columnId) => {
                const value = columnFilters[columnId];
                if (value) {
                    if (columnId === "role") {
                        // Find role name from roleOptions using the role ID
                        const selectedRole = roleOptions.find((role) => role.value === value);
                        if (selectedRole) {
                            params.set("role", selectedRole.label);
                        }
                    } else {
                        const id = columnId === "userName" ? "name" : columnId;
                        params.set(id, value);
                    }
                }
            });

            const res = await ApiCall("GET", `/api/users?${params.toString()}`, "", { Authorization: token });

            if (res && 'data' in res && res?.data?.success) {
                const payload = (res as AxiosResponse).data?.data || {};
                const list = mapUsersFromApi(payload?.users || []);
                setRows(list);

                const epOptions = (payload?.users || []).map((u) => {
                    if (u?.role_id?.name === "Master Admin" || u?.role?.name === "Master Admin") return;
                    const firstName = u?.first_name || "";
                    const lastName = u?.last_name || "";
                    const email = u?.email || "";
                    const label = `${`${firstName} ${lastName}`.trim()}${email ? ` (${email})` : ""}`.trim();
                    return {
                        value: u?._id, // store user id
                        label,
                        chipColor: "#f9f5ff",
                        textColor: "#6941c6",
                    };
                }).filter((o) => o && o?.value && o?.label);

                setEmployeePortfolioOptions(prev => {
                    const map = new Map<string, any>();

                    // pehle se jo hai
                    prev.forEach(opt => {
                        map.set(opt.value, opt);
                    });

                    // naye users
                    epOptions.forEach(opt => {
                        map.set(opt.value, opt); // same value → overwrite (no duplicate)
                    });

                    return Array.from(map.values());
                });

                const pagination = payload?.pagination || {};
                setActiveCount(pagination?.active);
                setInactiveCount(pagination?.inactive);
                setTotalPages(Number(pagination?.totalPages || 1));
            } else {
                setRows([]);
            }
        } catch (e) {
            setRows([]);
        } finally {
            setLoading(false);
            isFirstLoad.current = false;
        }
    }, [activeTab, currentPage, sortConfig, token, itemsPerPage, searchText, columnFilters]);

    // Trigger API on tab/sort/search/pagination changes
    useEffect(() => {
        if (isFirstLoad.current) {
            fetchUsers();
            return;
        }

        const timer = setTimeout(() => {
            fetchUsers();
        }, 400);

        return () => clearTimeout(timer);
    }, [fetchUsers, searchText, columnFilters, currentPage, activeTab, sortConfig]);


    const fetchRoles = useCallback(async () => {
        try {
            if (!token) return;
            const res = await ApiCall("GET", "/api/roles", "", { Authorization: token });
            if (res && 'data' in res && 'status' in res && res?.data?.success && res?.status === 200) {
                const rolesArray = Array.isArray((res as AxiosResponse).data?.data?.roles) ? (res as AxiosResponse).data.data.roles : [];
                const options = (rolesArray || []).map((r: any) => ({
                    value: r?._id,
                    label: r?.name || "",
                    id: r?._id,
                    permissions: r?.permissions || {},
                })).filter((o: any) => o.value && o.label);
                setRoleOptions(options);
            }
        } catch (e) {
            setRoleOptions([]);
        }
    }, [token]);

    const fetchDesignations = useCallback(async () => {
        try {
            if (!token) return;
            const res = await ApiCall("GET", "/api/designations", "", { Authorization: token });

            if (res && 'data' in res && 'status' in res && res?.data?.success && res?.status === 200) {
                const designationsArray = Array.isArray((res as AxiosResponse).data?.data?.designations) ? (res as AxiosResponse).data.data.designations : [];
                const options = (designationsArray || []).map((d: any) => ({
                    value: d?.name,
                    label: d?.name
                })).filter((o: any) => o.value && o.label);
                setDesignationOptions(options);
            }
        } catch (e) {
            setDesignationOptions([]);
        }
    }, [token]);

    useEffect(() => {
        if (!token) return;
        fetchRoles();
        fetchDesignations();
    }, [token, fetchRoles, fetchDesignations]);

    const handleSearchChange = (text: string) => {
        setSearchText(text);
    };

    const handleSelectionChange = (newSelected: Set<string>) => {
        setSelectedRows(newSelected);
    };

    const handleColumnVisibilityChange = (newHidden: Set<string>) => {
        setHiddenColumns(newHidden);
    };

    const handleColumnVisibilityClick = (event: React.MouseEvent<HTMLElement>) => {
        setColumnVisibilityAnchor(event.currentTarget);
    };

    const handleColumnVisibilityClose = () => {
        setColumnVisibilityAnchor(null);
    };

    const handleColumnFilterChange = (columnId: string, filterValue: any) => {
        setColumnFilters((prev) => {
            const newFilters = { ...prev };
            if (filterValue) {
                newFilters[columnId] = filterValue;
            } else {
                delete newFilters[columnId];
            }

            // if (!filterValue && Object.keys(newFilters).length === 0) {
            //     setShowFilterRow(false);
            //     setActiveFilterColumnId(null);
            // }

            return newFilters;
        });
        setCurrentPage(1);
    };

    const handleColumnOrderChange = (newOrder: string[]) => {
        setColumnOrder(newOrder);
    };

    const handleColumnPinningChange = (newPinnedColumns: PinnedColumns) => {
        setPinnedColumns(newPinnedColumns);
    };

    const handleFilterRowToggle = (payload: any = null) => {
        if (!payload || payload?.mode === "all") {
            setActiveFilterColumnId(null);
            setShowFilterRow((prev) => (payload?.open !== undefined ? payload.open : !prev));
            return;
        }

        if (payload?.mode === "single" && payload?.columnId) {
            if (payload?.open === false) {
                setActiveFilterColumnId(null);
                setShowFilterRow(false);
                return;
            }

            setActiveFilterColumnId(payload.columnId);
            setShowFilterRow(true);
        }
    };

    const handleSortChange = (columnId: string | null, direction: "asc" | "desc") => {
        setSortConfig({ columnId, direction });
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
    };

    const handleEdit = async (user: User) => {
        try {
            setEditLoadingUserId(user.id);

            const res = await ApiCall("GET", `/api/users/${user.id}`, "", { Authorization: token });
            if (res && 'data' in res && res?.data?.success) {
                const fetchedUser = (res as AxiosResponse).data?.data || {};
                const userData = {
                    id: fetchedUser._id,
                    first_name: fetchedUser.first_name || "",
                    last_name: fetchedUser.last_name || "",
                    email: fetchedUser.email || "",
                    role_id: fetchedUser.role?._id || "",
                    user_type: fetchedUser.user_type || "",
                    status: fetchedUser.status === "active" ? "Active" : "Inactive",
                    location: fetchedUser.location || "",
                    stores: fetchedUser.stores || [],
                    employee_portfolio: fetchedUser.employee_portfolio,
                    profile_pic: fetchedUser.profile_pic || null,
                    permissions: fetchedUser.permissions || {},
                    overrides: fetchedUser.overrides || {},
                    createdAt: fetchedUser.created_at || null,
                    updatedAt: fetchedUser.updated_at || null,
                    two_step_enabled: fetchedUser.two_step_enabled || fetchedUser.two_step_enabled === false ? JSON.parse(fetchedUser.two_step_enabled) : true
                };

                setSelectedUser(userData);
                setDrawerOpen(true);
            } else {
                const errorRes = res as AxiosError<ApiErrorResponse>;
                toast.error(errorRes?.response?.data?.message || "Something went wrong");
            }
        } catch (error) {
            toast.error("Something went wrong!");
        } finally {
            setEditLoadingUserId(null);
        }
    };

    const handleDelete = (row: User) => {
        setDeleteState({
            open: true,
            loading: false,
            payload: row,
        });
    };

    const confirmDelete = async () => {
        const user = deleteState.payload;
        if (!user) return;

        setDeleteState((p) => ({ ...p, loading: true }));

        try {
            const res = await ApiCall("DELETE", `/api/users/${user.id}`, null, { Authorization: token });

            if (res && 'data' in res && res?.data?.success) {
                toast.success((res as AxiosResponse).data?.message || "User deleted");
                setEmployeePortfolioOptions((prev) =>
                    prev.filter((opt) => opt.value !== user.id)
                );
                setDeleteState({ open: false, loading: false, payload: null });
                fetchUsers();
            } else {
                const errorRes = res as AxiosError<ApiErrorResponse>;
                toast.error(errorRes?.response?.data?.message || "Delete failed");
                setDeleteState((p) => ({ ...p, loading: false }));
            }
        } catch (error) {
            toast.error("Something went wrong");
            setDeleteState((p) => ({ ...p, loading: false }));
        }
    };

    const handleAddNewUser = () => {
        setSelectedUser(null);
        setDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setDrawerOpen(false);
        setSelectedUser(null);
    };

    const handleOverrideSave = (overrides: { [moduleKey: string]: any }) => {
        // Update the row in UserList to show icon when override is saved
        if (selectedUser) {
            const hasOverridesData = Object.keys(overrides).length > 0;

            // Update selectedUser
            setSelectedUser((prev: any) => ({
                ...prev,
                overrides: overrides
            }));

            // Update the row in rows array
            setRows((prevRows) =>
                prevRows.map((row) =>
                    row.id === selectedUser.id
                        ? { ...row, hasOverrides: hasOverridesData }
                        : row
                )
            );
        }
    };

    const handleSaveUser = async (values: any) => {
        try {
            const formData = new FormData();

            formData.append("first_name", values?.firstName || "");
            formData.append("last_name", values?.lastName || "");
            formData.append("email", values?.email || "");
            formData.append("role_id", values?.role || "");
            formData.append("user_type", values?.user_type || "");
            formData.append("status", (values?.status || "").toLowerCase());
            formData.append("location", values?.location || "");
            formData.append("two_step_enabled", JSON.parse(values?.two_step_enabled));
            formData.append("password", values.newPassword || "");
            formData.append("confirm_password", values.confirmPassword || "");

            if (Array.isArray(values?.employeePortfolio)) {
                values.employeePortfolio.forEach((id: string) => {
                    formData.append("employee_portfolio[]", id);
                });
            }

            if (values?.avatar instanceof File) {
                formData.append("profile_pic", values.avatar);
            }

            if (selectedUser) {
                const res = await ApiCall("PUT", `/api/users/${selectedUser.id}`, formData, { Authorization: token });

                if (res && 'data' in res && res?.data?.success) {
                    toast.success((res as AxiosResponse).data?.message || "User updated successfully");
                    setDrawerOpen(false);
                    setSelectedUser(null);
                    fetchUsers();
                    return true;
                } else {
                    const errorRes = res as AxiosError<ApiErrorResponse>;
                    toast.error(errorRes?.response?.data?.message || "Update failed");
                    return false;
                }
            } else {
                const res = await ApiCall("POST", "/api/users", formData, { Authorization: token });
                if (res && 'data' in res && res?.data?.success) {
                    toast.success((res as AxiosResponse).data?.message || "User created successfully");
                    setDrawerOpen(false);
                    fetchUsers();
                    return true;
                } else {
                    const errorRes = res as AxiosError<ApiErrorResponse>;
                    toast.error(errorRes?.response?.data?.message || "Create failed");
                    return false;
                }
            }
        } catch (error) {
            toast.error("Something went wrong");
            return false;
        }
    };

    const columns: TableColumn[] = [
        {
            id: "userName",
            label: "User Name",
            width: "305px",
            align: "left",
            sortable: true,
        },
        {
            id: "email",
            label: "Email",
            width: "305px",
            align: "left",
            sortable: true,
        },
        {
            id: "role",
            label: "Role",
            width: "305px",
            align: "left",
            sortable: true,
        },
        {
            id: "actions",
            label: "Actions",
            width: "128px",
            align: "center",
            sortable: false,
            draggable: false,
            showColumnActions: false,
        },
    ];

    const renderCell = (row: User, column: TableColumn) => {
        const rowIndex = rows.findIndex((u) => u.id === row.id);
        const displayIndex = (currentPage - 1) * itemsPerPage + rowIndex + 1;
        const roleClass = roleClassSequence[rowIndex % roleClassSequence.length];

        switch (column.id) {
            case "index":
                return (
                    <Typography className="user-table-index-text">{displayIndex}</Typography>
                );

            case "userName":
                return (
                    <Box className="user-table-name-cell">
                        <Avatar className="user-table-avatar" src={row.profilePic || undefined}>
                            {row.initials}
                        </Avatar>
                        <Box className="user-table-name-wrapper">
                            <Typography className="user-table-name-text">{row.name}</Typography>
                        </Box>
                    </Box>
                );

            case "email":
                return (
                    <Typography className="user-table-email-text">{row.email}</Typography>
                );

            case "role":
                return (
                    <Box className={`user-table-role-badge ${roleClass}`} sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Typography className="user-table-role-text">{row.roleName || ""}</Typography>
                        {/* Show icon only when user has overrides */}
                        {row.hasOverrides && (
                            <div className="d-flex">
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 1.5v6m0 0A1.5 1.5 0 1 0 4.5 9M3 7.5A1.5 1.5 0 0 1 4.5 9M9 4.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3m0 0A4.5 4.5 0 0 1 4.5 9" stroke="#2e90fa" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            </div>
                        )}
                    </Box>
                );

            case "actions":
                const currentUserId = getCurrentUserId();
                const isSelf = currentUserId && currentUserId === row.id;

                return (
                    <Box className="user-table-actions-cell">
                        {editLoadingUserId === row.id ? (
                            <CircularProgress color="primary" size={18} />
                        ) : (
                            <IconButton
                                className="user-table-action-button"
                                onClick={() => handleEdit(row)}
                                size="small"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.167 2.5A2.357 2.357 0 0 1 17.5 5.833L6.25 17.083l-4.583 1.25 1.25-4.583z" stroke="#52525b" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </IconButton>
                        )}

                        {!isSelf && (
                            <IconButton
                                className="user-table-action-button user-delete-btn"
                                onClick={() => handleDelete(row)}
                                size="small"
                            >
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 5h1.667m0 0H17.5M4.167 5v11.667a1.667 1.667 0 0 0 1.666 1.667h8.334a1.667 1.667 0 0 0 1.666-1.667V5zm2.5 0V3.334a1.667 1.667 0 0 1 1.666-1.667h3.334a1.667 1.667 0 0 1 1.666 1.667V5m-5 4.167v5m3.334-5v5" stroke="#535862" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </IconButton>
                        )}
                    </Box>
                );

            default:
                return null;
        }
    };

    const columnFilterConfig = useMemo(() => ({
        enable: true,
        columns: {
            userName: {
                type: "search",
            },
            email: {
                type: "search",
            },
            role: {
                type: "dropdown",
                options: roleOptions,
            },
        },
    }), [roleOptions]);


    return (
        <PageContainer>
            <Box className="user-list-container">
                <Paper className="user-list-card" elevation={0}>
                    <Box className="user-list-header">
                        <Box className="user-list-header-content">
                            <Box className="user-list-tabs">
                                <Box
                                    className={`user-list-tab ${activeTab === "active" ? "user-list-tab-active" : ""}`}
                                    onClick={() => {
                                        setActiveTab("active");
                                        setCurrentPage(1);
                                    }}
                                >
                                    <Box className="user-list-tab-dot user-list-tab-dot-active" />
                                    <Typography className="user-list-tab-text">
                                        Active ({activeCount} User{activeCount !== 1 ? "s" : ""})
                                    </Typography>
                                </Box>
                                <Box
                                    className={`user-list-tab ${activeTab === "inactive" ? "user-list-tab-active" : ""}`}
                                    onClick={() => {
                                        setActiveTab("inactive");
                                        setCurrentPage(1);
                                    }}
                                >
                                    <Box className="user-list-tab-dot user-list-tab-dot-inactive" />
                                    <Typography className="user-list-tab-text">
                                        Inactive ({inactiveCount} User{inactiveCount !== 1 ? "s" : ""})
                                    </Typography>
                                </Box>
                            </Box>

                            <Box className="user-list-toolbar-actions">
                                <TableToolbar
                                    title=""
                                    showSearch={true}
                                    showRows={true}
                                    showExpand={true}
                                    showFullScreen={true}
                                    onSearchChange={handleSearchChange}
                                    searchValue={searchText}
                                    enableColumnVisibility={true}
                                    onColumnVisibilityClick={handleColumnVisibilityClick}
                                    enableColumnFilters={true}
                                    showFilterRow={showFilterRow}
                                    onFilterRowToggle={() => {
                                        setShowFilterRow((prev) => {
                                            const next = !prev;

                                            // 👇 sirf jab user toolbar icon se band kare
                                            if (!next) {
                                                setActiveFilterColumnId(null);
                                            }

                                            return next;
                                        });
                                    }}
                                />
                                <AppButton
                                    variant="contained"
                                    color="primary"
                                    className="app-common-button"
                                    onClick={handleAddNewUser}
                                    startIcon={<AddIcon />}
                                >
                                    Add New User
                                </AppButton>
                            </Box>
                        </Box>
                    </Box>

                    <Box className="user-list-table-wrapper">
                        <CommonTable
                            columns={columns}
                            rows={rows}
                            renderCell={renderCell}
                            sortConfig={sortConfig}
                            onSortChange={handleSortChange}
                            expandTrigger="none"
                            type='userlist-table'
                            isLoading={loading}
                            isFirstLoad={isFirstLoad.current}
                            enableSelection={false}
                            selectedRows={selectedRows}
                            onSelectionChange={handleSelectionChange}
                            columnVisibilityConfig={{
                                enable: true,
                                columns: ["userName", "email", "role", "actions"],
                                enableReorder: true,
                            }}
                            hiddenColumns={hiddenColumns}
                            onColumnVisibilityChange={handleColumnVisibilityChange}
                            columnVisibilityAnchorEl={columnVisibilityAnchor}
                            onColumnVisibilityClose={handleColumnVisibilityClose}
                            enableColumnActions={true}
                            enableColumnFilters={true}
                            showFilterRow={showFilterRow}
                            activeFilterColumnId={activeFilterColumnId}
                            onActiveFilterColumnIdChange={setActiveFilterColumnId}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilterChange}
                            onFilterRowToggle={handleFilterRowToggle}
                            enableColumnReorder={true}
                            columnOrder={columnOrder}
                            onColumnOrderChange={handleColumnOrderChange}
                            enableColumnPinning={true}
                            pinnedColumns={pinnedColumns}
                            onColumnPinningChange={handleColumnPinningChange}
                            columnFilterConfig={columnFilterConfig}
                        />
                    </Box>

                    {totalPages > 1 && (
                        <Box className="user-list-pagination-wrapper">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                                maxVisiblePages={5}
                                totalEntries={activeTab === "active" ? activeCount : inactiveCount}
                                itemsPerPage={itemsPerPage}
                                showEntriesMessage={true}
                            />
                        </Box>
                    )}
                </Paper>
            </Box>

            {drawerOpen && <UserDrawer
                open={drawerOpen}
                onClose={handleDrawerClose}
                userData={selectedUser}
                onSave={handleSaveUser}
                roleOptions={roleOptions}
                employeePortfolioOptions={employeePortfolioOptions}
                designationOptions={designationOptions}
                onOverrideSave={handleOverrideSave}
            />}

            {deleteState?.open && <ConfirmActionModal
                className="delete-popup-container"
                open={deleteState.open}
                loading={deleteState.loading}
                title="Are You Sure?"
                description="You’re about to remove this record, which is connected to multiple items. Once deleted, this action cannot be undone."
                confirmText="Yes, Proceed"
                cancelText="No, Cancel"
                onClose={() =>
                    !deleteState.loading &&
                    setDeleteState({ open: false, loading: false, payload: null })
                }
                onConfirm={confirmDelete}
            />}
        </PageContainer>
    );
}
