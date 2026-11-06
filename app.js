(function () {
  "use strict";

  const RECIPES = window.RECIPES || [];
  const PLANS = window.PLANS || [];
  const byId = Object.fromEntries(RECIPES.map(r => [r.id, r]));
  const app = document.getElementById("app");

  const CATS = [
    { key: "breakfast",  name: "Breakfast",  emoji: "🥞", blurb: "Pancakes, oats, savory hashes and make-ahead mornings." },
    { key: "lunch",      name: "Lunch, Soups & Salads", short: "Lunch", emoji: "🥗", blurb: "Soups, bowls, big salads and things to pack." },
    { key: "dinner",     name: "Dinner",     emoji: "🍲", blurb: "Weeknight staples through dinner-party mains." },
    { key: "sides",      name: "Sides",      emoji: "🥔", blurb: "Vegetables, potatoes, grains and salads to round out a plate." },
    { key: "appetizers", name: "Appetizers & Party Food", short: "Appetizers", emoji: "🫒", blurb: "Dips, bites and finger food for a crowd." },
    { key: "snacks",     name: "Snacks",     emoji: "🍿", blurb: "Bites, bars and crunchy things for between meals." },
    { key: "breads",     name: "Breads & Baking", short: "Breads", emoji: "🍞", blurb: "Yeast breads, muffins, quick breads, biscuits and pizza." },
    { key: "desserts",   name: "Desserts",   emoji: "🍰", blurb: "Cookies, cakes, pies, mousse and celebration-worthy sweets." },
  ];
  const catByKey = Object.fromEntries(CATS.map(c => [c.key, c]));

  // ---------- helpers ----------
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = s => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
  };
  let saved = new Set(store.get("safe-table-saved", []));
  const updateSavedCount = () => { document.getElementById("saved-count").textContent = saved.size; };

  function toggleSave(id) {
    saved.has(id) ? saved.delete(id) : saved.add(id);
    store.set("safe-table-saved", [...saved]);
    updateSavedCount();
    document.querySelectorAll(`.save[data-id="${CSS.escape(id)}"]`).forEach(b => {
      b.setAttribute("aria-pressed", saved.has(id));
      b.textContent = saved.has(id) ? "♥" : "♡";
    });
  }

  // ---------- shopping list state ----------
  const ING = window.INGREDIENTS || {};
  let cart = store.get("safe-table-cart", {});          // { recipeId: multiplier }
  let checked = new Set(store.get("safe-table-checked", []));
  const saveCart = () => { store.set("safe-table-cart", cart); updateCartCount(); };
  const updateCartCount = () => { const el = document.getElementById("cart-count"); if (el) el.textContent = Object.keys(cart).length; };
  function toggleCart(id) {
    if (cart[id]) delete cart[id]; else cart[id] = 1;
    saveCart();
    document.querySelectorAll(`.add-list[data-id="${CSS.escape(id)}"]`).forEach(b => {
      b.setAttribute("aria-pressed", !!cart[id]);
      b.textContent = cart[id] ? "✓ On list" : "+ List";
    });
  }

  function card(r, opts = {}) {
    if (!r) return "";
    const isSaved = saved.has(r.id);
    const inCart = !!cart[r.id];
    const notes = [];
    if (r.swaps) notes.push(`<div class="note swap"><b>Swap:</b> ${esc(r.swaps)}</div>`);
    if (r.watch) notes.push(`<div class="note watch"><b>Check:</b> ${esc(r.watch)}</div>`);
    if (!r.swaps && !r.watch) notes.push(`<div class="note ok">✓ Safe as written</div>`);
    const tags = (r.tags || []).slice(0, 5).map(t => `<span class="tag">${esc(t)}</span>`).join("");
    const meta = [r.time && `⏱ ${esc(r.time)}`, r.serves && `🍽 ${esc(r.serves)}`].filter(Boolean).map(m => `<span>${m}</span>`).join("");
    return `<article class="card">
      ${opts.course ? `<div class="course-label">${esc(opts.course)}</div>` : ""}
      <button class="save" data-id="${esc(r.id)}" aria-pressed="${isSaved}" aria-label="Save recipe" title="Save">${isSaved ? "♥" : "♡"}</button>
      <h3><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></h3>
      <div class="site">${esc(r.site)}</div>
      <div class="meta">${meta}</div>
      <p class="desc">${esc(r.description)}</p>
      ${opts.note ? `<div class="note ok"><b>For this menu:</b> ${esc(opts.note)}</div>` : ""}
      ${notes.join("")}
      <div class="tags">${tags}</div>
      <div class="card-actions">
        <span class="diff ${esc(r.difficulty)}">${esc(r.difficulty || "")}</span>
        ${ING[r.id] ? `<button class="add-list" data-id="${esc(r.id)}" aria-pressed="${inCart}" title="Add ingredients to shopping list">${inCart ? "✓ On list" : "+ List"}</button>` : ""}
        <a class="go" href="${esc(r.url)}" target="_blank" rel="noopener">Open recipe ↗</a>
      </div>
    </article>`;
  }

  function planCard(p) {
    const items = p.menu.map(m => {
      const r = byId[m.id];
      return r ? `<li><span>${esc(m.course)}</span>${esc(r.title)}</li>` : "";
    }).join("");
    return `<a class="plan-card" href="#/plan/${esc(p.id)}">
      <div class="band"><div class="k">${p.type === "two" ? "Dinner for two" : "Entertaining · serves " + esc(p.serves)}</div>
      <h3>${esc(p.title)}</h3><p>${esc(p.blurb)}</p></div>
      <ul>${items}</ul></a>`;
  }

  function setTitle(t) { document.title = t ? `${t} · The Safe Table` : "The Safe Table"; }
  function setActiveNav(hash) {
    document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("active", hash.startsWith(a.getAttribute("href"))));
  }

  function matches(r, q) {
    if (!q) return true;
    const hay = [r.title, r.site, r.description, r.subcategory, r.category, ...(r.tags || [])].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => hay.includes(w));
  }

  // ---------- views ----------
  function viewHome() {
    setTitle("");
    const sites = new Set(RECIPES.map(r => r.site)).size;
    const two = PLANS.filter(p => p.type === "two").slice(0, 3);
    const ent = PLANS.filter(p => p.type === "entertain").slice(0, 3);
    return `
      <section class="hero">
        <div>
          <h1>Cook everything. Worry about nothing.</h1>
          <p class="lede">A hand-picked collection of the best free recipes on the web that are free of egg, wheat, gluten, barley, dairy, tree nuts, peanuts and shellfish, or that need only one easy swap (noted on every card). Each links back to its original creator.</p>
          <form class="search" id="home-search"><input type="search" name="q" placeholder="Search recipes, e.g. “chocolate”, “salmon”, “make-ahead”" aria-label="Search recipes"></form>
        </div>
        <div class="hero-stats">
          <div class="stat"><b>${RECIPES.length}</b><span>recipes</span></div>
          <div class="stat"><b>${sites}</b><span>source sites</span></div>
          <div class="stat"><b>${PLANS.length}</b><span>full menus</span></div>
        </div>
      </section>
      <h2>Browse by meal</h2>
      <div class="tiles">
        ${CATS.map(c => `<a class="tile" href="#/c/${c.key}"><span class="emoji">${c.emoji}</span><b>${esc(c.short || c.name)}</b><span class="count">${RECIPES.filter(r => r.category === c.key).length} recipes</span></a>`).join("")}
        <a class="tile" href="#/swaps"><span class="emoji">🔁</span><b>Swap guide</b><span class="count">eggs, flour, butter, milk…</span></a>
      </div>
      <div class="section-head"><h2>Dinner for two</h2><a href="#/plans#two">All date-night menus →</a></div>
      <div class="plan-grid">${two.map(planCard).join("")}</div>
      <div class="section-head"><h2>Entertaining</h2><a href="#/plans#entertain">All party menus →</a></div>
      <div class="plan-grid">${ent.map(planCard).join("")}</div>`;
  }

  function viewCategory(key, params) {
    const c = catByKey[key];
    if (!c) return viewNotFound();
    setTitle(c.name);
    const list = RECIPES.filter(r => r.category === key);
    const activeTag = params.get("tag") || "";
    const q = params.get("q") || "";
    const tagCounts = {};
    list.forEach(r => (r.tags || []).forEach(t => tagCounts[t] = (tagCounts[t] || 0) + 1));
    const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([t]) => t);
    const safeOnly = params.get("safe") === "1";
    const filtered = list.filter(r => (!activeTag || (r.tags || []).includes(activeTag)) && matches(r, q) && (!safeOnly || (!r.swaps)));
    const groups = {};
    filtered.forEach(r => (groups[r.subcategory || "More"] ||= []).push(r));
    const order = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);
    const link = (tag, safe) => {
      const p = new URLSearchParams();
      if (tag) p.set("tag", tag);
      if (safe) p.set("safe", "1");
      if (q) p.set("q", q);
      const s = p.toString();
      return `#/c/${key}${s ? "?" + s : ""}`;
    };
    return `
      <div class="page-head">
        <div class="crumbs"><a href="#/">Home</a> / ${esc(c.name)}</div>
        <h1>${c.emoji} ${esc(c.name)}</h1>
        <p>${esc(c.blurb)} ${list.length} recipes from ${new Set(list.map(r => r.site)).size} different sites.</p>
      </div>
      <form class="search" id="cat-search" data-cat="${key}"><input type="search" name="q" value="${esc(q)}" placeholder="Search ${esc(c.short || c.name).toLowerCase()}…" aria-label="Search this category"></form>
      <div class="filters">
        <span class="filter-label">Filter</span>
        <a class="filter-btn" href="${link("", safeOnly)}" aria-pressed="${!activeTag}">All</a>
        ${topTags.map(t => `<a class="filter-btn" href="${link(activeTag === t ? "" : t, safeOnly)}" aria-pressed="${activeTag === t}">${esc(t)}</a>`).join("")}
        <a class="filter-btn" href="${link(activeTag, !safeOnly)}" aria-pressed="${safeOnly}">✓ No swaps needed</a>
      </div>
      ${order.length > 1 ? `<nav class="subnav">${order.map(g => `<a href="#" data-jump="${slug(g)}">${esc(g)} (${groups[g].length})</a>`).join("")}</nav>` : ""}
      ${filtered.length ? order.map(g => `
        <h2 class="group-title" id="g-${slug(g)}">${esc(g)} <small>${groups[g].length}</small></h2>
        <div class="grid">${groups[g].map(r => card(r)).join("")}</div>`).join("")
        : `<div class="empty">Nothing matches that filter. <a href="#/c/${key}">Show all</a></div>`}`;
  }

  function viewPlans() {
    setTitle("Menus");
    const two = PLANS.filter(p => p.type === "two");
    const ent = PLANS.filter(p => p.type === "entertain");
    return `
      <div class="page-head">
        <div class="crumbs"><a href="#/">Home</a> / Menus</div>
        <h1>Menus for an occasion</h1>
        <p>Complete menus built from the recipes on this site, each with a game plan so everything lands on the table at the right time. Every course is safe for all eight allergens.</p>
      </div>
      <h2 class="group-title" id="g-two">❤️ Dinner for two <small>${two.length}</small></h2>
      <div class="plan-grid">${two.map(planCard).join("")}</div>
      <h2 class="group-title" id="g-entertain">🎉 Entertaining <small>${ent.length}</small></h2>
      <div class="plan-grid">${ent.map(planCard).join("")}</div>`;
  }

  function viewPlan(id) {
    const p = PLANS.find(x => x.id === id);
    if (!p) return viewNotFound();
    setTitle(p.title);
    return `
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/plans">Menus</a> / ${esc(p.title)}</div>
      <section class="plan-hero">
        <div class="course-label">${p.type === "two" ? "Dinner for two" : "Entertaining"}</div>
        <h1>${esc(p.title)}</h1>
        <p>${esc(p.intro || p.blurb)}</p>
        <p><button class="btn" data-add-menu="${esc(p.id)}">🛒 Add the whole menu to my shopping list</button></p>
        <div class="facts">
          <span>👥 Serves ${esc(p.serves)}</span>
          ${p.occasion ? `<span>✨ ${esc(p.occasion)}</span>` : ""}
          ${p.activeTime ? `<span>⏱ ${esc(p.activeTime)}</span>` : ""}
          <span>🧾 ${p.menu.length} recipes</span>
        </div>
      </section>
      <div class="plan-layout">
        <div class="course-list">${p.menu.map(m => card(byId[m.id], { course: m.course, note: m.note })).join("")}</div>
        <aside class="side-panel">
          <h3>Game plan</h3>
          <ol class="timeline">${(p.timeline || []).map(t => `<li><b>${esc(t.when)}</b>${esc(t.what)}</li>`).join("")}</ol>
          ${p.tips?.length ? `<h3>Tips</h3><ul class="tips">${p.tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
          ${p.drinks ? `<h3>To drink</h3><p>${esc(p.drinks)}</p>` : ""}
        </aside>
      </div>`;
  }

  function viewSearch(params) {
    const q = params.get("q") || "";
    setTitle(`Search: ${q}`);
    const res = RECIPES.filter(r => matches(r, q));
    return `
      <div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Search</div>
      <h1>Search</h1></div>
      <form class="search" id="home-search"><input type="search" name="q" value="${esc(q)}" placeholder="Search all recipes…" aria-label="Search recipes" autofocus></form>
      <p class="muted" style="margin-top:12px">${res.length} result${res.length === 1 ? "" : "s"} for “${esc(q)}”</p>
      ${res.length ? `<div class="grid">${res.map(r => card(r)).join("")}</div>` : `<div class="empty">No recipes found. Try a broader word like “chicken” or “chocolate”.</div>`}`;
  }

  function viewSaved() {
    setTitle("Saved");
    const list = RECIPES.filter(r => saved.has(r.id));
    return `<div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Saved</div>
      <h1>♥ Saved recipes</h1><p>Tap the heart on any recipe to keep it here. Saved recipes stay in this browser on this device.</p></div>
      ${list.length ? `<div class="grid">${list.map(r => card(r)).join("")}</div>` : `<div class="empty">Nothing saved yet. Tap ♡ on any recipe.</div>`}`;
  }

  function viewSources() {
    setTitle("Sources");
    const counts = {};
    RECIPES.forEach(r => {
      const host = (() => { try { return new URL(r.url).origin; } catch { return ""; } })();
      (counts[r.site] ||= { n: 0, host }).n++;
    });
    const list = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
    return `<div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Sources</div>
      <h1>The cooks behind these recipes</h1>
      <p>${list.length} food bloggers and recipe sites. All of these recipes are theirs; this site only collects and screens them. If you love a recipe, visit their site, leave a review, and support their work.</p></div>
      <ul class="sources">${list.map(([s, v]) => `<li><a href="${esc(v.host)}" target="_blank" rel="noopener">${esc(s)}</a><span class="muted">${v.n}</span></li>`).join("")}</ul>`;
  }

  function viewSwaps() {
    setTitle("Swap guide");
    return window.SWAPS_HTML ? window.SWAPS_HTML : `<div class="empty">Guide loading…</div>`;
  }

  // ---------- shopping list ----------
  const AISLE_ORDER = ["Produce", "Meat & Fish", "Dairy-Free Fridge", "Frozen", "Baking", "Grains, Pasta & Bread", "Canned & Jarred", "Oils, Vinegars & Condiments", "Nuts, Seeds & Dried Fruit", "Spices & Seasonings", "Other"];
  const VOL = { tsp: 1, tbsp: 3, cup: 48 };
  const WT = { oz: 1, lb: 16 };
  function frac(x) {
    if (x == null) return "";
    const whole = Math.floor(x + 1e-9), rem = x - whole;
    const opts = [[0, ""], [.125, "⅛"], [.25, "¼"], [1/3, "⅓"], [.5, "½"], [2/3, "⅔"], [.75, "¾"], [1, ""]];
    let best = opts[0];
    for (const o of opts) if (Math.abs(rem - o[0]) < Math.abs(rem - best[0])) best = o;
    const w = best[0] === 1 ? whole + 1 : whole;
    if (rem > 0 && Math.abs(rem - best[0]) > .07) return (Math.round(x * 10) / 10).toString();
    return (w ? w : "") + best[1] || "0";
  }
  function fmtAmount(entries) {
    // entries: [{q, u, m}] → combine compatible units
    let vol = 0, wt = 0, hasVol = false, hasWt = false;
    const other = {}; let unknown = 0;
    for (const e of entries) {
      if (e.q == null) { unknown++; continue; }
      const q = e.q * e.m;
      if (VOL[e.u]) { vol += q * VOL[e.u]; hasVol = true; }
      else if (WT[e.u]) { wt += q * WT[e.u]; hasWt = true; }
      else (other[e.u] = (other[e.u] || 0) + q);
    }
    const parts = [];
    if (hasVol) {
      if (vol < 0.12) parts.push("a pinch");
      else if (vol >= 12) parts.push(frac(vol / 48) + " cup");
      else if (vol >= 3) parts.push(frac(vol / 3) + " tbsp");
      else parts.push(frac(vol) + " tsp");
    }
    if (hasWt) parts.push(wt >= 16 ? frac(wt / 16) + " lb" : frac(wt) + " oz");
    for (const [u, q] of Object.entries(other)) parts.push(frac(q) + (u ? " " + u : ""));
    if (unknown && !parts.length) parts.push("as needed");
    return parts.join(" + ");
  }
  const itemKey = i => (i.b ? i.b.toLowerCase() : i.k) || i.n.toLowerCase();

  function buildList() {
    const groups = {};
    for (const [rid, mult] of Object.entries(cart)) {
      const r = byId[rid]; if (!r) continue;
      for (const i of (ING[rid] || [])) {
        const key = itemKey(i);
        const aisle = i.s ? "__staples" : i.a;
        const g = (groups[aisle] ||= {});
        const it = (g[key] ||= { key, name: i.b || i.n, orig: new Set(), entries: [], warns: new Set(), recipes: new Set(), lines: [] });
        if (i.b && i.n.toLowerCase() !== i.b.toLowerCase()) it.orig.add(i.n);
        it.entries.push({ q: i.q, u: i.u, m: mult });
        if (i.w) i.w.split(" · ").forEach(w => it.warns.add(w));
        it.recipes.add(r.title);
        it.lines.push(`${r.title}: ${i.r}`);
      }
    }
    return groups;
  }

  function wfmPicks(key) {
    for (const p of (window.WFM_PICKS || [])) if (new RegExp(p.match, "i").test(key)) return p;
    return null;
  }
  const wfmUrl = q => (window.WFM_SEARCH || "https://www.wholefoodsmarket.com/search?text=") + encodeURIComponent(q);

  function itemRow(it) {
    const id = "chk-" + slug(it.key);
    const isChecked = checked.has(it.key);
    const pick = wfmPicks(it.key);
    const warns = [...it.warns].filter(w => !/^Contains coconut$/.test(w));
    const coconut = it.warns.has("Contains coconut");
    return `<li class="li ${isChecked ? "done" : ""}">
      <input type="checkbox" id="${id}" data-check="${esc(it.key)}" ${isChecked ? "checked" : ""}>
      <label for="${id}">
        <span class="li-name">${esc(it.name)}</span>
        <span class="li-amt">${esc(fmtAmount(it.entries))}</span>
        ${it.orig.size ? `<span class="li-sub">recipe lists: ${esc([...it.orig].join(", "))}</span>` : ""}
        ${warns.length ? `<span class="li-warn">⚠ ${esc(warns.join(" · "))}</span>` : ""}
        ${coconut ? `<span class="li-coco">contains coconut</span>` : ""}
        ${pick ? `<span class="li-pick">✓ Safe pick at Whole Foods: ${pick.picks.map(esc).join(" · ")}</span>` : ""}
        <details class="li-from"><summary>${it.recipes.size} recipe${it.recipes.size > 1 ? "s" : ""}</summary>${it.lines.map(l => `<div>${esc(l)}</div>`).join("")}</details>
      </label>
      <a class="wfm" href="${wfmUrl(pick ? pick.search || it.name : it.name)}" target="_blank" rel="noopener" title="Search Whole Foods">WFM ↗</a>
    </li>`;
  }

  function viewList() {
    setTitle("Shopping list");
    const ids = Object.keys(cart).filter(id => byId[id]);
    if (!ids.length) return `<div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Shopping list</div><h1>🛒 Shopping list</h1>
      <p>Tap <b>+ List</b> on any recipe, or <b>Add the whole menu</b> on any <a href="#/plans">menu</a>. Ingredients from every recipe you pick are combined here by grocery aisle, with safe swaps already applied.</p></div>
      <div class="empty">Your list is empty.</div>`;
    const groups = buildList();
    const aisles = AISLE_ORDER.filter(a => groups[a]);
    const total = aisles.reduce((n, a) => n + Object.keys(groups[a]).length, 0);
    const done = aisles.reduce((n, a) => n + Object.keys(groups[a]).filter(k => checked.has(k)).length, 0);
    const sortItems = g => Object.values(g).sort((a, b) => (checked.has(a.key) - checked.has(b.key)) || a.name.localeCompare(b.name));
    return `
      <div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Shopping list</div>
        <h1>🛒 Shopping list</h1>
        <p>${ids.length} recipe${ids.length > 1 ? "s" : ""} · ${total} items · ${done} checked off. Allergen swaps are applied automatically, so buy what the list says, not what the original recipe says.</p>
      </div>
      <div class="list-actions">
        <button class="btn" data-act="copy">📋 Copy list</button>
        <button class="btn ghost" onclick="window.print()">🖨 Print</button>
        <button class="btn ghost" data-act="uncheck">Uncheck all</button>
        <button class="btn ghost" data-act="clear">Clear list</button>
      </div>
      <div class="list-layout">
        <section>
          ${aisles.map(a => `<h2 class="group-title">${esc(a)} <small>${Object.keys(groups[a]).length}</small></h2>
            <ul class="shop">${sortItems(groups[a]).map(itemRow).join("")}</ul>`).join("")}
          ${groups.__staples ? `<details class="staples"><summary><h2 class="group-title" style="display:inline">Pantry check <small>${Object.keys(groups.__staples).length} staples you probably have</small></h2></summary>
            <ul class="shop">${sortItems(groups.__staples).map(itemRow).join("")}</ul></details>` : ""}
        </section>
        <aside class="side-panel">
          <h3>Recipes on this list</h3>
          <ul class="cart-recipes">${ids.map(id => `<li>
            <a href="${esc(byId[id].url)}" target="_blank" rel="noopener">${esc(byId[id].title)}</a>
            <span class="mult"><button data-mult="${esc(id)}" data-d="-1" aria-label="Less">−</button><b>×${cart[id]}</b><button data-mult="${esc(id)}" data-d="1" aria-label="More">+</button><button data-rm="${esc(id)}" aria-label="Remove" class="rm">✕</button></span>
          </li>`).join("")}</ul>
          <p class="muted small">Use × to double a recipe for a crowd.</p>
          <div class="callout"><b>About Whole Foods:</b> Whole Foods doesn't publish live store stock, so <b>WFM ↗</b> opens a product search on their site, where you can choose your store and see what's available. "Safe picks" are specific products we checked against her allergens. Labels change, so still read the package.</div>
        </aside>
      </div>`;
  }

  function listAsText() {
    const groups = buildList();
    const out = [];
    for (const a of [...AISLE_ORDER, "__staples"]) {
      if (!groups[a]) continue;
      out.push("", (a === "__staples" ? "PANTRY CHECK" : a.toUpperCase()));
      for (const it of Object.values(groups[a])) {
        if (checked.has(it.key)) continue;
        const pick = wfmPicks(it.key);
        out.push(`☐ ${it.name} (${fmtAmount(it.entries)})${pick ? " [" + pick.picks[0] + "]" : ""}`);
      }
    }
    return "Shopping list · The Safe Table\n" + Object.keys(cart).map(id => "• " + byId[id]?.title).join("\n") + "\n" + out.join("\n");
  }

  function viewNotFound() {
    setTitle("Not found");
    return `<div class="empty"><h2>Page not found</h2><a href="#/">Back home</a></div>`;
  }

  // ---------- router ----------
  function route() {
    const hash = location.hash || "#/";
    const [beforeAnchor, anchor] = hash.slice(1).split("#");
    const [path, qs] = beforeAnchor.split("?");
    const params = new URLSearchParams(qs || "");
    const parts = path.split("/").filter(Boolean);
    let html;
    if (!parts.length) html = viewHome();
    else if (parts[0] === "c") html = viewCategory(parts[1], params);
    else if (parts[0] === "plans") html = viewPlans();
    else if (parts[0] === "plan") html = viewPlan(parts[1]);
    else if (parts[0] === "search") html = viewSearch(params);
    else if (parts[0] === "saved") html = viewSaved();
    else if (parts[0] === "swaps") html = viewSwaps();
    else if (parts[0] === "sources") html = viewSources();
    else if (parts[0] === "list") html = viewList();
    else html = viewNotFound();
    app.innerHTML = html;
    setActiveNav(hash);
    document.getElementById("nav").classList.remove("open");
    const el = anchor && document.getElementById("g-" + anchor);
    if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const s = e.target.closest(".save");
    if (s) { e.preventDefault(); toggleSave(s.dataset.id); return; }
    const al = e.target.closest(".add-list");
    if (al) { e.preventDefault(); toggleCart(al.dataset.id); return; }
    const am = e.target.closest("[data-add-menu]");
    if (am) {
      const p = PLANS.find(x => x.id === am.dataset.addMenu);
      p.menu.forEach(m => { if (ING[m.id] && !cart[m.id]) cart[m.id] = 1; });
      saveCart(); route();
      am.textContent = "✓ Added. View shopping list →";
      return;
    }
    const mu = e.target.closest("[data-mult]");
    if (mu) { const id = mu.dataset.mult; cart[id] = Math.max(1, Math.min(6, (cart[id] || 1) + Number(mu.dataset.d))); saveCart(); route(); return; }
    const rm = e.target.closest("[data-rm]");
    if (rm) { delete cart[rm.dataset.rm]; saveCart(); route(); return; }
    const act = e.target.closest("[data-act]");
    if (act) {
      const a = act.dataset.act;
      if (a === "clear" && confirm("Clear the whole shopping list?")) { cart = {}; checked = new Set(); store.set("safe-table-checked", []); saveCart(); route(); }
      if (a === "uncheck") { checked = new Set(); store.set("safe-table-checked", []); route(); }
      if (a === "copy") {
        const t = listAsText();
        (navigator.clipboard?.writeText(t) || Promise.reject()).then(() => { act.textContent = "✓ Copied"; }, () => { prompt("Copy your list:", t); });
      }
      return;
    }
    const j = e.target.closest("[data-jump]");
    if (j) { e.preventDefault(); document.getElementById("g-" + j.dataset.jump)?.scrollIntoView({ behavior: "smooth" }); return; }
    if (e.target.closest(".nav-toggle")) {
      const nav = document.getElementById("nav");
      nav.classList.toggle("open");
      e.target.setAttribute("aria-expanded", nav.classList.contains("open"));
    }
  });
  document.addEventListener("submit", e => {
    const f = e.target;
    if (f.id === "home-search") { e.preventDefault(); location.hash = "#/search?q=" + encodeURIComponent(f.q.value.trim()); }
    if (f.id === "cat-search") {
      e.preventDefault();
      const p = new URLSearchParams((location.hash.split("?")[1]) || "");
      f.q.value.trim() ? p.set("q", f.q.value.trim()) : p.delete("q");
      location.hash = `#/c/${f.dataset.cat}${p.toString() ? "?" + p : ""}`;
    }
  });
  document.addEventListener("change", e => {
    const c = e.target.closest("[data-check]");
    if (!c) return;
    c.checked ? checked.add(c.dataset.check) : checked.delete(c.dataset.check);
    store.set("safe-table-checked", [...checked]);
    c.closest(".li")?.classList.toggle("done", c.checked);
  });
  window.addEventListener("hashchange", route);
  updateSavedCount();
  updateCartCount();
  route();
})();
