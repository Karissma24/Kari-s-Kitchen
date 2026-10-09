# Putting Kari's Kitchen recipes online

Once this is set up:

- your recipes are stored online (in Google's free **Firebase** service)
- they show up on every device, including your phone
- anyone with your website link can **read** them
- only **you** can add, edit or delete them, after signing in with your Google account

It takes about 15 minutes. Nothing here costs money: Firebase's free plan is plenty for a recipe site.

---

## 1. Create a Firebase project

1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Create a project** (or **Add project**).
3. Name it `karis-kitchen` and click through. You can turn **Google Analytics off**, because it isn't needed.
4. Wait for it to finish, then click **Continue**.

## 2. Turn on "Sign in with Google"

1. In the left menu, open **Build → Authentication**, then click **Get started**.
2. On the **Sign-in method** tab, click **Google**, switch it to **Enable**, pick your email as the support email, and click **Save**.
3. Go to the **Settings** tab → **Authorized domains** → **Add domain**, and add:
   ```
   karissma24.github.io
   ```
   (`localhost` is already on the list, which you'll use for testing.)

## 3. Create the database

1. In the left menu, open **Build → Firestore Database** and click **Create database**.
2. Choose a location near you (any is fine), and choose **Start in production mode**.
3. When it's ready, open the **Rules** tab.
4. Delete everything in the box, then paste in the whole contents of the `firestore.rules` file from this project.
5. In what you pasted, replace `PASTE_YOUR_GMAIL_ADDRESS` with **your Gmail address**, then click **Publish**.

## 4. Connect the website to Firebase

1. Click the **gear icon ⚙ → Project settings** (top of the left menu).
2. Scroll to **Your apps** and click the **web icon `</>`**.
3. Name the app `Kari's Kitchen`. **Don't** tick Firebase Hosting, because GitHub Pages already hosts the site. Click **Register app**.
4. Firebase shows a code block with `const firebaseConfig = { apiKey: "...", ... }`.
5. Open `firebase-config.js` in this project and:
   - set `ownerEmail` to **the same Gmail address** you used in the rules
   - copy each value (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) from Firebase into the matching line

It's fine for these values to be on GitHub. The rules from step 3 are what protect your recipes.

## 5. Try it on your computer

Signing in doesn't work when you double-click `index.html`, so start a tiny local web server instead. In the VS Code terminal:

```bash
cd "/Users/karissma/Documents/Kari's Kitchen"
python3 -m http.server 8000
```

Open **http://localhost:8000**, click **Kari's sign-in**, and choose your Google account. The **+ Add a recipe** button should appear. Press `Ctrl + C` in the terminal to stop the server when you're done.

## 6. Put it live

```bash
git add .
git commit -m "Store recipes online with Firebase"
git push
```

After a minute or two, open **https://karissma24.github.io/Kari-s-Kitchen/** and sign in there too.

---

## Bringing over recipes you already added

Recipes you added before this setup are saved in the browser where you added them.

- **Easiest way:** open the site the way you did before (for example by double-clicking `index.html`) and click **Download backup**. Then open the live site, sign in, and click **Restore from backup**.
- If you sign in from the same web address where you added recipes before, the site also offers to copy them online for you.

## If something goes wrong

| What you see | What to check |
| --- | --- |
| No **Kari's sign-in** button | `firebase-config.js` still says `PASTE_...` somewhere, or the change isn't pushed yet. |
| "Sign-in didn't work" | Step 2: Google is enabled, and `karissma24.github.io` is in **Authorized domains**. |
| "…can view recipes but can't change them" | The email in `firebase-config.js` doesn't match the Google account you signed in with. |
| "Only Kari can change recipes" when saving | The email in the **Rules** (step 3) doesn't match your account, or you forgot to click **Publish**. |
| "The recipe box wouldn't open" | The `projectId` in `firebase-config.js` is wrong, or the database from step 3 wasn't created. |
