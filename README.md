# Valley Farm Network

A digital agricultural marketplace and distribution platform connecting independent farmers directly with consumers, restaurants, and local communities.

---

## Overview

Valley Farm Network is a virtual farmers market where farmers create their own storefront pages to sell products — eggs, vegetables, honey, seafood, livestock, and more. Customers can make one-time purchases or subscribe to recurring deliveries of fresh farm products. The platform also introduces a local logistics layer, enabling farmers to coordinate delivery through independent drivers or manage their own fulfillment.

The goal is to reduce reliance on traditional grocery store supply chains and allow local communities to source food directly from producers.

---

## Project Goals

- Create new revenue streams for small and independent farmers
- Increase community access to fresh, locally grown food
- Build a subscription-based farm economy
- Digitize local agricultural supply chains
- Support decentralized food distribution networks
- Reduce the gap between producers and consumers

The platform launches with direct farm products such as eggs and produce, with planned expansion into aquaponics products including shrimp and fish.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payments | Stripe Connect |
| Package Manager | npm |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Stripe](https://stripe.com) account with Connect enabled

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/valley-farm-network.git
cd valley-farm-network

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in your Supabase and Stripe credentials in .env

# Start the dev server
npm run dev
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values. See [.env.example](.env.example) for all required variables.

Key variables:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key (server-side only) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PLATFORM_FEE_PERCENT` | Global transaction fee (default: 5%) |

---

## Farmer Pricing

Farmers can join the platform through three options, all managed via Stripe Connect:

| Plan | Price | Type | Features |
|---|---|---|---|
| **One-Time Listing** | $25 | One-time | Farm page, product listings, shareable link |
| **Basic** | $39/mo | Subscription | Farm page, product listings, shareable link |
| **Pro** | $69/mo | Subscription | Everything in Basic + customer subscriptions + delivery tools |

Platform transaction fees are set globally by the super admin and applied to all customer purchases.

---

## Platform Features

### Farmer Directory
Farmers create profiles with farm description, location, available products, and delivery area. Each farmer receives a dedicated page to promote their products.

### Product Listings
Farmers list products including eggs, vegetables, fruits, honey, meat, seafood, and aquaponics products. Listings support one-time purchases and recurring subscriptions.

### Subscription Commerce
Farmers offer subscription services — weekly egg deliveries, vegetable boxes, microgreens, seafood — creating stable recurring income.

### Delivery Coordination
Farmers choose their fulfillment method: customer pickup, self-delivery, or independent drivers registered on the platform.

### Digital Payments
Stripe Connect processes all payments. Funds flow directly to farmers' connected accounts. The platform collects listing fees, subscription fees, and per-transaction fees automatically.

---

## Background

For most of human history, food distribution happened through local markets — farmers bringing harvests to town squares where communities bought directly from producers. Farmers markets date back to ancient Mesopotamia, Greece, and Rome, serving as both economic and social hubs.

Industrialization changed this. Rail transport, refrigeration, centralized distribution, and supermarket chains created long supply chains that reduced farmer profits, limited food transparency, and concentrated power in large grocery corporations.

The modern farmers market movement reversed this trend. From ~1,700 markets in the US in 1994, there are now over 8,000. But traditional markets still have limitations — limited hours, geographic restrictions, and seasonal availability. Digital platforms solve these problems.

Valley Farm Network builds on platforms like LocalHarvest, Barn2Door, Harvie, and Farmish — but expands beyond single regions or product categories to build a full regional agricultural network.

---

## Market Opportunity

The local food economy in the United States exceeds **$20 billion annually**, spanning farmers markets, community-supported agriculture (CSA), and direct-to-consumer farm sales. Key drivers include:

- Consumer interest in local and organic food
- Concerns about industrial food system fragility
- Growth of farm-to-table restaurants
- Demand for regenerative agriculture

---

## Launch Strategy

**Phase 1 — Initial launch**
- Egg subscriptions
- Seasonal vegetables
- Microgreens

**Phase 2 — Expansion**
- Aquaponics products (shrimp, fish)
- Additional farm onboarding
- Regional food producers

---

## Long-Term Vision

Build a regional agricultural network integrating small farms, backyard producers, aquaponics systems, community-supported agriculture, and local food delivery — creating a more resilient and decentralized food system powered by digital infrastructure.

---

## License

Private. All rights reserved.
