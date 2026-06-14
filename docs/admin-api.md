# Admin API Documentation

Base URL: `https://your-admin-backend.com/api/admin`

Authentication: All endpoints except `/auth/login` require a Bearer token or cookie.
Token is obtained from `POST /api/admin/auth/login`.

---

## Authentication

### POST /api/admin/auth/login
Authenticate as admin.

**Request Body:**
```json
{
  "mobile": "9876543210",
  "password": "adminpassword"
}
```

**Success Response (200):**
```json
{
  "msg": "Login successful",
  "status": "success",
  "token": "eyJhbG...",
  "user": {
    "userId": 32545513,
    "mobile": "9876543210",
    "admin": true
  }
}
```

**Error Response (401):**
```json
{ "msg": "Invalid credentials", "status": "failed" }
```

**Error Response (403):**
```json
{ "msg": "Access denied: Not an admin account", "status": "failed" }
```

---

### POST /api/admin/auth/logout
Clear session.

**Success Response:**
```json
{ "msg": "Logged out", "status": "success" }
```

---

### GET /api/admin/auth/me
Get current admin user info.

**Headers:** `Authorization: Bearer <token>`

**Success Response:**
```json
{
  "status": "success",
  "user": {
    "userId": 32545513,
    "mobile": "9876543210",
    "admin": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Dashboard

### GET /api/admin/dashboard
Platform overview stats.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| period | string | `today`, `month`, or empty for all-time |
| date | string | Specific date (YYYY-MM-DD) |

**Success Response:**
```json
{
  "status": "success",
  "overview": { "totalUsers": 1500, "newUsers": 12 },
  "deposits": { "total": 500000, "count": 45, "pendingCount": 3 },
  "withdrawals": {
    "total": 300000, "count": 30,
    "success": { "count": 25, "total": 280000 },
    "pending": { "count": 5, "total": 20000 },
    "failed": { "count": 0, "total": 0 }
  },
  "agentCommission": { "total": 5000, "count": 10 }
}
```

---

## User Management

### GET /api/admin/user
Search user by userId or mobile.

**Query Parameters:** `userId` (number) or `mobile` (string)

**Success Response:**
```json
{
  "user": { "userId": 32545513, "mobile": "9876543210", "admin": false },
  "account": { "balance": 10000, "vipLevel": "VIP 2", "status": "active" },
  "paymentMethods": { "bank": {...}, "upi": {...} },
  "sameIpUsers": 0,
  "lastIp": "103.25.xxx.xxx",
  "deviceInfo": { "ip": "103.25.xxx.xxx", "city": "Mumbai", ... }
}
```

---

### PATCH /api/admin/user
Update user account status (active/suspended/banned).

**Request Body:**
```json
{
  "userId": 32545513,
  "status": "suspended",
  "remark": "Violation of terms"
}
```

**Success Response:**
```json
{
  "msg": "Status updated",
  "userId": 32545513,
  "status": "suspended",
  "statusRemark": "Violation of terms"
}
```

---

### GET /api/admin/user/full
Full user details with recent transactions, deposits, withdrawals.

**Query Parameters:** `userId` (number, required)

---

### GET /api/admin/users-by-ip
Find users sharing the same IP address.

**Query Parameters:** `ip` (string, required)

---

## Deposits

### GET /api/admin/deposits
List deposit orders.

**Query Parameters:** `orderId`, `userId`, `mobile`, `page`, `limit` (1-100), `status`, `dateFrom`, `dateTo`

---

### POST /api/admin/deposits/approve
Approve a pending deposit order.

**Request Body:**
```json
{ "orderId": "DEP250101ABC" }
```

**Success Response:**
```json
{
  "msg": "Deposit approved",
  "orderId": "DEP250101ABC",
  "userId": 32545513,
  "amount": 1000,
  "status": "SUCCESS",
  "bonusAmount": 100
}
```

---

## Withdrawals

### GET /api/admin/withdrawals
List withdrawal orders.

**Query Parameters:** `orderId`, `userId`, `page`, `limit`, `status`, `dateFrom`, `dateTo`

---

### POST /api/admin/withdrawals/approve
Approve a pending withdrawal (sends payout via gateway).

**Request Body:**
```json
{
  "orderId": "WTH250101XYZ",
  "chargeFrom": "user"
}
```

`chargeFrom` can be `"user"` (deduct 3.5% + ₹6 fee) or `"platform"` (no fee).

---

### POST /api/admin/withdrawals/cancel
Cancel and refund a withdrawal.

**Request Body:**
```json
{
  "orderId": "WTH250101XYZ",
  "note": "Bank details mismatch"
}
```

---

## Transactions

### GET /api/admin/transactions
Paginated transaction history.

**Query Parameters:** `userId` (required), `orderId`, `transactionId`, `type`, `dateFrom`, `dateTo`, `page`, `limit`

---

## Configuration Endpoints

### VIP Config
- `GET /api/admin/vip-config` - Get VIP level config
- `PUT /api/admin/vip-config` - Update VIP levels

### Deposit Config
- `GET /api/admin/deposit-config` - List deposit channel configs
- `PUT /api/admin/deposit-config/:channel` - Update channel config

### Deposit Bonus Config
- `GET /api/admin/deposit-bonus-config` - Get bonus rates
- `PUT /api/admin/deposit-bonus-config` - Update bonus rates

### Withdrawal Config
- `GET /api/admin/withdrawal-config` - Get withdrawal limits
- `PUT /api/admin/withdrawal-config` - Update withdrawal limits

### Turnover Config
- `GET /api/admin/turnover-config` - List turnover multipliers
- `PUT /api/admin/turnover-config` - Update multiplier
- `GET /api/admin/turnover-status?userId=X` - User turnover status
- `POST /api/admin/turnover/clear` - Clear user turnover
- `POST /api/admin/turnover/add` - Add turnover requirement

### Agency Levels
- `GET /api/admin/agency-levels` - List agency level configs
- `PUT /api/admin/agency-levels/:level` - Update level config

---

## Gift Codes

### POST /api/admin/gift-codes
Create a new gift code.

**Request Body:**
```json
{
  "rewardAmount": 100,
  "turnoverMultiplier": 3,
  "maxRedemptions": 50,
  "expiryDate": "2025-12-31",
  "minDepositToday": 0,
  "isActive": true
}
```

### GET /api/admin/gift-codes
List gift codes with pagination.

**Query Parameters:** `page`, `limit`, `isActive`, `search`

### GET /api/admin/gift-codes/:code
Get single gift code details.

### PUT /api/admin/gift-codes/:code
Update a gift code.

### PATCH /api/admin/gift-codes/:code/toggle
Enable/disable a gift code.

### DELETE /api/admin/gift-codes/:code
Delete a gift code and its redemptions.

### GET /api/admin/gift-codes/:code/redemptions
View redemption history for a gift code.

---

## Game Operations

### POST /api/admin/move-game-to-wallet
Transfer game provider balance back to user wallet.

**Request Body (single user):**
```json
{
  "userId": 32545513,
  "providerCode": "ALL"
}
```

**Request Body (range):**
```json
{
  "userId": 100,
  "userIdTo": 110
}
```

**Request Body (array):**
```json
{
  "userIds": [101, 102, 103]
}
```

---

## Server Logs

### GET /api/admin/logs
View in-memory server logs.

**Query Parameters:** `level` (info/error/warn), `since`, `limit`

---

## Wingo Admin

### GET/POST /api/admin/result-mode
Get or set Wingo result generation mode.

**POST Body:**
```json
{ "mode": "RANDOM" }
```
Modes: `RANDOM`, `MAX_PROFIT`, `MAX_LOSS`

### GET /api/admin/current-round
Get current Wingo round with bet breakdown.

### GET /api/admin/current-round/bets
Get bets for current round (paginated, with user mobile).

### GET /api/admin/round-stats/:issueNumber
Full stats for a specific round.

### GET /api/admin/rounds
Paginated list of settled rounds with stats.

---

## Common Error Responses

### 401 Unauthorized
```json
{ "msg": "Authentication token is missing", "status": "failed" }
```

### 403 Forbidden
```json
{ "msg": "Access denied: Admins only", "status": "failed" }
```

### 404 Not Found
```json
{ "msg": "Resource not found", "status": "failed" }
```

### 500 Server Error
```json
{ "msg": "Error message", "status": "failed" }
```
