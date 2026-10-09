// Kari's Kitchen 🍓
// recipes save to firebase so they show up on my phone too

const STORAGE_KEY = "karis-kitchen-recipes";
const MIGRATED_KEY = "karis-kitchen-moved-online";
const FIREBASE_VERSION = "10.12.2";

const SAMPLE_RECIPES = [
  {
    id: "sample-pasta",
    title: "Garden Veggie Pasta",
    category: "cooking",
    time: "30 min",
    serves: "4",
    ingredients: [
      "12 oz penne",
      "2 tbsp olive oil",
      "1 zucchini, diced",
      "1 cup cherry tomatoes, halved",
      "2 cloves garlic, minced",
      "Handful of fresh basil",
      "Parmesan, to serve",
    ],
    steps: [
      "Cook the pasta in salted water until al dente. Save a cup of pasta water.",
      "Warm the olive oil in a big pan and soften the garlic and zucchini.",
      "Add the tomatoes and cook until they just start to burst.",
      "Toss in the pasta with a splash of pasta water, then the basil.",
      "Shower with parmesan and serve warm.",
    ],
    notes: "This is a sample recipe. Delete it whenever you like!",
    photo: "",
    createdAt: 1,
  },
  {
    id: "sample-shortcake",
    title: "Strawberry Shortcake",
    category: "dessert",
    time: "45 min",
    serves: "6",
    ingredients: [
      "2 cups flour",
      "3 tbsp sugar, plus more for berries",
      "1 tbsp baking powder",
      "½ cup cold butter, cubed",
      "¾ cup cream, plus more to whip",
      "1 lb strawberries, sliced",
    ],
    steps: [
      "Toss the strawberries with a spoonful of sugar and let them get juicy.",
      "Whisk flour, sugar and baking powder. Rub in the butter until crumbly.",
      "Stir in the cream, pat into a round and cut into biscuits.",
      "Bake at 425°F for 12–15 minutes until golden.",
      "Split, fill with berries and whipped cream.",
    ],
    notes: "This is a sample recipe. Delete it whenever you like!",
    photo: "",
    createdAt: 2,
  },
];

// saving in the browser (backup plan if firebase isn't set up)

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createLocalStore() {
  let list = readLocal() ?? structuredClone(SAMPLE_RECIPES);
  let notify = () => {};

  function persist(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error("Oh no, the recipe box is full! Try removing a photo or two, then save again.");
    }
    list = next;
    notify(list);
  }

  return {
    mode: "local",
    start(onRecipes, onUser) {
      notify = onRecipes;
      onRecipes(list);
      onUser({ user: null, canEdit: true });
    },
    async put(recipe) {
      persist([...list.filter((r) => r.id !== recipe.id), recipe]);
    },
    async putMany(recipes) {
      const ids = new Set(recipes.map((r) => r.id));
      persist([...list.filter((r) => !ids.has(r.id)), ...recipes]);
    },
    async remove(id) {
      persist(list.filter((r) => r.id !== id));
    },
  };
}

// firebase stuff

