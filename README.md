# LinkedFollow — LinkedIn Follow-up Tracker

A production-ready SaaS for tracking LinkedIn connections and follow-ups.
Auto-captures contacts via a Chrome extension when you connect, message, or follow on LinkedIn.

---

## Features

- **Chrome Extension** — detects Connect/Message/Follow clicks on LinkedIn, auto-saves contact data
- **Web Dashboard** — view all contacts, filter by status, manage follow-up dates
- **Auth** — email/password + Google OAuth via Supabase
- **Follow-up tracking** — see overdue and today's follow-ups
- **Per-user data isolation** — Row Level Security ensures users only see their own contacts
- **Duplicate prevention** — upsert by `(user_id, linkedin_url)` — never double-saves

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router) + TailwindCSS |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (email + Google OAuth) |
| Extension | Chrome Manifest V3 |
| Hosting | Vercel |

---

## Project Structure

```
/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css
│   ├── auth/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts       # OAuth callback
│   ├── api/
│   │   ├── contact/
│   │   │   ├── save/route.ts       # POST — upsert contact
│   │   │   └── update/route.ts     # POST — update contact fields
│   │   ├── contacts/route.ts       # GET — list contacts
│   │   └── followups/route.ts      # GET — due/overdue follow-ups
│   ├── dashboard/
│   │   ├── layout.tsx              # Auth guard + sidebar
│   │   ├── page.tsx                # Main contacts table
│   │   ├── followups/page.tsx      # Due follow-ups view
│   │   └── settings/page.tsx       # Extension setup info
│   └── contacts/
│       ├── layout.tsx
│       └── [id]/page.tsx           # Contact detail + edit
├── components/
│   ├── dashboard/
│   │   ├── Sidebar.tsx
│   │   ├── ContactsTable.tsx
│   │   └── StatsBar.tsx
│   └── ui/
│       ├── Avatar.tsx
│       ├── StatusBadge.tsx
│       ├── EmptyState.tsx
│       └── CopyButton.tsx
├── hooks/
│   ├── useContacts.ts
│   └── useFollowups.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client
│   │   ├── server.ts               # Server Supabase client
│   │   └── middleware.ts           # Session refresh
│   ├── types.ts                    # Shared TypeScript types
│   └── utils.ts                    # cn(), formatDate(), etc.
├── supabase/
│   └── schema.sql                  # Run this in Supabase SQL editor
├── extension/
│   ├── manifest.json
│   ├── content.js                  # DOM scraper + button detector
│   ├── background.js               # Service worker + API caller
│   ├── popup.html
│   └── popup.js
├── middleware.ts                   # Auth redirect middleware
└── .env.local.example
```

---

## Local Development Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo>
cd linkedin-followup-tracker
npm install
```

### 2. Create a Supabase project

1. Go to [app.supabase.com](https://app.supabase.com) → New project
2. Once created, go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Enable Google OAuth (optional)

1. Supabase Dashboard → **Authentication → Providers → Google**
2. Enable it and add your Google OAuth credentials
3. Add `http://localhost:3000/auth/callback` to the allowed redirect URIs in Google Cloud Console

### 4. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXTENSION_API_SECRET=your-random-secret-32-chars   # openssl rand -hex 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Chrome Extension Setup

### Loading the extension locally

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `/extension` folder from this project

### Configuring the extension

1. Sign up / log in to the dashboard at `http://localhost:3000`
2. Go to **Extension Setup** in the sidebar
3. Copy your **User ID** and **API Secret**
4. Click the LinkedFollow extension icon in Chrome
5. Enter:
   - **Dashboard URL**: `http://localhost:3000`
   - **API Secret**: from your `.env.local`
   - **User ID**: from the Extension Setup page
6. Click **Connect**

### Using the extension

1. Navigate to any LinkedIn profile: `https://www.linkedin.com/in/someone/`
2. Click **Connect**, **Message**, or **Follow**
3. A small blue toast "✓ Contact saved" appears
4. The contact appears in your dashboard

> **Note:** The extension only captures data from profile pages (`/in/...`). It does not scan your feed or search results.

---

## Deploying to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Set the following environment variables in Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
EXTENSION_API_SECRET
NEXT_PUBLIC_APP_URL    # https://your-app.vercel.app
```

After deployment:
1. Update `NEXT_PUBLIC_APP_URL` to your Vercel URL
2. Update `API_BASE_URL` in `extension/background.js` to your Vercel URL
3. Add your Vercel URL to Supabase **Authentication → URL Configuration → Site URL**
4. Reload the Chrome extension

---

## API Reference

### `POST /api/contact/save`

Upserts a contact. Called by the Chrome extension.

**Headers:**
- `Extension-Api-Secret: <secret>` — required for extension flow
- `Content-Type: application/json`

**Body:**
```json
{
  "user_id": "uuid",
  "name": "Jane Doe",
  "linkedin_url": "https://www.linkedin.com/in/janedoe/",
  "company": "Acme Corp",
  "role": "VP of Engineering",
  "location": "San Francisco, CA",
  "profile_image": "https://..."
}
```

**Response:** `{ data: Contact }`

---

### `POST /api/contact/update`

Updates status, notes, follow-up date. Requires session cookie (dashboard only).

**Body:**
```json
{
  "id": "uuid",
  "status": "Replied",
  "notes": "Had a great call",
  "next_followup": "2024-12-01",
  "email": "jane@acme.com",
  "phone": "+1-555-0100"
}
```

---

### `GET /api/contacts`

Returns all contacts for the authenticated user.

**Query params:**
- `?status=Connected` — filter by status
- `?search=Jane` — search name/company/role

---

### `GET /api/followups`

Returns contacts with follow-up dates on or before today.

---

## Contact Statuses

| Status | Meaning |
|--------|---------|
| Connected | Accepted connection or sent request |
| Messaged | Sent first message |
| Replied | They replied |
| Meeting Booked | Call/meeting scheduled |
| Closed | Deal closed / goal achieved |
| Lost | No longer pursuing |

---

## Security

- All API routes verify Supabase auth session (dashboard) or `Extension-Api-Secret` (extension)
- Postgres Row Level Security ensures users can only read/write their own data
- The `EXTENSION_API_SECRET` should be a random 32+ character string kept secret
- LinkedIn profile images are rendered with `unoptimized` to avoid CORS issues

---

## Extension Icons

The `/extension/icons/` folder needs PNG icons at 16×16, 32×32, 48×48, and 128×128.
You can use any icon generator (e.g. [favicon.io](https://favicon.io)) to create them.
Without icons, Chrome will use a default puzzle piece — the extension still works.

```bash
mkdir -p extension/icons
# Add icon16.png, icon32.png, icon48.png, icon128.png
```

---

## License

MIT
