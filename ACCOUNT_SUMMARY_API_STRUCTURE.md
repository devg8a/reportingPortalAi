# Account Summary API Structure Documentation

## 📁 File Structure

```
frontend/src/
├── types/
│   └── accountSummary.types.ts         # All TypeScript interfaces
├── services/
│   └── accountSummary.service.ts       # API service class
├── redux/
│   ├── accountSummarySlice.ts          # Redux slice with async thunks
│   └── store.ts                        # Updated with accountSummary reducer
└── pages/AccountSummary/
    └── AccountSummaryMain.tsx          # Component with API integration
```

## 🎯 Features Implemented

### 1. **Account Summary APIs**
- ✅ `GET /api/account-summary/view` - Fetch account summary data
- ✅ `POST /api/account-summary/refresh` - Trigger data refresh

### 2. **Hide Client APIs**
- ✅ `POST /api/hide-client` - Hide multiple clients
- ✅ `POST /api/unhide-client` - Unhide multiple clients
- ✅ `GET /api/hide-client` - Get list of hidden clients

### 3. **Hourly Cron APIs**
- ✅ `POST /api/cron/trigger-hourly` - Manually trigger hourly cron
- ✅ `GET /api/cron/status` - Get cron job status

## 📋 TypeScript Interfaces

### Account Summary Types
```typescript
interface TimeseriesData {
    date: string;
    hour?: string;
    impressions?: number;
    clicks?: number;
    spend?: number;
    revenue?: number;
    sessions?: number;
    conversions?: number;
}

interface NetworkData {
    network: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    roas: number;
    timeseries: TimeseriesData[];
}

interface ClientSummary {
    clientId: string;
    clientName: string;
    totalSpend: number;
    totalRevenue: number;
    totalRoas: number;
    networks: NetworkData[];
    lastUpdated: string;
}
```

### Hidden Client Types
```typescript
interface HiddenClient {
    clientId: string;
    clientName?: string;
    hiddenAt: string;
    hiddenBy?: string;
}
```

### Cron Types
```typescript
interface HourlyCronStatus {
    lastRun: string;
    nextRun: string;
    status: 'running' | 'idle' | 'error';
    message?: string;
}
```

## 🔧 Redux Store Structure

```typescript
RootState {
    auth: AuthState
    userData: UserDataState
    permissions: PermissionsState
    accountSummary: {
        // Account Summary
        data: ClientSummary[]
        loading: boolean
        error: string | null
        lastUpdated: string | null
        
        // Hidden Clients
        hiddenClients: HiddenClient[]
        hiddenClientsLoading: boolean
        hiddenClientsError: string | null
        
        // Cron Status
        cronStatus: HourlyCronStatus | null
        cronLoading: boolean
        cronError: string | null
        
        // UI State
        selectedDateRange: {
            startDate: string
            endDate: string
        }
    }
}
```

## 🚀 Usage Examples

### 1. Fetch Account Summary
```typescript
import { useDispatch } from 'react-redux';
import { fetchAccountSummary } from '../redux/accountSummarySlice';

const dispatch = useDispatch();

const result = await dispatch(
    fetchAccountSummary({
        startDate: "2026-01-20",
        endDate: "2026-01-22",
        clientIds: ["client1", "client2"] // optional
    })
);
```

### 2. Hide/Unhide Clients
```typescript
import { hideClients, unhideClients } from '../redux/accountSummarySlice';

// Hide clients
await dispatch(hideClients(["client1", "client2"]));

// Unhide clients
await dispatch(unhideClients(["client1"]));
```

### 3. Get Hidden Clients
```typescript
import { getHiddenClients } from '../redux/accountSummarySlice';

const result = await dispatch(getHiddenClients());
```

### 4. Trigger Hourly Cron
```typescript
import { triggerHourlyCron, getCronStatus } from '../redux/accountSummarySlice';

// Trigger cron
await dispatch(triggerHourlyCron({ force: true }));

// Get status
await dispatch(getCronStatus());
```

### 5. Refresh Data
```typescript
import { refreshAccountSummary } from '../redux/accountSummarySlice';

// Trigger refresh
await dispatch(refreshAccountSummary());

// Re-fetch data after refresh
await dispatch(fetchAccountSummary({
    startDate: "2026-01-20",
    endDate: "2026-01-22"
}));
```

## 📊 Redux Selectors

```typescript
// Account Summary
selectAccountSummaryData
selectAccountSummaryLoading
selectAccountSummaryError
selectAccountSummaryLastUpdated

// Hidden Clients
selectHiddenClients
selectHiddenClientsLoading
selectHiddenClientsError

// Cron
selectCronStatus
selectCronLoading
selectCronError

// UI
selectDateRange
```

## 🎨 Component Integration

See `AccountSummaryMain.tsx` for complete example with:
- ✅ Redux hooks setup
- ✅ API calls on mount
- ✅ Console logging for debugging
- ✅ Loading states
- ✅ Error handling
- ✅ Debug buttons

## 📝 Console Output

When you open Account Summary page, check browser console for:

```
=== Fetching Initial Data ===
📊 Account Summary Data: { ... }
👁️ Hidden Clients: { ... }
⏰ Cron Status: { ... }

📦 Redux State - Account Summary Data: [...]
👁️ Redux State - Hidden Clients: [...]
⏰ Redux State - Cron Status: {...}
```

## 🔐 Authentication

All API calls automatically include the auth token from Redux store:
```typescript
const { auth } = getState();
const token = auth?.token || "";

// Token is sent in Authorization header
ApiCall("GET", "/api/...", "", { Authorization: token })
```

## ⚙️ Service Layer Pattern

All APIs are centralized in `accountSummary.service.ts`:

```typescript
class AccountSummaryService {
    async getAccountSummary(params, token) { ... }
    async refreshAccountSummary(token) { ... }
    async hideClients(clientIds, token) { ... }
    async unhideClients(clientIds, token) { ... }
    async getHiddenClients(token) { ... }
    async triggerHourlyCron(params, token) { ... }
    async getCronStatus(token) { ... }
}

export const accountSummaryService = new AccountSummaryService();
```

## 🎯 Next Steps

1. **Backend Implementation**: Implement the actual API endpoints
2. **UI Integration**: Build tables and UI components using the Redux data
3. **Error Handling**: Add toast notifications for errors
4. **Loading States**: Add proper loading indicators
5. **Date Range Picker**: Connect date range picker to fetch data
6. **Hidden Clients UI**: Integrate with VisibleClientsDropdown

## 🧪 Testing

Open browser console and click debug buttons to test:
- 🔄 Refresh Data
- 🙈 Hide Clients
- 👁️ Unhide Clients
- ⏰ Trigger Cron

All results will be logged to console.