async function createCloudStore(settings) {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [{ initializeApp }, fbAuth, fs] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`),
  ]);

  const app = initializeApp(settings.firebase);
  const auth = fbAuth.getAuth(app);
  const db = fs.getFirestore(app);
  const recipesCol = fs.collection(db, "recipes");
  const owner = settings.ownerEmail.trim().toLowerCase();

  const put = (recipe) => {
    const { id, ...data } = recipe;
    return fs.setDoc(fs.doc(recipesCol, id), data);
  };

  return {
    mode: "cloud",
    start(onRecipes, onUser, onError) {
      fs.onSnapshot(
        recipesCol,
        (snap) => onRecipes(snap.docs.map((d) => ({ ...d.data(), id: d.id }))),
        onError,
      );
      fbAuth.onAuthStateChanged(auth, (user) => {
        onUser({ user, canEdit: Boolean(user && user.email?.toLowerCase() === owner) });
      });
    },
    put,
    async putMany(recipes) {
      for (const r of recipes) await put(r);
    },
    remove: (id) => fs.deleteDoc(fs.doc(recipesCol, id)),
    signIn: () => fbAuth.signInWithPopup(auth, new fbAuth.GoogleAuthProvider()),
    signOut: () => fbAuth.signOut(auth),
  };
}

function cloudSettings() {
  const s = window.KARIS_KITCHEN_FIREBASE;
  const key = s?.firebase?.apiKey ?? "";
  const email = s?.ownerEmail ?? "";
  return key && !key.startsWith("PASTE") && email.includes("@") ? s : null;
}

// variables

let store;
let recipes = [];
let loaded = false;
let canEdit = false;
let currentUser = null;
let filter = "all";
let query = "";
let editingId = null;
let pendingPhoto = "";
let moveOffered = false;

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// page elements

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const empty = $("#empty");
const formDialog = $("#form-dialog");
const form = $("#recipe-form");
const fields = form.elements;
const saveBtn = form.querySelector("button[type=submit]");
const viewDialog = $("#view-dialog");
const view = $("#recipe-view");
const photoInput = $("#f-photo");
const photoPreview = $("#photo-preview");
const photoRemove = $("#photo-remove");
const addBtn = $("#add-btn");
const authBtn = $("#auth-btn");
const importLabel = $("#import-label");
const storageNote = $("#storage-note");

// helpers

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

const icon = (name, cls = "") => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
const categoryIcon = (cat) => (cat === "dessert" ? "strawberry" : "carrot");
const gingham = (cat) => (cat === "dessert" ? "gingham-pink" : "gingham-sage");
const badge = (cat) => `<div class="card-badge">${icon(categoryIcon(cat))}</div>`;
const categoryLabel = (cat) => (cat === "dessert" ? "Dessert" : "Cooking");

function lines(text) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

function metaHtml(r) {
  const bits = [];
  if (r.time) bits.push(`<span>⏲ ${escapeHtml(r.time)}</span>`);
  if (r.serves) bits.push(`<span>♡ serves ${escapeHtml(r.serves)}</span>`);
  return bits.join("");
}

// fills in blanks so old recipes don't break
function normalize(r) {
  return {
    time: "", serves: "", notes: "", photo: "", createdAt: Date.now(),
    ...r,
    category: r.category === "dessert" ? "dessert" : "cooking",
    ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
    steps: Array.isArray(r.steps) ? r.steps : [],
  };
}

function saveErrorMessage(err) {
  if (err?.code === "permission-denied") {
    return "Only Kari can change recipes. Make sure you're signed in with the right Google account.";
  }
  return err?.message?.startsWith("Oh no")
    ? err.message
    : "Sorry, that didn't save. Check your internet connection and try again.";
}

// makes photos smaller so they fit
function resizeImage(file, maxSize = 800) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// showing the recipes

function render() {
  for (const cat of ["all", "cooking", "dessert"]) {
    const n = cat === "all" ? recipes.length : recipes.filter((r) => r.category === cat).length;
    document.querySelector(`[data-count="${cat}"]`).textContent = n;
  }

  const q = query.toLowerCase();
  const shown = recipes
    .filter((r) => filter === "all" || r.category === filter)
    .filter((r) => !q || r.title.toLowerCase().includes(q) ||
      r.ingredients.some((i) => i.toLowerCase().includes(q)))
    .sort((a, b) => b.createdAt - a.createdAt);

  grid.innerHTML = shown.map((r) => `
    <button class="card ${r.category}" data-id="${escapeHtml(r.id)}">
      <div class="card-art ${r.photo ? "" : gingham(r.category)}">
        ${r.photo
          ? `<img src="${escapeHtml(r.photo)}" alt="">`
          : `${icon("daisy", "mini a")}${badge(r.category)}${icon("heart", "mini b")}`}
      </div>
      <div class="card-body">
        <span class="tag ${r.category}">${categoryLabel(r.category)}</span>
        <h3>${escapeHtml(r.title)}</h3>
        <div class="meta">${metaHtml(r)}</div>
      </div>
    </button>
  `).join("");

  empty.hidden = shown.length > 0;
  if (!shown.length) {
    empty.querySelector(".empty-title").textContent =
      !loaded ? "Gathering recipes…"
      : query ? "No recipes match that search"
      : "Nothing in this basket yet";
    empty.querySelector(".empty-sub").hidden = !loaded || !canEdit;
  }
}

function renderAccess() {
  addBtn.hidden = !canEdit;
  importLabel.hidden = !canEdit;

  if (store.mode === "local") {
    authBtn.hidden = true;
    storageNote.textContent =
      "Your recipes are saved in this browser. Download a backup now and then to keep them extra safe.";
  } else {
    authBtn.hidden = false;
    authBtn.textContent = currentUser ? "Sign out" : "Kari's sign-in";
    storageNote.textContent = canEdit
      ? `Signed in as ${currentUser.email}. Your recipes are saved online and show up on every device.`
      : "Recipes from Kari's kitchen, shared with love.";
  }

  if (viewDialog.open) openView(view.dataset.id);
}

function openView(id) {
  const r = recipes.find((x) => x.id === id);
  if (!r) {
    if (viewDialog.open) viewDialog.close();
    return;
  }

  view.innerHTML = `
    <div class="rv-hero ${r.category} ${r.photo ? "" : gingham(r.category)}">
      ${r.photo ? `<img src="${escapeHtml(r.photo)}" alt="">` : badge(r.category)}
      <button class="close" data-close aria-label="Close">×</button>
    </div>
    <div class="rv-body">
      <span class="tag ${r.category}">${categoryLabel(r.category)}</span>
      <h2 class="rv-title">${escapeHtml(r.title)}</h2>
      <div class="meta">${metaHtml(r)}</div>

      <div class="rv-cols">
        <section>
          <h3>${icon("strawberry")}Ingredients</h3>
          ${r.ingredients.length
            ? `<ul class="ingredients">${r.ingredients.map((i) => `
                <li><label><input type="checkbox"><span>${escapeHtml(i)}</span></label></li>`).join("")}
              </ul>`
            : `<p class="meta">No ingredients added yet.</p>`}
        </section>
        <section>
          <h3>${icon("leaf")}Method</h3>
          ${r.steps.length
            ? `<ol class="steps">${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>`
            : `<p class="meta">No steps added yet.</p>`}
        </section>
      </div>

      ${r.notes ? `<div class="notes">${icon("bow")}${escapeHtml(r.notes).replace(/\n/g, "<br>")}</div>` : ""}

      <div class="rv-actions">
        ${canEdit ? `<button class="btn btn-danger" data-action="delete">Delete</button>` : ""}
        <button class="btn btn-ghost" data-action="print">Print</button>
        ${canEdit ? `<button class="btn btn-primary" data-action="edit">Edit recipe</button>` : ""}
      </div>
    </div>
  `;
  view.dataset.id = r.id;
  if (!viewDialog.open) {
    viewDialog.showModal();
    viewDialog.scrollTop = 0;
  }
}

// add/edit form

function setPhoto(dataUrl) {
  pendingPhoto = dataUrl;
  photoPreview.src = dataUrl || "";
  photoPreview.hidden = !dataUrl;
  photoRemove.hidden = !dataUrl;
  photoInput.value = "";
}

function openForm(id = null) {
  editingId = id;
  form.reset();
  const r = id ? recipes.find((x) => x.id === id) : null;

  $("#form-title").textContent = r ? "Edit recipe" : "A new recipe";
  if (r) {
    fields.title.value = r.title;
    fields.category.value = r.category;
    fields.time.value = r.time;
    fields.serves.value = r.serves;
    fields.ingredients.value = r.ingredients.join("\n");
    fields.steps.value = r.steps.join("\n");
    fields.notes.value = r.notes;
  } else if (filter !== "all") {
    fields.category.value = filter;
  }
  setPhoto(r ? r.photo : "");
  formDialog.showModal();
  fields.title.focus();
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    title: fields.title.value.trim(),
    category: fields.category.value,
    time: fields.time.value.trim(),
    serves: fields.serves.value.trim(),
    ingredients: lines(fields.ingredients.value),
    steps: lines(fields.steps.value),
    notes: fields.notes.value.trim(),
    photo: pendingPhoto,
  };
  if (!data.title) return;

  const existing = editingId && recipes.find((r) => r.id === editingId);
  const recipe = existing
    ? { ...existing, ...data }
    : { id: newId(), createdAt: Date.now(), ...data };

  saveBtn.disabled = true;
  saveBtn.textContent = "Saving…";
  try {
    await store.put(recipe);
    formDialog.close();
    if (existing) openView(existing.id);
  } catch (err) {
    alert(saveErrorMessage(err));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save recipe";
  }
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files[0];
  if (!file) return;
  try {
    setPhoto(await resizeImage(file));
  } catch {
    alert("Sorry, that photo couldn't be opened. Try a JPG or PNG.");
  }
});
photoRemove.addEventListener("click", () => setPhoto(""));

// buttons + clicks

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openView(card.dataset.id);
});

document.querySelectorAll(".shelf").forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    document.querySelectorAll(".shelf").forEach((b) => b.classList.toggle("is-active", b === btn));
    render();
  });
});

$("#search").addEventListener("input", (e) => {
  query = e.target.value.trim();
  render();
});

addBtn.addEventListener("click", () => openForm());

authBtn.addEventListener("click", async () => {
  try {
    if (currentUser) await store.signOut();
    else await store.signIn();
  } catch (err) {
    if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
      alert("Sign-in didn't work. If this keeps happening, check the steps in SETUP.md.");
    }
  }
});

view.addEventListener("click", async (e) => {
  const id = view.dataset.id;
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "edit") {
    viewDialog.close();
    openForm(id);
  } else if (action === "print") {
    window.print();
  } else if (action === "delete") {
    const r = recipes.find((x) => x.id === id);
    if (r && confirm(`Delete "${r.title}"? This can't be undone.`)) {
      try {
        await store.remove(id);
        viewDialog.close();
      } catch (err) {
        alert(saveErrorMessage(err));
      }
    }
  }
});

