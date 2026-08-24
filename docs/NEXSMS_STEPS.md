# NexSMS — Step-by-Step Build Plan

> **Version:** 1.0
> **Status:** Final (awaiting build start)
> Order: প্রতিটা ধাপ শেষ হলেই পরের ধাপ, আগের ধাপ verify করে।

---

## Phase 0 — Setup & Foundation

- [ ] 0.1 Create monorepo structure: `frontend/` + `backend/`
- [ ] 0.2 Frontend: React + Vite + Tailwind CSS scaffold
- [ ] 0.3 Backend: Node.js + Express + PostgreSQL connection
- [ ] 0.4 Install PostgreSQL + Redis (local dev)
- [ ] 0.5 Database migrations setup (schema creation)
- [ ] 0.6 i18n skeleton (English + 中文 JSON files)
- [ ] 0.7 Theme system (CSS variables: colors, fonts) — admin-controllable

**Exit criteria:** `npm run dev` frontend+backend চলছে, DB connected।

---

## Phase 1 — Auth & User Management

- [ ] 1.1 User registration + login (JWT)
- [ ] 1.2 Admin registration + login
- [ ] 1.3 Role-based access (user / admin / super admin)
- [ ] 1.4 Password hashing (bcrypt) + reset
- [ ] 1.5 2FA OTP for admin login
- [ ] 1.6 Session/refresh token
- [ ] 1.7 i18n: auth pages English + 中文

**Exit criteria:** user ও admin আলাদা login, protected routes work করে।

---

## Phase 2 — Chat Dashboard (Google Voice UI)

- [ ] 2.1 Layout: left inbox/thread list + right conversation pane
- [ ] 2.2 Thread list: contact name/number, preview, timestamp, unread badge
- [ ] 2.3 "+ New" button → new conversation (enter number)
- [ ] 2.4 Conversation view: chat bubbles (sent/received), date separators
- [ ] 2.5 Message composer: input + send button, "From number" selector
- [ ] 2.6 Auto-scroll, optimistic UI, typing indicator (optional)
- [ ] 2.7 Responsive: mobile collapses to single pane
- [ ] 2.8 i18n: chat UI English + 中文

**Exit criteria:** UI সম্পূর্ণ Google Voice-like, mock data দিয়ে কাজ করে।

---

## Phase 3 — Provider Abstraction Layer (Multi-Provider)

- [ ] 3.1 Common interface: `sendSms()`, `receiveWebhook()`, `checkNumber()`, `buyNumber()`
- [ ] 3.2 Twilio adapter (প্রথম)
- [ ] 3.3 SingleHouse adapter
- [ ] 3.4 Plivo adapter
- [ ] 3.5 Telnyx adapter
- [ ] 3.6 Provider registry + routing by priority
- [ ] 3.7 Provider health check
- [ ] 3.8 Failover: primary down → next provider (auto/manual)
- [ ] 3.9 Webhook receiver per provider (signature validation)

**Exit criteria:** একটাই send API, যেকোনো provider দিয়ে পাঠানো যায়, এক provider fail হলে auto-switch।

---

## Phase 4 — Number Pool & Assignment

- [ ] 4.1 `numbers` table: provider, geo/area code, status
- [ ] 4.2 Buy numbers (manual entry / provider API fetch)
- [ ] 4.3 Pool view: available / assigned / blocked
- [ ] 4.4 Assign number to user (admin manual + user self-service optional)
- [ ] 4.5 Multiple numbers per user + primary flag
- [ ] 4.6 Revoke / swap / pause numbers
- [ ] 4.7 Geo-picker (filter by area code/country)

**Exit criteria:** admin number কিনে pool-এ রাখে, user-কে assign করে, user-এর dashboard-এ number দেখা যায়।

---

## Phase 5 — Messaging Engine (Send/Receive)

- [ ] 5.1 Send SMS through provider layer (assigned number)
- [ ] 5.2 Inbound webhook → create/continue conversation thread
- [ ] 5.3 Per-conversation thread management (from number + contact)
- [ ] 5.4 Delivery status tracking: sent → delivered → failed
- [ ] 5.5 Auto-retry on failure
- [ ] 5.6 Per-number daily limit counter (24h window, DB)
- [ ] 5.7 Block message when daily limit reached ("Try again in X hours")
- [ ] 5.8 SMS cost calculation + wallet deduction
- [ ] 5.9 Rate limiting per user (spam control)
- [ ] 5.10 A2P 10DLC compliance status field per number

**Exit criteria:** real SMS পাঠানো/নেওয়া, thread-এ ঢোকে, cost কাটে, daily limit কাজ করে।

---

## Phase 6 — Billing System (2 Modes)

- [ ] 6.1 Plans table: Starter / Standard / Premier (quota + price)
- [ ] 6.2 Prepaid credits mode: wallet balance → per-SMS deduction
- [ ] 6.3 Subscription mode: monthly plan + SMS quota
- [ ] 6.4 Hybrid: quota exhausted → wallet charge OR block (admin rule)
- [ ] 6.5 Admin global billing-mode toggle
- [ ] 6.6 Per-user billing mode override
- [ ] 6.7 Per-plan daily SMS limits (per number)
- [ ] 6.8 Pay-per-SMS separate daily limit (admin-set)
- [ ] 6.9 Low-balance alert (email/in-app)

**Exit criteria:** admin mode বদলালে user-এর কাছে সেই option-ই দেখা যায়, বিলিং ঠিকভাবে কাটে।

---

## Phase 7 — Admin Panel

