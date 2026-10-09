# 🍓 Kari's Kitchen

*A little garden of recipes, gathered with love.*

Kari's Kitchen is my personal recipe box: a website where I save the recipes I cook and bake so I can find them again from my computer or my phone. It has a pastel bunny-garden storybook look, with strawberries, daisies, bows and gingham.

**Visit it here:** https://karissma24.github.io/Kari-s-Kitchen/

---

## What it does

- **Two shelves:** recipes are sorted into **Cooking** 🥕 and **Desserts** 🍓, with an **All recipes** view too.
- **Search** recipes by name or by ingredient.
- **Recipe pages** show ingredients you can tick off while you cook, numbered steps, and a little notes card.
- **Photos:** each recipe can have a picture. Photos are shrunk automatically so they load quickly.
- **Print** any recipe.
- **Works on phones** as well as computers.
- **Backups:** download all recipes as a file, and restore them from that file later.
- **Strawberry cursor** 🍓

## Who can do what

| | Visitors | Me (signed in) |
|---|:---:|:---:|
| Browse, search, read and print recipes | ✅ | ✅ |
| Add, edit and delete recipes | | ✅ |
| Restore from a backup | | ✅ |

I sign in with my Google account using the **Kari's sign-in** button. The database itself only accepts changes from my account, so nobody else can edit recipes, even by changing the website's code.

## How it works

The site is plain **HTML, CSS and JavaScript**: no frameworks and no build step. It's hosted for free on **GitHub Pages**.

Recipes are stored online in **Firebase** (Google's free database service), so they stay in sync everywhere:

```
  Browser (GitHub Pages)  ──reads──▶  Firebase Firestore  ◀──writes──  Me, signed in with Google
                                      (security rules: anyone can read,
                                       only my account can write)
```

If Firebase isn't set up, the site still works. It just saves recipes in that one browser instead.

## Files

| File | What it's for |
|---|---|
| `index.html` | The page layout, the add/edit form, and the doodles (strawberry, daisy, bow, leaf, carrot) |
| `styles.css` | Colours, fonts, gingham, the strawberry cursor, and the phone layout |
| `app.js` | Showing, searching, adding, editing and deleting recipes, plus sign-in and backups |
| `firebase-config.js` | My Firebase project settings. These are safe to be public; the rules are what protect the data |
| `firestore.rules` | The database security rules (copied into the Firebase console) |
| `images/` | My bunny picture and the strawberry cursor |
| `SETUP.md` | Step-by-step guide to setting up Firebase |

## Running it on my computer

Google sign-in needs a real web address, so start a small local server instead of double-clicking `index.html`:

```bash
cd "Kari's Kitchen"
python3 -m http.server 8000
```

Then open **http://localhost:8000**. Press `Ctrl + C` in the terminal to stop it.

## Updating the live site

```bash
git add .
git commit -m "What I changed"
git push
```

GitHub Pages updates the live site a minute or two after each push.
