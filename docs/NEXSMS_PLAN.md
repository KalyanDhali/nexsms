# NexSMS — Final Project Plan (Master Document)

> **Version:** 1.0 (Final)
> **Status:** Approved — awaiting build start
> **Brand Name:** NexSMS
> **Target Audience:** Primarily Chinese users, international-friendly
> **Languages:** English + 中文 (toggle)

---

## 1. Product Overview

NexSMS is a Google Voice-style SMS/chat SaaS platform. Users get virtual phone numbers (10DLC assigned via providers like Twilio, SingleHouse, Plivo, Telnyx) and can send SMS to any number under their assigned number, with full chat-thread conversation history — exactly like Google Voice Messages.

**Tagline (EN):** Your Number. Your Conversation.
**Tagline (中文):** 您的号码，您的对话

### Core Concept

```
Admin buys numbers from Provider A/B/C → Number Pool
                ↓
User gets 1+ numbers assigned from pool (admin-managed)
                ↓
User sends SMS as that assigned number to any number
                ↓
Each contact = separate chat thread (Google Voice style)
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (SPA) |
| Backend | Node.js (Express) |
| Database | PostgreSQL |
| Queue/Jobs | Redis + BullMQ |
| SMS Providers | Twilio, SingleHouse, Plivo, Telnyx (pluggable) |
| Auth | JWT + OTP (2FA for admin) |
| i18n | English + 中文 |
| Cache | Redis (theme, payment, settings) |

---

## 2.1 CORE PRINCIPLE — Code-Free Admin Control (সবচেয়ে গুরুত্বপূর্ণ)

**নিয়ম:** Admin-কে কোনো code edit করতে হবে না। Website-এর প্রতিটি configurable জিনিস **admin dashboard থেকে** নিয়ন্ত্রণযোগ্য — সব settings ডাটাবেসে (DB) save হয়, সাথে সাথে site-wide apply হয়।

**যা যা admin dashboard থেকে control করা যাবে (কোনো code ছাড়া):**

| Category | Admin-এর হাতে যা যা control |
|---|---|
| **Website Appearance** | রং (primary/secondary), font, logo, favicon, homepage hero text, tagline, banner, footer text, button labels, 中文/English default |
| **Features** | প্রতিটা feature-এর ON/OFF toggle (KYC, referral, AI, bulk blast, API access, multi-currency, fraud modules...) |
| **Billing** | billing mode (prepaid/subscription/hybrid), plan name/price/quota, per-plan daily limits, per-number limits, SMS rates |
| **Providers** | add/edit/delete provider, API credentials, enable/disable, priority, failover, country routing |
| **Numbers** | number pool, buy/release, assign/revoke/swap, geo-picker, expiry/renewal rules |
| **Users** | block/unblock, edit, password reset, wallet credit/debit, per-user billing override |
| **Payments** | gateway add/edit/disable, API credentials, fees, priority, QR mode, min confirmations, risk rules |
| **Content** | homepage sections text, FAQ, pricing text, notification banner, maintenance message, email/SMS alert templates |
| **Security** | 2FA, IP whitelist, IP blocklist, keyword filter list, risk scoring thresholds, payment hold rules |
| **Language** | English + 中文 translations editing (admin-এ translation editor) |
| **System** | maintenance mode, backup/export, audit log view |

**ইমপ্লিমেন্টেশন নোট:**
- `settings` / `feature_toggles` / `content_translations` টেবিলে সব configurable value
- Admin panel-এর প্রতিটা page → save → DB → সাইট instant apply (cache-সহ)
- কোনো value হার্ডকোড হবে না frontend/backend-এ — সব dynamic
- **"Site Content Editor"** — homepage hero text, features text, FAQ — সব admin-এ edit করা যাবে

---

## 3. User-Side Features

### 3.1 Homepage (Google Voice marketing-page style)
- Navbar: Logo | Features | Pricing | Login | Get Started (sticky, glass blur)
- Hero section: "A professional-grade phone plan that's easy to use"
  - Large headline + subtext + gradient/blue-violet primary theme (#4F46E5 → #7C3AED)
  - Product preview (chat dashboard screenshot/mockup, desktop + mobile)
  - Dark hero + light feature sections for contrast; fade-up + scroll reveal animations
  - Trust bar ("Trusted by 10,000+ users")
- Feature grid: Flexible / Helpful / Easy to manage / Trusted / Integrated (hover lift)
- Chat preview section (live dashboard screenshot)
- Plans section (3-tier pricing cards: Starter / Standard / Premier, middle highlighted)
- FAQ accordion + CTA + Footer
- Typography: Sora/Inter, bold headlines, clean spacing, glassmorphism

### 3.2 Chat Dashboard (Google Voice Messages layout)
```
┌─────────────┬──────────────────────────────────┐
│  Inbox      │        Conversation              │
│  (threads)  │                                  │
│  + New      │   ✓ +1-XXX-XXX-1234  [assigned  │
│             │               number badge]      │
│  +1 (555)   │  ─────────────────────────────   │
│  123-4567   │  [You] Hello! Your order is      │
│  ─────────  │       confirmed ✅               │
│  +1 (555)   │  [Client] Thank you! When will   │
│  765-4321   │        it arrive?                │
│             │  ─────────────────────────────   │
│             │  [Type a message...        [▶]   │
└─────────────┴──────────────────────────────────┘
```
- Left: inbox/thread list; Right: conversation
- Each thread header shows which assigned number is used
- Unread counts, message previews, timestamps
- "From number" selector per message (multi-number support)
- Keypad / "Enter a name or number" (as in reference screenshot)

### 3.3 Plans & Numbers Section (below chat)
- **Plan tab:** current plan, upgrade/downgrade
- **My Numbers tab:** all assigned numbers
  - Primary number badge
  - "+ Assign New Number" button (from pool)
  - Multiple numbers per user
  - Status (active/paused), switch primary, remove

### 3.4 Wallet
- Balance, transactions history
- Low-balance alert
- Auto cost deduction per SMS

### 3.5 Payment Page
- Shows only enabled gateways:
  Binance Pay, Bybit, Stripe, Cryptomus, TRC20 (USDT), BEP20 (USDT), BTC, BenlyPay
- Choose gateway → complete payment → wallet credited

### 3.6 Advanced User Features
- SMS Scheduling (schedule message for later)
- Bulk blast tool (with compliance/opt-in enforcement)
- AI Auto-reply (incoming → AI reply)
- Smart inbox (spam/sales filter)
- Reply suggestions
- Number Geo-Picker (filter by area code/country, if allowed)
- Analytics dashboard (volume, cost, delivery rate charts)
- User API access + API key management
- User webhooks (delivery callbacks to their own system)
- Message template library (OTP, notification, marketing)
- Referral / discount system (invite friend → credit bonus, admin-controlled rates)
- Multi-currency wallet (USD + USDT + regional, exchange rate admin-set)
- Public rate card page (transparent SMS rates per country)
- KYC verification (optional tier: unverified → limited limit, verified → larger limit)

---

## 4. SMS Engine (Core)

### 4.1 Multi-Provider Layer
- Pluggable common interface: `sendSms()`, `receiveWebhook()`, `checkNumber()`, `buyNumber()`
- Admin manages providers from dashboard (CRUD, credentials, enable/disable, priority)
- Provider health check + failover (auto or manual)
- Delivery status callbacks per provider (signature-verified)

### 4.2 Billing / Message Credits (2 modes, admin-controlled)
```
Billing Mode: [ ] Prepaid Credits   (checkbox)
              [ ] Subscription Plan (checkbox)
```
- **Prepaid:** wallet balance; per-SMS cost deducted
- **Subscription:** monthly plan with SMS quota
- **Hybrid (optional):** quota exhausted → charge wallet, or block (admin rule)
- Per-user billing mode override by admin
- Super Admin: global mode toggle + rates control

### 4.3 Per-Number Daily Send Limit (24h window)
- Admin sets per-plan daily limit:
  - Starter → X SMS/day/number
  - Standard → Y SMS/day/number
  - Premier → Z SMS/day/number
- Separate limit for pay-per-SMS users (admin-controlled)
- Counter tracked in DB; resets after 24 hours
- On limit exceeded: block with "Try again in X hours"
- Admin panel shows per-number usage + reset timer

### 4.4 Delivery & Compliance
- Delivery reports: sent → delivered → failed + auto-retry
- Rate limiting per user (spam control)
- International routing intelligence (country → best/cheapest provider)
- A2P 10DLC compliance tracker (campaign status per number)
- MMS/attachment support (premium tier)

### 4.5 Fraud & Abuse Prevention (admin-toggleable)
- **Flash USDT / fake crypto detection:**
  - Official contract address check only (TRC20/BEP20/BTC official contracts)
  - Blockchain explorer verification (TronGrid / BscScan / Blockchain.com) via TxID
  - Exact amount + receiver address match required
  - Min confirmations before credit (admin-set)
  - Test-transaction hold for large amounts (admin threshold)
- **Carding prevention (card gateways):**
  - Stripe Radar + 3D Secure
  - AVS/CVV verification
  - Velocity limit (same card/IP repeated attempts → auto-block)
  - Proxy/VPN detection → flag
  - Chargeback monitoring → alert + block
- **Risk scoring:** per-payment score (new user, large amount, VPN, new gateway → high risk flag)
- **Payment hold policy:** suspicious/large payments held → admin review → then credit
- **Admin review queue:** flagged payments require admin approval before credit
- **Replay protection + expiry:** order validated once; unpaid orders auto-cancel after 24h
- **Webhook IP whitelist + signature verification** (only official gateway IPs accepted)
- **Global IP blocklist:** known fraud/abuse IPs blocked at register/payment
- **Message content filter:** admin-configurable keyword list blocks prohibited content (protects provider account)
- **Number expiry & renewal:** premium numbers monthly fee; non-payment → release back to pool (admin grace period)
- **Scheduled maintenance mode:** admin can put site offline ("Under maintenance")
- **Email/SMS admin alerts:** provider down, big payment, low balance, suspicious activity
- **Performance optimizations:** bulk send queue (BullMQ), DB indexes, pagination

> **নোট:** উপরোক্ত প্রতিটা feature admin panel-এর **Settings → Feature Toggles** থেকে **ON/OFF** করা যাবে। Admin ইচ্ছা করলে যেকোনো একটা চালু/বন্ধ রাখতে পারবে।

---

## 5. Admin Panel (Full Control)

### 5.1 Provider / API Control
- Add/edit/delete providers (Twilio, SingleHouse, Plivo, Telnyx)
- API credentials management
- Enable/disable + priority order
- Health status + failover config
- Per-country routing rules

### 5.2 User Control
- User list, search, block/unblock
- Edit user, password reset
- Per-user billing mode override
- Assign numbers manually (pool → user)

### 5.3 Number Control
- Number pool view (available / assigned / blocked)
- Bulk buy numbers (with geo-picker / area code)
- Manual assign / revoke / swap
- Number health check status

### 5.4 Wallet Control
- Credit/debit any user wallet
- Transaction log
- Payment history

### 5.5 Payment Control
- Gateway details edit (Binance, Bybit, Stripe, Cryptomus, TRC20, BEP20, BTC, BenlyPay)
- Enable/disable per gateway
- Fees & rates per gateway
- Gateway priority order

### 5.6 Billing Control
- Billing mode global toggle (prepaid / subscription / hybrid)
- Per-plan SMS quotas & rates
- Per-number daily limits per plan + per user

### 5.7 Website Customization
- Color, font, logo, branding (DB-driven, instant apply)
- Full site theming from admin panel
- **Site Content Editor:** homepage hero text, tagline, features section text, FAQ, pricing text, footer, notification banner — সব admin-এ edit করা যাবে
- **Translation Editor:** English + 中文 এর সব text admin panel থেকে edit (কোনো code না)

### 5.7.1 System Settings (Admin General Controls)
- Site name, logo, favicon, default language
- Maintenance mode (ON/OFF + message)
- Backup/export buttons
- Alert notification settings

### 5.8 Feature Toggles (Admin Control Hub)
- **Settings → Feature Toggles** page: প্রতিটা feature-এর ON/OFF switch
- KYC required (ON/OFF + threshold)
- Referral system (ON/OFF + bonus rate)
- Multi-currency wallet (ON/OFF + exchange rates)
- Fraud protection modules (ON/OFF individually): flash-USDT check, carding check, risk scoring, payment hold, IP blocklist, message content filter
- Number expiry/renewal (ON/OFF + grace period)
- Maintenance mode (ON/OFF + message)
- Email/SMS alerts (ON/OFF)
- Bulk blast (ON/OFF)
- AI features (ON/OFF)
- User API access (ON/OFF)
- All toggles apply instantly, site-wide

### 5.9 Security & Ops
- Webhook manager + signature validation
- 2FA (OTP login) + IP whitelisting for admin
- Audit log (every admin action)
- Backup / export (CSV/JSON)
- Platform-wide analytics + provider cost report
- Admin alert center (provider down, big payment, low balance, suspicious activity)

---

## 6. Database Model (概要)

- `users` / `admins`
- `providers` (type, credentials, active, priority)
- `numbers` (number, provider_id, assigned_user_id, status, geo)
- `assignments` (user ↔ number, primary flag)
- `conversations` (user_id, assigned_number_id, contact_number)
- `messages` (conversation_id, direction, body, status, provider_id, cost)
- `wallets` / `transactions`
- `plans` / `subscriptions`
- `daily_limits` (number_id, date, count)
- `settings` (billing mode, theme, branding, i18n)
- `site_content` (homepage/FAQ/pricing/footer text — English + 中文)
- `feature_toggles` (সব feature-এর ON/OFF flag)
- `risk_rules` (risk scoring, hold threshold, confirmations)
- `blocklist` (IP + keyword)
- `reviews` (pending/suspicious payment review queue)
- `referrals`
- `currencies` (multi-currency + exchange rate)
- `audit_logs`
- `api_keys`
- `payment_gateways`
- `payment_orders`
- `templates`

---

## 7. Build Phases (Order of Work)

```
Phase 1: Project setup + Auth (user/admin login, 2FA, i18n skeleton)
Phase 2: Chat dashboard (Google Voice Messages layout) + conversation UI
Phase 3: Provider abstraction layer + Twilio integration + send/receive SMS
Phase 4: Admin panel — providers, users, numbers, wallet, payments, billing
Phase 5: Billing system (prepaid + subscription + hybrid) + per-number daily limits
Phase 6: Payment gateway integrations (Binance/Bybit/Stripe/Cryptomus/TRC20/BEP20/BTC/BenlyPay)
Phase 7: Homepage (Google Voice marketing style) + theme customization
Phase 8: Advanced features (API access, webhooks, scheduling, AI, analytics, bulk blast)
Phase 9: Fraud prevention (flash-USDT, carding, risk scoring, IP blocklist) + feature toggles
Phase 10: Homepage, referral, KYC, multi-currency, number expiry, rate card, polish
```

---

## 8. Key Notes / Decisions

- **Name fixed:** NexSMS
- **Language:** English + 中文 (global toggle)
- **Target:** primarily Chinese users, international-ready
- **10DLC compliance** is critical for US numbers (campaign registration tracking required)
- **Daily per-number limits** protect both platform and provider standing
- **Billing mode** fully admin-controlled (can run prepaid, subscription, or both)
- **Multi-provider failover** isolates single-provider outages
- **Core Principle:** সমস্ত configurable জিনিস admin dashboard থেকে (DB-driven) — code edit ছাড়াই পুরো system নিয়ন্ত্রণযোগ্য
