# Bot API Documentation

Base URL: `https://admin-backend-7lwn.onrender.com/api/admin`

Authentication: All endpoints require `x-bot-token` header with the shared `BOT_API_KEY`.

---

| Method | Route | Description | Query Params |
|--------|-------|-------------|--------------|
| GET | /api/admin/dashboard | Platform dashboard stats | `period` (today/month), `date` (YYYY-MM-DD) |
| GET | /api/admin/user | Search user by ID/phone | `userId` or `mobile` |
| GET | /api/admin/deposits | List deposit orders | `orderId`, `userId`, `mobile`, `page`, `limit`, `status`, `dateFrom`, `dateTo` |
| GET | /api/admin/withdrawals | List withdrawal orders | `orderId`, `userId`, `page`, `limit`, `status`, `dateFrom`, `dateTo` |
| GET | /api/admin/transactions | User transaction history | `userId`, `orderId`, `transactionId`, `type`, `page`, `limit`, `dateFrom`, `dateTo` |
| GET | /api/admin/current-round | Current Wingo round with bet breakdown | none |
| GET | /api/admin/current-round/bets | Bets for current round | `page`, `limit` |
| GET | /api/admin/rounds | Settled rounds list | `page`, `limit` |
| GET | /api/admin/round-stats/:issueNumber | Full round stats by issue number | none (issueNumber in URL) |

## Notes

- **Dashboard**: Bot should send `?period=today` to match original bot behavior
- **User search**: Provide either `userId` (number) or `mobile` (string)
- **Deposits/Withdrawals**: Search by `orderId` returns single order; search by `userId`/`mobile` returns paginated list
- **Transactions**: Requires at least one of `userId`, `orderId`, or `transactionId`
- **Pagination**: Default `limit=50`, max `100` for deposits/withdrawals; default `limit=25`, max `50` for rounds
- **Dates**: `dateFrom` and `dateTo` in YYYY-MM-DD format
