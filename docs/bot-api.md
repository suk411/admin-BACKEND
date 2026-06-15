# Bot API Documentation

Base URL: `https://admin-backend-7lwn.onrender.com/api/admin`

Authentication: All endpoints require `x-bot-token` header with the shared `BOT_API_KEY`.

---

## Dashboard

```
GET /api/admin/dashboard?period=today
GET /api/admin/dashboard?period=month
GET /api/admin/dashboard?date=2025-06-01
```

**Response:**
```json
{
  "status": "success",
  "period": "today",
  "overview": { "totalUsers": 1500, "newUsers": 12 },
  "deposits": { "total": 500000, "count": 45, "pendingCount": 3 },
  "withdrawals": {
    "total": 300000, "chargeTotal": 10500, "count": 30,
    "success": { "count": 25, "total": 280000, "chargeTotal": 9800 },
    "pending": { "count": 5, "total": 20000, "chargeTotal": 700 },
    "failed": { "count": 0, "total": 0, "chargeTotal": 0 },
    "byStatus": {
      "SUCCESS": { "count": 25, "total": 280000 },
      "AUDITING": { "count": 5, "total": 20000 }
    }
  },
  "agentCommission": { "total": 5000, "count": 10 }
}
```

---

## User Search

```
GET /api/admin/user?userId=32545513
GET /api/admin/user?mobile=9876543210
```

**Response:**
```json
{
  "user": {
    "userId": 32545513, "mobile": "9876543210",
    "admin": false, "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-06-01T00:00:00.000Z"
  },
  "account": {
    "balance": 10000, "freezeBalance": 0, "totalDeposits": 50000,
    "totalWithdrawals": 30000, "vipLevel": "VIP 2", "status": "active",
    "turnover_batches": [ { "source": "default", "required": 5000, "achieved": 2000 } ]
  },
  "paymentMethods": {
    "bank": { "bankName": "SBI", "accountNo": "xxxx1234", "ifsc": "SBIN0012345", "holderName": "John" },
    "upi": { "upiId": "john@paytm" }
  },
  "sameIpUsers": 0,
  "lastIp": "103.25.xxx.xxx",
  "deviceInfo": { "ip": "103.25.xxx.xxx", "city": "Mumbai", "device": "Chrome" }
}
```

**Error:**
```json
{ "msg": "User not found with this mobile" }
```

---

## Deposit Orders

```
GET /api/admin/deposits?orderId=DEP250101ABC
GET /api/admin/deposits?userId=32545513&page=1&limit=50
GET /api/admin/deposits?mobile=9876543210&status=SUCCESS
GET /api/admin/deposits?dateFrom=2025-06-01&dateTo=2025-06-15
```

**Response (by orderId):**
```json
{
  "status": "success",
  "items": [{
    "orderId": "DEP250101ABC", "userId": 32545513, "amount": 1000,
    "receivedAmount": 1000, "status": "SUCCESS", "channelName": "SimplyPay",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }]
}
```

**Response (paginated):**
```json
{
  "status": "success", "total": 45, "page": 1, "limit": 50,
  "items": [ { "orderId": "DEP250101ABC", "userId": 32545513, "amount": 1000, "status": "SUCCESS", ... } ]
}
```

---

## Withdrawal Orders

```
GET /api/admin/withdrawals?orderId=WTH250101XYZ
GET /api/admin/withdrawals?userId=32545513&page=1&limit=50
GET /api/admin/withdrawals?status=PENDING&dateFrom=2025-06-01
```

**Response (by orderId):**
```json
{
  "status": "success",
  "items": [{
    "orderId": "WTH250101XYZ", "userId": 32545513, "amount": 5000,
    "charge": 181, "status": "PENDING", "channelName": "SimplyPay",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }]
}
```

**Response (paginated):**
```json
{
  "status": "success", "total": 30, "page": 1, "limit": 50,
  "items": [ { "orderId": "WTH250101XYZ", "userId": 32545513, "amount": 5000, "status": "PENDING", ... } ]
}
```

---

## Transactions

