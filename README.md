# Admin Backend

A separate Node.js backend service dedicated to admin operations for the 1xKing platform.

## Purpose

This project extracts all admin functionality from the monolithic backend into its own deployable service. User traffic continues on the original backend; admin traffic uses this dedicated service.

## Tech Stack

- **Runtime**: Node.js (ES Modules)
- **Web Framework**: Express 5
- **Database**: MongoDB + Mongoose (same database as main backend)
- **Cache**: Redis (ioredis)
- **Auth**: JSON Web Tokens (dedicated admin JWT)

## API Endpoints

See [docs/admin-api.md](docs/admin-api.md) for full API documentation.

## Environment Variables

Copy `.env.example` to `.env` and fill in all values.

### Required
| Variable | Description |
|----------|-------------|
| `MONGO_URI` | Main MongoDB connection string |
| `WINGO_MONGO_URI` | Wingo separate MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `ADMIN_JWT_SECRET` | Secret for signing admin JWT tokens |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `NODE_ENV` | development | Environment |

### Payment Gateways (for withdrawal payouts)
| Variable | Description |
|----------|-------------|
| `SIMPLYPAY_APP_ID` | SimplyPay app ID |
| `SIMPLYPAY_SECRET_KEY` | SimplyPay secret key |
| `UPAY_MERCHANT_ID` | UPay merchant ID |
| `UPAY_MERCHANT_KEY` | UPay merchant key |
| `GSPAY_AUTH_KEY` | GSPay auth key |
| `GSPAY_SECRET_KEY` | GSPay secret key |

### Game Provider (for move-game-to-wallet)
| Variable | Description |
|----------|-------------|
| `GAME_API_URL` | Game provider API URL |
| `OPERATOR_CODE` | Operator code |
| `GAME_SECRET_KEY` | Game provider secret key |

## Deployment

### Render

1. Push this project to a Git repository
2. Create a new Web Service on Render
3. Connect your repository
4. Render will auto-detect `render.yaml` or use these settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Set all required environment variables in Render dashboard
6. Deploy

### Manual

```bash
npm install
cp .env.example .env
# Edit .env with your values
npm start
```

## What's NOT in this project

The following features remain in the main backend:
- User registration / login
- User wallet / balance APIs
- Game play / betting APIs
- Payment gateway deposit callbacks
- User-facing agency dashboard
- Wingo user betting routes
- All cron jobs (bet sync, turnover processing, agency midnight)