// close popups when clicking outside
for (const dlg of [formDialog, viewDialog]) {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
  });
}

// backup download + restore

$("#export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `karis-kitchen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#import-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;

  let valid;
  try {
    const incoming = JSON.parse(await file.text());
    if (!Array.isArray(incoming)) throw new Error("not a list");
    valid = incoming
      .filter((r) => r && r.id && r.title && ["cooking", "dessert"].includes(r.category))
      .map(normalize);
  } catch {
    alert("Hmm, that doesn't look like a Kari's Kitchen backup file.");
    return;
  }
  if (!confirm(`Restore ${valid.length} recipe(s)? Any that are already here will be updated from the backup.`)) return;

  try {
    await store.putMany(valid);
  } catch (err) {
    alert(saveErrorMessage(err));
  }
});

// move my old recipes online (only asks once)
async function offerToMoveLocalRecipes() {
  if (store.mode !== "cloud" || !canEdit || !loaded || moveOffered) return;
  moveOffered = true;
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
  } catch {
    return;
  }

  const sampleIds = new Set(SAMPLE_RECIPES.map((r) => r.id));
  const onlineIds = new Set(recipes.map((r) => r.id));
  const toMove = (readLocal() ?? [])
    .filter((r) => r && r.id && r.title && !sampleIds.has(r.id) && !onlineIds.has(r.id))
    .map(normalize);

  if (toMove.length && confirm(
    `This browser has ${toMove.length} recipe(s) from before your recipes went online. ` +
    "Copy them to your online recipe box so they show up everywhere?",
  )) {
    try {
      await store.putMany(toMove);
    } catch (err) {
      alert(saveErrorMessage(err));
      return;
    }
  }
  try {
    localStorage.setItem(MIGRATED_KEY, "yes");
  } catch {
    // it'll just ask again next time
  }
}

// start everything

async function start() {
  const settings = cloudSettings();
  store = createLocalStore();
  if (settings) {
    try {
      store = await createCloudStore(settings);
    } catch {
      alert("Couldn't reach the online recipe box, so you're seeing the recipes saved in this browser.");
    }
  }

  render();
  setTimeout(() => {
    if (!loaded) {
      empty.querySelector(".empty-title").textContent =
        "The recipe box is taking a while to open. Check your internet connection and try refreshing.";
    }
  }, 15000);
  store.start(
    (list) => {
      recipes = list.map(normalize);
      loaded = true;
      render();
      if (viewDialog.open) openView(view.dataset.id);
      offerToMoveLocalRecipes();
    },
    ({ user, canEdit: allowed }) => {
      currentUser = user;
      canEdit = allowed;
      if (user && !allowed) {
        alert(`${user.email} can view recipes but can't change them. Sign out and use Kari's Google account to edit.`);
      }
      renderAccess();
      render();
      offerToMoveLocalRecipes();
    },
    () => {
      loaded = true;
      render();
      empty.querySelector(".empty-title").textContent = "The recipe box wouldn't open. Try refreshing the page.";
    },
  );
}

start();
