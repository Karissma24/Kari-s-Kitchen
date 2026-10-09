// Kari's Kitchen — recipes live in this browser's localStorage.

const STORAGE_KEY = "karis-kitchen-recipes";

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

// ---------- State ----------

let recipes = load();
let filter = "all";
let query = "";
let editingId = null;
let pendingPhoto = "";

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return structuredClone(SAMPLE_RECIPES);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
    return true;
  } catch {
    alert("Oh no, the recipe box is full! Try removing a photo or two, then save again.");
    return false;
  }
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---------- Elements ----------

const $ = (sel) => document.querySelector(sel);
const grid = $("#grid");
const empty = $("#empty");
const formDialog = $("#form-dialog");
const form = $("#recipe-form");
const fields = form.elements;
const viewDialog = $("#view-dialog");
const view = $("#recipe-view");
const photoInput = $("#f-photo");
const photoPreview = $("#photo-preview");
const photoRemove = $("#photo-remove");

// ---------- Helpers ----------

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

// Shrink photos so they fit comfortably in browser storage.
function resizeImage(file, maxSize = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- Rendering ----------

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
          ? `<img src="${r.photo}" alt="">`
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
    empty.querySelector(".empty-title").textContent = query
      ? "No recipes match that search"
      : "Nothing in this basket yet";
  }
}

function openView(id) {
  const r = recipes.find((x) => x.id === id);
  if (!r) return;

  view.innerHTML = `
    <div class="rv-hero ${r.category} ${r.photo ? "" : gingham(r.category)}">
      ${r.photo ? `<img src="${r.photo}" alt="">` : badge(r.category)}
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
        <button class="btn btn-danger" data-action="delete">Delete</button>
        <button class="btn btn-ghost" data-action="print">Print</button>
        <button class="btn btn-primary" data-action="edit">Edit recipe</button>
      </div>
    </div>
  `;
  view.dataset.id = r.id;
  viewDialog.showModal();
  viewDialog.scrollTop = 0;
}

// ---------- Form ----------

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

form.addEventListener("submit", (e) => {
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

  const before = recipes;
  if (editingId) {
    recipes = recipes.map((r) => (r.id === editingId ? { ...r, ...data } : r));
  } else {
    recipes = [...recipes, { id: newId(), createdAt: Date.now(), ...data }];
  }
  if (!save()) { recipes = before; return; }

  formDialog.close();
  render();
  if (editingId) openView(editingId);
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

// ---------- Events ----------

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

$("#add-btn").addEventListener("click", () => openForm());

view.addEventListener("click", (e) => {
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
      recipes = recipes.filter((x) => x.id !== id);
      save();
      viewDialog.close();
      render();
    }
  }
});

// Close buttons and clicking the backdrop close any dialog.
for (const dlg of [formDialog, viewDialog]) {
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
  });
}

// ---------- Backup ----------

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
  try {
    const incoming = JSON.parse(await file.text());
    if (!Array.isArray(incoming)) throw new Error("not a list");
    const valid = incoming.filter((r) => r && r.id && r.title && ["cooking", "dessert"].includes(r.category));
    if (!confirm(`Restore ${valid.length} recipe(s)? Any that are already here will be updated from the backup.`)) return;

    const byId = new Map(recipes.map((r) => [r.id, r]));
    for (const r of valid) {
      byId.set(r.id, {
        time: "", serves: "", notes: "", photo: "", createdAt: Date.now(),
        ...r,
        ingredients: Array.isArray(r.ingredients) ? r.ingredients : [],
        steps: Array.isArray(r.steps) ? r.steps : [],
      });
    }
    const before = recipes;
    recipes = [...byId.values()];
    if (!save()) { recipes = before; return; }
    render();
  } catch {
    alert("Hmm, that doesn't look like a Kari's Kitchen backup file.");
  }
});

render();
