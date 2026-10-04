# Ghxst Snap — Backend Setup & Deploy

This app needs an Appwrite backend (database, collections, storage bucket) before
it does anything. This file gets you from zero to a running app.

Everything below assumes [Appwrite Cloud](https://cloud.appwrite.io) (free tier
is enough). Self-hosted works the same way — just use your own endpoint.

---

## 1. Create an Appwrite project

1. Go to https://cloud.appwrite.io and create an account / project.
2. Copy the **Project ID** shown on the project's Overview page.

## 2. Install the Appwrite CLI

```bash
npm install -g appwrite-cli
appwrite -v   # sanity check
```

## 3. Log in and link this project

From inside this repo folder:

```bash
appwrite login
appwrite init project
```

When prompted, choose **"Link directory to an existing project"** and pick the
project you just created. Say **no** when it asks to pull existing resources
(there's nothing there yet) — this repo already has the schema
(`appwrite.config.json`) checked in.

## 4. Fill in your project ID

Open `appwrite.config.json` and replace `"YOUR_PROJECT_ID"` with your real
project ID (or just let `appwrite init project` overwrite it — either works).

## 5. Push the schema — this is the one-shot step

```bash
appwrite push collections
appwrite push buckets
```

This creates, in one go:
- The `ghxst-db` database
- Four collections: `users`, `posts`, `saves`, `follows` — with every
  attribute, relationship, and index the app expects
- A `media` storage bucket for post images and avatars

It can take a minute or two — Appwrite provisions relationship attributes
asynchronously. If a push step reports something as "processing," just re-run
the same command once; it's safe to run repeatedly.

> Every ID in `appwrite.config.json` (`ghxst-db`, `users`, `posts`, `saves`,
> `follows`, `media`) is fixed on purpose, so it matches `.env.example`
> exactly — no copying generated IDs by hand.

## 6. Configure the app

```bash
cp .env.example .env
```

Open `.env` and set `VITE_APPWRITE_PROJECT_ID` to your project ID. Everything
else is already correct as long as you didn't rename anything in step 5.

## 7. Run it

```bash
npm install --legacy-peer-deps
npm run dev
```

Sign up for an account in the app — that's the first real test that the
`users` collection and permissions are wired correctly.

---

## Deploying

Once it runs locally, the production build is just:

```bash
npm run build
```

That outputs a static site in `dist/` — deployable to any static host.

**Vercel / Netlify (recommended, both have a free tier and take ~2 minutes):**
1. Push this repo to GitHub.
2. Import it in Vercel or Netlify.
3. Build command: `npm run build` — Output directory: `dist`.
4. Add the same variables from your `.env` file as project Environment
   Variables (`VITE_APPWRITE_PROJECT_ID`, `VITE_APPWRITE_URL`, etc.).
5. Deploy.

One extra Appwrite-side step: in your Appwrite project's **Overview → Domains**
(or **Auth → Settings** on older projects), add your deployed domain
(`your-app.vercel.app`, etc.) as a trusted **Platform** (Web app) — Appwrite
rejects requests from origins it doesn't recognize, so sign-in will silently
fail until you add it.

---

## What's in the schema, if you ever need to change it by hand

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | One document per account, created right after sign-up | plain fields only (`accountId`, `name`, `username`, `email`, `imageUrl`, `bio`) |
| `posts` | One document per post | `creator` (relationship, one user) |
| `saves` | Join table: a user bookmarking a post | `user`, `post` (relationships, read as plain IDs) |
| `follows` | Join table: one user following another | `follower`, `following` (relationships, read as plain IDs) |
| `likes` | Join table: a user liking a post | `userId`, `postId` — **plain strings, not relationships** (see below) |

A couple of deliberate design choices worth knowing if you ever extend this:

- **Every relationship field except `posts.creator` is read as a bare ID string, not an expanded object.** Appwrite only returns a relationship's full related document when a query explicitly asks for it with `Query.select(["*", "key.*"])`. The app expands `creator` everywhere a post is fetched (since the UI always needs the author's name/avatar), and leaves every other relationship (`saves.user`, `saves.post`, `follows.follower`, `follows.following`) unexpanded, comparing IDs directly instead. Mixing these two patterns in client code is an easy, invisible bug — if you add a new feature that reads a relationship field, decide up front whether you need the expanded object or just the ID, and query accordingly.
- **`likes` is its own collection with plain string columns, not a relationship field on `posts`.** Liking a post is an action taken by someone other than its creator — but a post's write permissions only allow its *creator* to update it (see "Permissions" above). If liking meant updating the post document's own `likes` field, every like from anyone but the creator would be silently rejected. A small, self-owned `likes` record (same shape as `saves`) sidesteps that permissions conflict entirely.

Permissions are locked down per-document at creation time in
`src/lib/appwrite/api.ts` (e.g. only a post's creator can edit/delete it, only
a follow's creator can remove it) — the collection-level permissions in
`appwrite.config.json` just handle public reads and who's allowed to create.

If you ever need to add a field, edit `appwrite.config.json` and re-run
`appwrite push collections` — it diffs against what's live and only applies
the changes.