```
GET /api/admin/transactions?userId=32545513
GET /api/admin/transactions?orderId=DEP250101ABC
GET /api/admin/transactions?transactionId=abc123...&page=1&limit=25
GET /api/admin/transactions?userId=32545513&type=DEPOSIT&dateFrom=2025-06-01&dateTo=2025-06-15
```

**Response:**
```json
{
  "status": "success",
  "total": 120,
  "page": 1,
  "limit": 25,
  "items": [{
    "_id": "abc...",
    "userId": 32545513,
    "type": "DEPOSIT",
    "amount": 1000,
    "charge": 0,
    "balanceAfter": 15000,
    "status": "SUCCESS",
    "orderId": "DEP250101ABC",
    "remark": "Deposit via SimplyPay",
    "createdAt": "2025-01-01T10:00:00.000Z"
  }]
}
```

---

## Current Round

```
GET /api/admin/current-round
```

**Response:**
```json
{
  "success": true,
  "round": {
    "issueNumber": "25060110001",
    "status": "open",
    "startTime": "2025-06-01T10:00:00.000Z",
    "endTime": "2025-06-01T10:03:00.000Z"
  },
  "stats": {
    "totalBets": 85,
    "totalBetAmount": 25000,
    "uniqueUsers": 42,
    "breakdown": { "red": 5000, "green": 3000, "violet": 2000, "big": 4000, "small": 3000, "0": 500, "1": 800, "2": 600, "3": 700, "4": 900, "5": 1000, "6": 750, "7": 850, "8": 950, "9": 650 }
  }
}
```

---

## Current Round Bets

```
GET /api/admin/current-round/bets?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "page": 1,
  "limit": 50,
  "total": 85,
  "issueNumber": "25060110001",
  "items": [{
    "_id": "abc...",
    "userId": 32545513,
    "mobile": "9876543210",
    "orderNumber": "WGB2506010001",
    "betAmount": 100,
    "fee": 0,
    "selectType": "red",
    "status": "pending",
    "result": null,
    "createdAt": "2025-06-01T10:00:05.000Z"
  }]
}
```

---

## Settled Rounds

```
GET /api/admin/rounds?page=1&limit=25
```

**Response:**
```json
{
  "success": true,
  "page": 1,
  "limit": 25,
  "total": 500,
  "issues": [{
    "issueNumber": "25060109999",
    "result": "3",
    "color": "red",
    "size": "small",
    "status": "settled",
    "totalBets": 120,
    "totalBetAmount": 35000,
    "totalPayout": 28000,
    "profitLoss": 7000,
    "wonCount": 45,
    "lostCount": 75,
    "uniqueUsers": 60,
    "breakdown": { "red": 8000, "green": 5000, ... },
    "createdAt": "2025-06-01T09:57:00.000Z"
  }]
}
```

---

## Round Stats

```
GET /api/admin/round-stats/25060109999
```

**Response:**
```json
{
  "success": true,
  "issue": {
    "issueNumber": "25060109999",
    "result": "3",
    "color": "red",
    "size": "small",
    "status": "settled",
    "createdAt": "2025-06-01T09:57:00.000Z"
  },
  "stats": {
    "totalBets": 120,
    "totalBetAmount": 35000,
    "totalPayout": 28000,
    "profitLoss": 7000,
    "wonCount": 45,
    "lostCount": 75,
    "uniqueUsers": 60,
    "breakdown": {
      "red": { "count": 25, "amount": 8000 },
      "green": { "count": 15, "amount": 5000 },
      "violet": { "count": 10, "amount": 2000 },
      "big": { "count": 20, "amount": 6000 },
      "small": { "count": 30, "amount": 9000 },
      "0": { "count": 2, "amount": 500 },
      "1": { "count": 3, "amount": 700 },
      "2": { "count": 1, "amount": 300 },
      "3": { "count": 5, "amount": 1500 },
      "4": { "count": 4, "amount": 1200 },
      "5": { "count": 6, "amount": 1800 },
      "6": { "count": 2, "amount": 600 },
      "7": { "count": 3, "amount": 900 },
      "8": { "count": 4, "amount": 1100 },
      "9": { "count": 3, "amount": 800 }
    }
  }
}
```