- [ ] 7.1 Admin dashboard layout (sidebar + main)
- [ ] 7.2 Providers page: CRUD, credentials, enable/disable, priority, health
- [ ] 7.3 Users page: list, search, block/unblock, edit, password reset
- [ ] 7.4 Numbers page: pool, assign/revoke/swap, geo-picker, daily usage
- [ ] 7.5 Wallet page: credit/debit, transaction log, payment history
- [ ] 7.6 Payments page: gateway CRUD, enable/disable, fees, priority
- [ ] 7.7 Billing page: mode toggle, plan quotas, daily limits
- [ ] 7.8 Theme page: color, font, logo, branding (DB-driven)
- [ ] 7.9 Webhooks page: manager + signature validation
- [ ] 7.10 Audit log page
- [ ] 7.11 Analytics page: platform usage, provider cost report
- [ ] 7.12 Export/backup (CSV/JSON)
- [ ] 7.13 IP whitelisting for admin

**Exit criteria:** admin panel থেকে উপরের সব কাজ করা যায়।

---

## Phase 8 — Payment Gateways

- [ ] 8.1 Payment orders table + order flow
- [ ] 8.2 Binance Pay integration
- [ ] 8.3 Bybit integration
- [ ] 8.4 Stripe integration
- [ ] 8.5 Cryptomus integration
- [ ] 8.6 TRC20 (USDT) — wallet address payment
- [ ] 8.7 BEP20 (USDT) — wallet address payment
- [ ] 8.8 BTC — wallet address payment
- [ ] 8.9 BenlyPay integration
- [ ] 8.10 Gateway enable/disable respected in user payment page
- [ ] 8.11 Payment success → wallet credit (per gateway rules)
- [ ] 8.12 QR code: auto-generate from wallet address (TRC20/BEP20/BTC) + scan-to-pay
- [ ] 8.13 QR mode per gateway: Auto (API) / Manual upload / Off (admin-set)

**Exit criteria:** user যেকোনো enabled gateway দিয়ে পেমেন্ট → wallet credit।

---

## Phase 9 — Advanced User Features

- [ ] 9.1 SMS scheduling (send later)
- [ ] 9.2 Bulk blast tool (with compliance/opt-in checks)
- [ ] 9.3 AI auto-reply (incoming → AI reply)
- [ ] 9.4 Smart inbox (spam/sales filter)
- [ ] 9.5 Reply suggestions
- [ ] 9.6 User API access + API key management
- [ ] 9.7 User webhooks (delivery callbacks)
- [ ] 9.8 Analytics dashboard (user-side: volume, cost, delivery rate)
- [ ] 9.9 Message template library
- [ ] 9.10 MMS/attachment support (premium)
- [ ] 9.11 Referral / discount system (invite → credit bonus)
- [ ] 9.12 Multi-currency wallet (USD + USDT + regional, admin exchange rates)
- [ ] 9.13 Public rate card page
- [ ] 9.14 KYC verification tier (unverified/verified limits)

**Exit criteria:** সব advanced feature user-এর dashboard-এ কাজ করে।

---

## Phase 10 — Fraud Prevention & Feature Toggles

- [ ] 10.1 Flash USDT / fake crypto detection (contract check + explorer verify + min confirmations)
- [ ] 10.2 Carding prevention (3D Secure, AVS/CVV, velocity limit, VPN detection, chargeback monitor)
- [ ] 10.3 Risk scoring per payment + payment hold policy
- [ ] 10.4 Admin review queue for flagged payments
- [ ] 10.5 Replay protection + order expiry (24h auto-cancel)
- [ ] 10.6 Webhook IP whitelist + signature verification
- [ ] 10.7 Global IP blocklist
- [ ] 10.8 Message content filter (admin keyword list)
- [ ] 10.9 Number expiry & renewal (grace period)
- [ ] 10.10 Scheduled maintenance mode
- [ ] 10.11 Admin alert center (provider down, big payment, low balance, suspicious)
- [ ] 10.12 Performance optimizations (bulk queue, indexes, pagination)
- [ ] 10.13 **Feature Toggles page**: প্রতিটা feature-এর ON/OFF switch (admin-এর হাতে সম্পূর্ণ control)

**Exit criteria:** সব ফ্রড-প্রোটেকশন module কাজ করে, আর প্রতিটা admin toggle দিয়ে on/off করা যায়।

---

## Phase 11 — Homepage & Polish

- [ ] 11.1 Homepage: hero + trust bar + features + pricing + FAQ + CTA + footer
- [ ] 11.2 Homepage animations (fade-up, scroll reveal, glass navbar)
- [ ] 11.3 Theme applied site-wide from admin
- [ ] 11.4 Responsive design (mobile/tablet/desktop)
- [ ] 11.5 i18n complete: English + 中文 (all pages)
- [ ] 11.6 Loading states, empty states, error states (UX polish)
- [ ] 11.7 SEO meta tags + favicon + logo
- [ ] 11.8 Final QA + bug fixes

**Exit criteria:** পুরো platform production-ready look + everything working।

---

## Milestone Summary

| Milestone | ধাপ | Result |
|---|---|---|
| M1 | Phase 0-2 | UI skeleton + chat dashboard (mock) |
| M2 | Phase 3-5 | Real SMS + multi-provider + billing core |
| M3 | Phase 6-8 | Billing modes + admin panel + payments + QR |
| M4 | Phase 9-10 | Advanced features + fraud prevention + toggles |
| M5 | Phase 11 | Homepage + polish + i18n complete |
