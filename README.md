# Household Ledger

A shared budget tracker: one password gets anyone in, everyone sees the
same running balance, categorized entries, budgets, recurring bills,
savings goals, and charts. Static site (no build step) — Firebase
handles login and storage.

## Files

- `index.html` — redirects to `login.html` (so the root URL still works)
- `login.html` / `auth.js` — the sign-in page
- `dashboard.html` / `dashboard.js` — the app itself (protected; redirects to `login.html` if you're not signed in)
- `style.css` — shared styles for both pages
- `firebase-config.js` — your Firebase project settings (edit this one)

## How the "shared password" works

Firebase doesn't have a native "one password for everyone" mode, so this
app fakes it safely: behind the scenes there's a single Firebase Auth
account (a fixed email address you'll set once), and the login screen
signs everyone into *that* account — the email field is shown and
pre-filled for convenience, but it should stay the same for everyone.
Firestore's security rules only allow reads/writes from someone who's
signed in, so knowing the password is what gets you in.

To change access later, change that one account's password in the
Firebase console — no code changes needed.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → finish the wizard.
2. Click the **Web** icon (`</>`) to register a web app, skip Hosting.
3. Copy the `firebaseConfig` object it shows you.

## 2. Turn on Authentication

1. **Build → Authentication → Get started** → enable **Email/Password**.
2. **Users** tab → **Add user**. Pick any email (e.g. `household@ledger.local`) and a password — that password is what you hand out to everyone with access.

## 3. Turn on Firestore

1. **Build → Firestore Database → Create database** → production mode.
2. **Rules** tab → replace with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
   Click **Publish**. (This covers every collection the app uses — transactions, budgets, recurring, goals — automatically.)

## 4. Configure the app

Open `firebase-config.js` and:
1. Paste in the `firebaseConfig` values from step 1.
2. Set `SHARED_LOGIN_EMAIL` to match the email from step 2.

## 5. Deploy to GitHub Pages

Push all the files to a repo, then **Settings → Pages** → Source: "Deploy from a branch", branch `main`, folder `/ (root)`. Your site is live at `https://yourusername.github.io/your-repo/`.

Keep the repo **private** if you'd rather not expose your Firebase project ID and API key publicly (the key alone doesn't grant data access — the Firestore rule does — but there's no reason to expose it needlessly).

## Using it

- **Summary cards**: income and expenses for the month you're viewing, plus your all-time balance.
- **Add an entry**: expense or income, amount, category, date, optional note.
- **Budgets**: set a monthly cap per category; the bar fills up (and turns red) as spending approaches or passes it.
- **Recurring**: add a bill or paycheck with a day of the month — the app auto-adds it as a real entry once that day arrives each month. Pause or delete anytime.
- **Savings goals**: set a target, add funds toward it whenever, watch the bar fill.
- **Insights**: automatically compares this month's spending per category to last month's, biggest movers first.
- **Filters**: search entries by note/category text, filter by category, or set a date range that overrides the month view.
- **Charts**: category breakdown for the selected month, and a 6-month income-vs-expenses trend.
- Everyone signed in sees the same data, live.

## Customizing categories

Edit `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, and `CATEGORY_COLORS` at the top of `dashboard.js`.
