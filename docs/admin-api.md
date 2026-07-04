# Admin API Documentation

Base URL: `https://admin-backend-7lwn.onrender.com/api/admin`

Authentication: All endpoints except `/auth/login` require a Bearer token or cookie.
Token is obtained from `POST /api/admin/auth/login`.

---

## Authentication

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/admin/auth/login | Admin login |
| POST | /api/admin/auth/logout | Clear session |
| GET | /api/admin/auth/me | Get current admin info |

## Dashboard

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/dashboard | Platform overview (period, date) |

## User Management

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/user | Search user by userId or mobile |
| PATCH | /api/admin/user | Update user status (active/suspended/banned) |
| GET | /api/admin/user/full | Full user details with transactions |
| GET | /api/admin/users-by-ip | Users sharing same IP |

## Deposits

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/deposits | List deposits (orderId, userId, mobile, page, limit, status, dateFrom, dateTo) |
| POST | /api/admin/deposits/approve | Approve pending deposit |

## Withdrawals

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/withdrawals | List withdrawals (orderId, userId, page, limit, status, dateFrom, dateTo) |
| POST | /api/admin/withdrawals/approve | Approve withdrawal (sends payout) |
| POST | /api/admin/withdrawals/cancel | Cancel and refund withdrawal |

## Transactions

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/transactions | Paginated transactions (userId required, orderId, type, dateFrom, dateTo, page, limit) |

## Configuration

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/vip-config | Get VIP level config |
| PUT | /api/admin/vip-config | Update VIP levels |
| GET | /api/admin/deposit-config | List deposit channel configs |
| PUT | /api/admin/deposit-config/:channel | Update channel config |
| GET | /api/admin/deposit-bonus-config | Get bonus rates |
| PUT | /api/admin/deposit-bonus-config | Update bonus rates |
| GET | /api/admin/withdrawal-config | Get withdrawal limits |
| PUT | /api/admin/withdrawal-config | Update withdrawal limits |
| GET | /api/admin/turnover-config | List turnover multipliers |
| PUT | /api/admin/turnover-config | Update multiplier |
| GET | /api/admin/turnover-status | User turnover status (userId) |
| POST | /api/admin/turnover/clear | Clear user turnover |
| POST | /api/admin/turnover/add | Add turnover requirement |
| GET | /api/admin/agency-levels | List agency level configs |
| PUT | /api/admin/agency-levels/:level | Update level config |

## Gift Codes

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/admin/gift-codes | Create gift code |
| GET | /api/admin/gift-codes | List gift codes (page, limit, isActive, search) |
| GET | /api/admin/gift-codes/:code | Get gift code details |
| PUT | /api/admin/gift-codes/:code | Update gift code |
| PATCH | /api/admin/gift-codes/:code/toggle | Enable/disable gift code |
| DELETE | /api/admin/gift-codes/:code | Delete gift code |
| GET | /api/admin/gift-codes/:code/redemptions | View redemptions |

## Game Operations

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/admin/move-game-to-wallet | Transfer game balance to wallet (single/range/array) |

## Server Logs

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/logs | View server logs (level, since, limit) |

## Wingo Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/result-mode | Get result generation mode |
| POST | /api/admin/result-mode | Set result generation mode (RANDOM/MAX_PROFIT/MAX_LOSS) |
| GET | /api/admin/current-round | Current round with bet breakdown |
| GET | /api/admin/current-round/bets | Bets for current round (paginated) |
| GET | /api/admin/round-stats/:issueNumber | Round stats by issue number |
| GET | /api/admin/rounds | Paginated settled rounds with stats |

## Agency Commission

| Method | Route | Description |
|--------|-------|-------------|
| GET | /api/admin/agent/agentcomm | View agent commission records (userId, page, limit, dateFrom, dateTo) |
| POST | /api/admin/agent/runmidnightcalc | Manually trigger midnight commission batch |

---

### Get Agent Commission Records

```
GET /api/admin/agent/agentcomm?userId=1000&page=1&limit=50&dateFrom=2026-06-01&dateTo=2026-07-04
```

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| userId | number | Yes | Agent user ID |
| page | number | No | Page number (default 1) |
| limit | number | No | Items per page, max 100 (default 50) |
| dateFrom | string | No | Filter by date (YYYY-MM-DD), inclusive |
| dateTo | string | No | Filter by date (YYYY-MM-DD), inclusive |

**Response:**

```json
{
  "status": "success",
  "total": 15,
  "page": 1,
  "limit": 50,
  "data": [
    {
      "userId": 1000,
      "date": "2026-07-03T00:00:00.000Z",
      "rebateLevel": 3,
      "l1Bets": 125000,
      "l2Bets": 45000,
      "l3Bets": 12000,
      "l1Rate": 0.0075,
      "l2Rate": 0.0028125,
      "l3Rate": 0.00105469,
      "l1Amount": 937.50,
      "l2Amount": 126.56,
      "l3Amount": 12.66,
      "totalAmount": 1076.72,
      "status": "CREDITED",
      "creditedAt": "2026-07-04T00:05:00.000Z"
    }
  ]
}
```

---

### Run Midnight Commission Batch

```
POST /api/admin/agent/runmidnightcalc
```

Triggers `processMidnightBatch` for all `DailyGameStats` records where `commissionProcessed` is not yet true. Credits computed commissions to agent wallets and records `AGENT_COMMISSION` transactions.

**Response (success):**

```json
{
  "status": "success",
  "processed": 1,
  "totalCommission": 1076.72
}
```

**Response (no unprocessed records):**

```json
{
  "status": "success",
  "processed": 0,
  "totalCommission": 0
}
```
