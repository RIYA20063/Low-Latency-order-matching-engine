# Low-Latency Order Matching Engine

A full-stack simulated crypto (BTC/USD) exchange featuring a price/time-priority order matching engine, live order book, trade execution reporting, and an AI-powered market co-pilot.

Built as an architecture deep-dive into the data structures, execution flow, and engineering considerations behind sub-microsecond matching engines used in high-frequency trading systems.

## Features

- **Price/Time-Priority Matching Engine** — in-memory limit order book with BUY/SELL matching, partial fills, and sequencing
- **Live Execution Reports** — NEW, PARTIAL_FILL, FILL, and CANCELED events streamed per order
- **Real-Time Metrics** — simulated latency, throughput, and jitter tracking with a per-action latency heatmap
- **Order Management** — place, modify, and cancel limit orders via REST API
- **Persistent Trade History** — users, orders, and trades persisted to PostgreSQL via Drizzle ORM
- **Authentication** — email/password auth with JWT sessions and bcrypt password hashing, plus Firebase client-side auth support
- **AI Market Co-Pilot** — Gemini-powered order flow / market analysis endpoint
- **Operator Console** — live engine log stream (order book init, sequencer, matches) for a realistic exchange-operator feel

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Backend | Express, TypeScript (via `tsx`), Node.js |
| Database | PostgreSQL, Drizzle ORM |
| Auth | JWT (`jsonwebtoken`, `bcryptjs`), Firebase Auth |
| AI | Google Gemini API (`@google/genai`) |
| Build | Vite (client), esbuild (server bundle) |

## Project Structure

```
├── src/
│   ├── api/
│   │   ├── matching-engine.ts   # Core order matching logic & engine state
│   │   └── client.ts            # Frontend API client
│   ├── db/
│   │   ├── schema.ts            # Drizzle schema (users, orders, trades)
│   │   └── index.ts             # DB connection
│   ├── lib/
│   │   ├── firebase.ts          # Firebase client init
│   │   └── firebase-admin.ts    # Firebase admin init
│   ├── middleware/
│   │   └── auth.ts              # JWT auth middleware
│   ├── types.ts                 # Shared TypeScript types
│   ├── App.tsx                  # Main React application
│   └── main.tsx                 # React entry point
├── server.ts                    # Express server & REST API routes
├── firebase-applet-config.json  # Firebase client config
└── .env.example                 # Environment variable template
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/register` | Create a new user account |
| POST | `/api/login` | Authenticate and receive a JWT |
| GET | `/api/me` | Get the current authenticated user |
| GET | `/api/book` | Get the current order book snapshot |
| GET | `/api/trades` | Get the authenticated user's trade history |
| POST | `/api/orders` | Submit a new order |
| PUT | `/api/orders/:id` | Modify an existing order |
| DELETE | `/api/orders/:id` | Cancel an order |
| POST | `/api/ai/analyze` | Get an AI-generated market/order analysis |

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL database

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template and fill in your values:
   ```bash
   cp .env.example .env
   ```

3. Configure the required environment variables:
   - `GEMINI_API_KEY` — your Google Gemini API key (powers the AI co-pilot)
   - `APP_URL` — the URL this app is hosted at
   - Database connection variables for PostgreSQL (see `src/db/index.ts`)
   - `JWT_SECRET` — secret used to sign auth tokens (defaults to a dev-only value if unset)

4. Push the database schema:
   ```bash
   npx drizzle-kit push
   ```

5. Run the app in development mode:
   ```bash
   npm run dev
   ```

### Build for Production

```bash
npm run build
npm start
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server (Vite + Express via `tsx`) |
| `npm run build` | Build the client bundle and bundle the server with esbuild |
| `npm start` | Run the production server |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run clean` | Remove build output |

## How Matching Works

The engine maintains sorted bid (descending price) and ask (ascending price) books. Incoming orders are matched against the opposite book at the best available price, generating trades and execution reports until the order is fully filled or no more matching liquidity is available. Any unfilled remainder rests in the book, sorted by price then timestamp (time priority within the same price level).

## Disclaimer

This project is a simulation for educational and architectural exploration purposes. It is not connected to any real exchange, uses simulated liquidity, and should not be used for actual trading.
