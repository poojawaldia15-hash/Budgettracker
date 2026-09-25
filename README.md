# Household Ledger

A shared budget tracker: one password gets anyone in, everyone sees the
same running balance, categorized entries, monthly limits, and charts.
Static site (no build step) — Firebase handles login and storage.

## How the "shared password" works

Firebase doesn't have a native "one password for everyone" mode, so this
app fakes it safely: behind the scenes there's a single Firebase Auth
account (a fixed email address you'll set once), and the password field
on the login screen signs everyone into *that* account. Nobody sees the
email address — they just type the password. Firestore's security rules
then only allow reads/writes from someone who's signed in, so knowing
the password is what gets you in.

To change access later, change that one account's password in the
Firebase console — no code changes needed.

## 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → give it a name → finish the wizard (you can skip Google Analytics).
2. In the project, click the **Web** icon (`</>`) to register a new web app. Name it anything, skip Firebase Hosting.
3. Copy the `firebaseConfig` object it shows you.

## 2. Turn on Authentication

1. In the left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab → **Add user**.
   - Email: pick anything you like, e.g. `household@ledger.local` (doesn't need to be real).
   - Password: this is the password you'll hand out to everyone with access.
4. If you used a different email than `household@ledger.local`, note it — you'll need it in step 4.

## 3. Turn on Firestore (the database)

1. **Build → Firestore Database → Create database**. Choose a region close to you, start in **production mode**.
2. Go to the **Rules** tab and replace the contents with:

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

   This means: only someone who successfully signed in (i.e. knows the
   password) can read or write any data. Click **Publish**.

## 4. Configure the app

Open `firebase-config.js` and:

1. Paste in the `firebaseConfig` values from step 1.
2. Set `SHARED_LOGIN_EMAIL` to match the email you created in step 2.

## 5. Put it on GitHub Pages

1. Create a new GitHub repository and push these four files to it (`index.html`, `style.css`, `app.js`, `firebase-config.js`).
2. In the repo: **Settings → Pages** → under **Build and deployment**, set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)` → **Save**.
3. GitHub gives you a URL like `https://yourusername.github.io/your-repo/` — that's your live ledger.

Because this repo will contain your Firebase project ID and API key in
plain text, keep the repo **private** unless you're comfortable with
that being public (the API key alone doesn't grant access — Firestore
rules do that — but there's no reason to expose it needlessly).

## Using it

- **Add an entry**: pick expense or income, amount, category, date, optional note.
- **Set a limit**: under "Monthly budgets," set a cap per category; the bar fills up (and turns rust-red) as that category's spending approaches or passes it, recalculated for whichever month you're viewing.
- **Charts**: a breakdown of the selected month's spending by category, and an income-vs-expenses view for the trailing six months.
- **Edit or delete**: every row in the entries table has Edit/Delete.
- Everyone signed in sees the same data, live — no separate accounts, one shared ledger.

## Customizing categories

Edit the `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, and `CATEGORY_COLORS`
constants at the top of `app.js`.
