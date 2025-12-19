# Bank Basha | بنك باشا

منصة مالية رقمية متكاملة تعمل داخل مدينة السويداء

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database
```bash
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
```

### 3. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📋 Test Accounts

| Role | Phone | Password |
|------|-------|----------|
| Admin | +963999999999 | admin123 |
| Agent | +963988888888 | agent123 |
| Merchant | +963977777777 | merchant123 |
| User | +963966666666 | user123 |

## 🏗️ Project Structure

```
src/
├── app/
│   ├── (dashboard)/     # Protected routes
│   ├── api/             # API endpoints
│   ├── login/           # Auth pages
│   └── register/
├── components/          # React components
├── lib/
│   ├── auth/           # Security & auth
│   ├── db/             # Database client
│   └── ledger/         # Double-entry ledger
├── messages/           # i18n translations
│   ├── ar.json
│   └── en.json
└── middleware.ts       # Auth middleware
```

## 🔐 Security Features

- ✅ Argon2 password hashing
- ✅ JWT with short-lived tokens
- ✅ Rate limiting
- ✅ Account lockout after failed attempts
- ✅ HTTPS-only cookies
- ✅ Security headers (CSP, XSS, HSTS)
- ✅ Double-entry ledger for integrity
- ✅ Audit logging

## 💰 Commission Rates

| Transaction | Platform | Agent |
|-------------|----------|-------|
| Deposit | 0.5% | 0.5% |
| Withdraw | 0.5% | 0.5% |
| P2P Transfer | 1.0% | - |
| QR Payment | - | - |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **i18n**: next-intl (Arabic + English)
- **Auth**: Custom JWT implementation

## 📱 Features

- User wallet management
- Agent deposit/withdrawal
- P2P transfers
- QR payments
- Settlement system
- Admin dashboard
- Multi-language support (AR/EN)
- Responsive design
