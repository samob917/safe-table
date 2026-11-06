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
    { key: "pasta",      name: "Pasta & Noodles", short: "Pasta", emoji: "🍝", blurb: "Gluten-free pasta and rice noodles: Italian classics, creamy bakes without the dairy, Asian noodles, and homemade pasta and gnocchi." },
    { key: "sides",      name: "Sides",      emoji: "🥔", blurb: "Vegetables, potatoes, grains and salads to round out a plate." },
    { key: "appetizers", name: "Appetizers & Party Food", short: "Appetizers", emoji: "🫒", blurb: "Dips, bites and finger food for a crowd." },
    { key: "snacks",     name: "Snacks",     emoji: "🍿", blurb: "Bites, bars and crunchy things for between meals." },
    { key: "breads",     name: "Breads & Baking", short: "Breads", emoji: "🍞", blurb: "Yeast breads, muffins, quick breads, biscuits and pizza." },
    { key: "desserts",   name: "Desserts",   emoji: "🍰", blurb: "Cookies, cakes, pies, mousse and celebration-worthy sweets." },
    { key: "staples",    name: "Staples & Meal Prep", short: "Staples", emoji: "🫙", blurb: "Make-ahead basics to keep on hand: pasta, rice, doughs, sauces, broths, baking basics and batch-cooked proteins, each with how long it keeps." },
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
    const st = r.storage && (r.storage.fridge || r.storage.freezer);
    const meta = [r.time && `⏱ ${esc(r.time)}`, r.serves && `🍽 ${esc(r.serves)}`, st && `🧊 Fridge ${esc(r.storage.fridge || "–")} · Freezer ${esc(r.storage.freezer || "–")}`].filter(Boolean).map(m => `<span>${m}</span>`).join("");
    return `<article class="card">
      <a class="card-img" href="#/r/${esc(r.id)}" aria-hidden="true" tabindex="-1">${photo(r)}</a>
      ${opts.course ? `<div class="course-label">${esc(opts.course)}</div>` : ""}
      <button class="save" data-id="${esc(r.id)}" aria-pressed="${isSaved}" aria-label="Save recipe" title="Save">${isSaved ? "♥" : "♡"}</button>
      <h3><a href="#/r/${esc(r.id)}">${esc(r.title)}</a></h3>
      <div class="site">${esc(r.site)}</div>
      <div class="meta">${meta}</div>
      <p class="desc">${esc(r.description)}</p>
      ${opts.note ? `<div class="note ok"><b>For this menu:</b> ${esc(opts.note)}</div>` : ""}
      ${notes.join("")}
      <div class="tags">${tags}</div>
      <div class="card-actions">
        <span class="diff ${esc(r.difficulty)}">${esc(r.difficulty || "")}</span>
        ${ING[r.id] ? `<button class="add-list" data-id="${esc(r.id)}" aria-pressed="${inCart}" title="Add ingredients to shopping list">${inCart ? "✓ On list" : "+ List"}</button>` : ""}
        <a class="go" href="#/r/${esc(r.id)}">View recipe →</a>
      </div>
    </article>`;
  }

  function photo(r, cls = "") {
    const c = catByKey[r.category] || {};
    const fallback = `<span class="ph-fallback ${cls}">${c.emoji || "🍽️"}</span>`;
    if (!r.img) return fallback;
    return `<img class="${cls}" src="${esc(r.img)}" alt="${esc(r.title)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='${fallback.replace(/"/g, "&quot;")}'">`;
  }

  function storageFor(r) {
    if (r.storage && (r.storage.fridge || r.storage.freezer || r.storage.room)) return { ...r.storage, general: false };
    const role = roleOf(r), sc = (r.subcategory || "").toLowerCase();
    const g = (room, fridge, freezer, tips) => ({ room, fridge, freezer, tips, general: true });
    if (r.category === "desserts") {
      if (sc.includes("cookie")) return g("Up to 1 week, airtight", "", "3 months", "Freeze baked cookies or balls of dough.");
      if (sc.includes("cake")) return g("1–2 days, covered", "Up to 5 days", "3 months (unfrosted layers wrap best)", "Frosted cakes keep best in the fridge.");
      if (sc.includes("frozen") || sc.includes("mousse") || sc.includes("pudding")) return g("", "3–4 days (mousse and pudding)", "1–2 months (ice cream and sorbet)", "Keep covered so they don't pick up fridge smells.");
      if (sc.includes("pie") || sc.includes("tart") || sc.includes("crisp")) return g("Fruit pies and crisps: 1–2 days", "3–4 days", "2–3 months (fruit pies)", "Custard, pumpkin and cream pies always go in the fridge.");
      return g("Up to 1 week, airtight", "1–2 weeks", "2–3 months", "");
    }
    if (role === "bread" || role === "breakfast-bake" || r.category === "breads") return g("2–3 days, wrapped", "Not recommended (GF bread stales faster)", "3 months, sliced", "Freeze sliced, then toast or warm straight from the freezer.");
    if (role === "snack") return g("Up to 1 week, airtight", "1–2 weeks (energy bites and bars)", "2–3 months", "");
    if (role === "salad") return g("", "3–5 days undressed, 1 day once dressed", "Not recommended", "Store the dressing separately.");
    return g("Max 2 hours", "3–4 days", "2–3 months", "Cool quickly, store airtight, and reheat to 165°F.");
  }
  function storageBox(r) {
    const s = storageFor(r);
    const row = (k, v) => v ? `<div><span>${k}</span><b>${esc(v)}</b></div>` : "";
    return `<div class="storage"><h3>How long it keeps</h3><div class="recipe-facts">${row("Counter", s.room)}${row("Fridge", s.fridge)}${row("Freezer", s.freezer)}</div>
      ${s.tips ? `<p class="small">${esc(s.tips)}</p>` : ""}
      <p class="muted small">${s.general ? "General guideline for this kind of dish (FDA and university food-safety extension guidance). The author's notes may differ." : s.source === "recipe" ? "From the recipe author's storage notes." : "Based on FDA and university food-safety extension guidance."} <a href="#/storage">Full storage chart →</a></p></div>`;
  }

  function viewRecipe(id) {
    const r = byId[id];
    if (!r) return viewNotFound();
    setTitle(r.title);
    const c = catByKey[r.category];
    const ings = ING[id] || [];
    const inCart = !!cart[id];
    const menus = PLANS.filter(p => p.menu.some(m => m.id === id));
    const related = RECIPES.filter(x => x.id !== id && x.category === r.category && x.subcategory === r.subcategory).slice(0, 3);
    const ingRow = (i, n) => {
      const warns = (i.w || "").split(" · ").filter(Boolean);
      return `<li class="ing">
        <input type="checkbox" id="ing-${n}"><label for="ing-${n}">
          <span class="ing-line">${esc(i.r)}</span>
          ${i.b ? `<span class="ing-swap">→ Use: <b>${esc(i.b)}</b></span>` : ""}
          ${warns.map(w => `<span class="ing-warn">⚠ ${esc(w)}</span>`).join("")}
        </label></li>`;
    };
    return `
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/c/${r.category}">${esc(c?.name || r.category)}</a> / ${esc(r.title)}</div>
      <article class="recipe">
        <header class="recipe-head">
          <div class="recipe-photo">${photo(r, "big")}</div>
          <div class="recipe-intro">
            <div class="course-label">${esc(r.subcategory || "")}</div>
            <h1>${esc(r.title)}</h1>
            <p class="by">Recipe by <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.site)}</a></p>
            <div class="recipe-facts">
              ${r.time ? `<div><span>Time</span><b>${esc(r.time)}</b></div>` : ""}
              ${r.serves ? `<div><span>Makes</span><b>${esc(r.serves)}</b></div>` : ""}
              ${r.difficulty ? `<div><span>Level</span><b class="diff ${esc(r.difficulty)}">${esc(r.difficulty)}</b></div>` : ""}
            </div>
            <p class="desc">${esc(r.description)}</p>
            <div class="recipe-actions no-print">
              ${r.print ? `<a class="btn" href="${esc(r.print)}" target="_blank" rel="noopener">🖨 Author's print version (with steps) ↗</a>` : `<a class="btn" href="${esc(r.url)}" target="_blank" rel="noopener">Full recipe & steps on ${esc(r.site)} ↗</a>`}
              <a class="btn ghost" href="#/build?mode=${["breakfast-main","breakfast-side","breakfast-bake"].includes(roleOf(r)) ? "brunch" : "dinner"}&with=${esc(r.id)}">🍽 Build a meal around this</a>
              <button class="btn ghost" onclick="window.print()">Print this card</button>
              ${ings.length ? `<button class="btn ghost add-list" data-id="${esc(r.id)}" aria-pressed="${inCart}">${inCart ? "✓ On list" : "+ List"}</button>` : ""}
              <button class="btn ghost save-inline save" data-id="${esc(r.id)}" aria-pressed="${saved.has(id)}">${saved.has(id) ? "♥" : "♡"}</button>
            </div>
          </div>
        </header>

        <div class="recipe-body">
          <section class="recipe-ings">
            <h2>Ingredients</h2>
            ${r.swaps ? `<div class="note swap"><b>Swap:</b> ${esc(r.swaps)}</div>` : ""}
            ${r.watch ? `<div class="note watch"><b>Check:</b> ${esc(r.watch)}</div>` : ""}
            ${!r.swaps && !r.watch ? `<div class="note ok">✓ Safe as written</div>` : ""}
            ${ings.length ? `<p class="muted small">Exactly as the author lists them, with her safe swap shown under any line that needs one. Tick them off as you go.</p><ul class="ings">${ings.map(ingRow).join("")}</ul>`
              : `<p class="muted">The ingredient list isn't available here. <a href="${esc(r.url)}" target="_blank" rel="noopener">See it on ${esc(r.site)} ↗</a></p>`}
          </section>
          <aside class="recipe-side">
            <h2>Method</h2>
            <p>The step-by-step method is on ${esc(r.site)}${r.print ? `. Their <b>print version</b> is a clean, ad-free page with every step` : ""}.</p>
            <p class="no-print"><a class="btn" href="${esc(r.print || r.url)}" target="_blank" rel="noopener">${r.print ? "Open print version ↗" : "Open recipe ↗"}</a></p>
            <p class="print-only small">Method: ${esc(r.print || r.url)}</p>
            ${r.print ? `<p class="no-print small"><a href="${esc(r.url)}" target="_blank" rel="noopener">Or read the full post with photos and tips ↗</a></p>` : ""}
            ${storageBox(r)}
            ${menus.length ? `<h3>Part of these menus</h3><ul class="tips">${menus.map(p => `<li><a href="#/plan/${esc(p.id)}">${esc(p.title)}</a></li>`).join("")}</ul>` : ""}
            ${(r.tags || []).length ? `<div class="tags">${r.tags.map(t => `<a class="tag" href="#/c/${r.category}?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
          </aside>
        </div>
      </article>
      ${related.length ? `<div class="no-print"><h2 class="group-title">More ${esc((r.subcategory || "").toLowerCase())}</h2><div class="grid">${related.map(x => card(x)).join("")}</div></div>` : ""}`;
  }

  function planCard(p) {
    const items = p.menu.map(m => {
      const r = byId[m.id];
      return r ? `<li><span>${esc(m.course)}</span>${esc(r.title)}</li>` : "";
    }).join("");
    return `<a class="plan-card" href="#/plan/${esc(p.id)}">
      <div class="band"><div class="k">${p.type === "two" ? "Dinner for two" : p.type === "go" ? "On the go · " + esc(p.serves) : "Entertaining · serves " + esc(p.serves)}</div>
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
        ${CATS.filter(c => RECIPES.some(r => r.category === c.key)).map(c => `<a class="tile" href="#/c/${c.key}"><span class="emoji">${c.emoji}</span><b>${esc(c.short || c.name)}</b><span class="count">${RECIPES.filter(r => r.category === c.key).length} recipes</span></a>`).join("")}
        <a class="tile" href="#/build"><span class="emoji">🍽</span><b>Build a meal</b><span class="count">pick one dish, get a whole menu</span></a>
        <a class="tile" href="#/swaps"><span class="emoji">🔁</span><b>Swap guide</b><span class="count">eggs, flour, butter, milk…</span></a>
      </div>
      <div class="collections">
        <a class="collection" href="#/collection/gourmet"><span>✨</span><div><b>Gourmet & Project Cooking</b><p>Braises, roasts, elegant fish, showpiece desserts and weekend bakes.</p></div></a>
        <a class="collection" href="#/collection/fun"><span>🎉</span><div><b>Fun Food Nights</b><p>Takeout-at-home, street food, dumpling night, build-your-own bars.</p></div></a>
      </div>
      <div class="section-head"><h2>Dinner for two</h2><a href="#/plans#two">All date-night menus →</a></div>
      <div class="plan-grid">${two.map(planCard).join("")}</div>
      <div class="section-head"><h2>Entertaining</h2><a href="#/plans#entertain">All party menus →</a></div>
      <div class="plan-grid">${ent.map(planCard).join("")}</div>
      ${PLANS.some(p => p.type === "go") ? `<div class="section-head"><h2>On the go</h2><a href="#/plans#go">Picnics, road trips & rentals →</a></div>
      <div class="plan-grid">${PLANS.filter(p => p.type === "go").slice(0, 3).map(planCard).join("")}</div>` : ""}`;
  }

  function viewCategory(key, params) {
    const c = catByKey[key];
    if (!c) return viewNotFound();
    setTitle(c.name);
    const BASIC_BREAD = /bagel|english muffin|tortilla|pizza|sandwich|vegan (gluten free )?bread|psyllium|loaf|naan|flatbread|buns?\b|rolls?\b|biscuit|focaccia|sourdough|cracker|pretzel|pita/i;
    const SWEET = /cinnamon|banana|pumpkin|zucchini|apple|chocolate|blueberry|cranberry|muffins?$|scone/i;
    const PASTA = /pasta|spaghetti|fusilli|penne|rigatoni|linguine|noodle|japchae|\bpho\b|vermicelli|ramen|gnocchi|lasagna|ziti|mac and cheese|mac & cheese|macaroni|bolognese|ravioli/i;
    const QUICK = /bread|muffin|loaf|scone|roll|coffee cake|doughnut|donut/i;
    let list = RECIPES.filter(r => r.category === key);
    if (key === "staples") list = [...list, ...RECIPES.filter(r => r.category === "breads" && BASIC_BREAD.test(r.title) && (!SWEET.test(r.title) || /english/i.test(r.title))).map(r => ({ ...r, subcategory: "Doughs & Breads" }))];
    if (key === "pasta") list = [...list, ...RECIPES.filter(r => ["dinner", "lunch", "sides"].includes(r.category) && PASTA.test(r.title)).map(r => ({ ...r, subcategory: /noodle|japchae|pho|vermicelli|ramen/i.test(r.title) ? "Asian Noodles" : /salad/i.test(r.title) ? "Noodle Salads" : "Italian Classics" }))];
    if (key === "breakfast") list = [...list, ...RECIPES.filter(r => r.category === "breads" && (["breakfast-bake"].includes(r.role) || (QUICK.test(r.title) && SWEET.test(r.title)))).map(r => ({ ...r, subcategory: "Muffins & Quick Breads" }))];
    { const seen = new Set(); list = list.filter(r => !seen.has(r.id) && seen.add(r.id)); }
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
        <p>${esc(c.blurb)} ${list.length} recipes from ${new Set(list.map(r => r.site)).size} different sites.${key === "staples" ? ` <a href="#/storage">See the full storage chart →</a>` : ""}</p>
        ${key === "staples" && !RECIPES.some(r => r.category === "staples") ? `<div class="callout">Coming very soon: sauces & dressings, how to cook every kind of rice, broths, baking basics (DIY flour blend, buttermilk, coconut whip) and meal-prep proteins, each with fridge and freezer times. The dough and bread basics are below.</div>` : ""}
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
    const go = PLANS.filter(p => p.type === "go");
    return `
      <div class="page-head">
        <div class="crumbs"><a href="#/">Home</a> / Menus</div>
        <h1>Menus for an occasion</h1>
        <p>Complete menus built from the recipes on this site, each with a game plan so everything lands on the table at the right time. Every course is safe for all eight allergens.</p>
      </div>
      <h2 class="group-title" id="g-two">❤️ Dinner for two <small>${two.length}</small></h2>
      <div class="plan-grid">${two.map(planCard).join("")}</div>
      <h2 class="group-title" id="g-entertain">🎉 Entertaining <small>${ent.length}</small></h2>
      <div class="plan-grid">${ent.map(planCard).join("")}</div>
      ${go.length ? `<h2 class="group-title" id="g-go">🧺 On the go <small>${go.length}</small></h2>
      <p class="muted">Picnics, road trips and vacation rentals, where you can't count on finding anything safe once you leave home. Each comes with a packing list.</p>
      <div class="plan-grid">${go.map(planCard).join("")}</div>` : ""}`;
  }

  function viewPlan(id) {
    const p = PLANS.find(x => x.id === id);
    if (!p) return viewNotFound();
    setTitle(p.title);
    return `
      <div class="crumbs"><a href="#/">Home</a> / <a href="#/plans">Menus</a> / ${esc(p.title)}</div>
      <section class="plan-hero">
        <div class="course-label">${p.type === "two" ? "Dinner for two" : p.type === "go" ? "On the go" : "Entertaining"}</div>
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
          ${p.packing?.length ? `<h3>Packing list</h3><ul class="pack">${p.packing.map((t, i) => `<li><input type="checkbox" id="pk-${i}"><label for="pk-${i}">${esc(t)}</label></li>`).join("")}</ul>` : ""}
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
    const picks = (window.WFM_PICKS || []).map(p => `<tr><td><a href="${wfmUrl(p.search)}" target="_blank" rel="noopener">${esc(p.picks.join(" · "))} ↗</a></td><td>${esc(p.avoid)}</td></tr>`).join("");
    const wfm = picks ? `<div class="guide" style="margin-top:18px"><section class="guide-sec" id="g-wfm"><h2>🛒 Safe picks at Whole Foods</h2>
      <p>Specific products we checked against her eight allergens using Whole Foods' own listings. Click one to search it at your store. "Facility" notes matter if she reacts to cross-contact; ask her allergist how strict to be.</p>
      <div class="table-scroll"><table><tr><th>Buy</th><th>Avoid</th></tr>${picks}</table></div></section></div>` : "";
    return (window.SWAPS_HTML || "") + wfm;
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
    const warns = [...it.warns];
    return `<li class="li ${isChecked ? "done" : ""}">
      <input type="checkbox" id="${id}" data-check="${esc(it.key)}" ${isChecked ? "checked" : ""}>
      <label for="${id}">
        <span class="li-name">${esc(it.name)}</span>
        <span class="li-amt">${esc(fmtAmount(it.entries))}</span>
        ${it.orig.size ? `<span class="li-sub">recipe lists: ${esc([...it.orig].join(", "))}</span>` : ""}
        ${warns.length ? `<span class="li-warn">⚠ ${esc(warns.join(" · "))}</span>` : ""}
        ${pick ? `<span class="li-pick">✓ Safe pick at Whole Foods: ${pick.picks.map(esc).join(" · ")}</span>` : ""}
        ${pick && pick.avoid ? `<span class="li-warn">✕ Avoid: ${esc(pick.avoid)}</span>` : ""}
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

  // ---------- meal builder ----------
  const CUISINE_GROUPS = {
    Asian: ["Thai", "Chinese", "Japanese", "Korean", "Vietnamese"],
    Latin: ["Mexican", "Latin American", "Caribbean"],
    Med: ["Mediterranean", "Middle Eastern", "Italian", "French", "Spanish"],
    Anglo: ["American", "British", "Global"],
    Indian: ["Indian"],
  };
  const groupOf = c => Object.keys(CUISINE_GROUPS).find(g => CUISINE_GROUPS[g].includes(c)) || "Anglo";
  function roleOf(r) {
    if (r.role) return r.role;
    const sc = (r.subcategory || "").toLowerCase();
    if (r.category === "dinner") return "main";
    if (r.category === "lunch") return sc.includes("soup") ? "soup" : sc.includes("salad") ? "salad" : "main";
    if (r.category === "appetizers") return "starter";
    if (r.category === "sides") return sc.includes("salad") ? "salad" : sc.includes("potato") || sc.includes("grain") ? "side-starch" : "side-veg";
    if (r.category === "breads") return /muffin|scone|sweet|cinnamon/.test(sc + r.title.toLowerCase()) ? "breakfast-bake" : "bread";
    if (r.category === "desserts") return "dessert";
    if (r.category === "breakfast") return sc.includes("baked") ? "breakfast-bake" : "breakfast-main";
    return "snack";
  }
  const PROTEINS = {
    chicken: /chicken|poultry|turkey|duck/, beef: /beef|steak|short rib|carne|burger|brisket/, pork: /pork|bacon|sausage|carnitas|ham\b/,
    lamb: /lamb/, fish: /fish|salmon|cod|tuna|halibut|trout|tilapia|sea bass|swordfish/, veg: /vegetarian|vegan|tofu|tempeh|lentil|chickpea|bean/,
  };
  const proteinOf = r => {
    const h = [r.title, r.subcategory, ...(r.tags || [])].join(" ").toLowerCase();
    return Object.keys(PROTEINS).find(p => p !== "veg" && PROTEINS[p].test(h)) || (PROTEINS.veg.test(h) ? "veg" : "");
  };
  const MOODS = {
    "date-night": { label: "Date night", tags: ["date-night", "dinner-party"] },
    weeknight: { label: "Quick weeknight", tags: ["weeknight", "quick", "one-pan", "easy"] },
    cozy: { label: "Cozy comfort", tags: ["comfort", "slow-cooker", "fall", "winter", "make-ahead"] },
    crowd: { label: "Feeding a crowd", tags: ["crowd", "make-ahead", "party", "game-day"] },
    light: { label: "Light & fresh", tags: ["summer", "spring", "quick"] },
    grill: { label: "Grill night", tags: ["grill", "summer"] },
  };
  const CUISINE_CHIPS = { Italian: ["Italian"], Mexican: ["Mexican", "Latin American"], Asian: CUISINE_GROUPS.Asian, Indian: ["Indian"], Mediterranean: ["Mediterranean", "Middle Eastern", "Spanish"], American: ["American", "British"], French: ["French"], Caribbean: ["Caribbean"] };
  const nowSeason = (() => { const m = new Date().getMonth(); return m < 2 || m === 11 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "fall"; })();

  function score(x, ctx) {
    let s = Math.random() * 2;
    const anchorC = ctx.cuisine;
    if (anchorC && x.cuisine) {
      if (x.cuisine === anchorC) s += 4;
      else if (groupOf(x.cuisine) === groupOf(anchorC)) s += 2;
      else if (x.cuisine === "Global" || x.cuisine === "American") s += 0.5;
      else s -= 1.5;
    }
    const tags = x.tags || [];
    if (ctx.moodTags) s += 2 * tags.filter(t => ctx.moodTags.includes(t)).length;
    if (ctx.weeknight) { if (x.difficulty === "involved") s -= 4; if (x.difficulty === "easy") s += 1; }
    const season = x.season || [];
    if (season.includes(nowSeason)) s += 1; else if (season.length && !season.includes("all")) s -= 1;
    if (ctx.heavy && x.weight === "hearty") s -= 2;
    if (ctx.heavy && x.weight === "light") s += 1;
    return s;
  }
  function slotOk(x, ctx) {
    if (roleOf(x) !== "bread") return true;
    const t = x.title.toLowerCase();
    if (/pizza|bagel|english muffin|cracker|pretzel|tortilla chip|banana|pumpkin|zucchini|cinnamon|raisin|apple|muffin|scone|chocolate/.test(t)) return false;
    if (/tortilla|naan|flatbread|pita|arepa|pupusa|chapati|roti/.test(t)) return !!ctx.cuisine && !!x.cuisine && groupOf(x.cuisine) === groupOf(ctx.cuisine);
    return true;
  }
  function pick(pool, ctx, exclude) {
    const cands = pool.filter(x => !exclude.has(x.id) && slotOk(x, ctx)).map(x => [score(x, ctx), x]).sort((a, b) => b[0] - a[0]).slice(0, 6);
    if (!cands.length) return null;
    return cands[Math.floor(Math.random() * Math.min(cands.length, 4))][1];
  }

  let meal = store.get("safe-table-meal", null);   // {mode, slots: [{slot, id, locked}], anchor, opts}
  const SLOTS_DINNER = [
    { slot: "starter", label: "Starter", roles: ["starter", "soup", "salad"] },
    { slot: "main", label: "Main", roles: ["main"] },
    { slot: "starch", label: "Side", roles: ["side-starch"] },
    { slot: "veg", label: "Side", roles: ["side-veg", "salad"] },
    { slot: "bread", label: "Bread", roles: ["bread"] },
    { slot: "dessert", label: "Dessert", roles: ["dessert"] },
  ];
  const SLOTS_BRUNCH = [
    { slot: "main", label: "Main", roles: ["breakfast-main"] },
    { slot: "side", label: "Side", roles: ["breakfast-side", "side-starch"] },
    { slot: "bake", label: "From the oven", roles: ["breakfast-bake", "bread"] },
    { slot: "sweet", label: "Something sweet", roles: ["breakfast-main", "dessert"] },
  ];

  function buildMeal(opts, prev) {
    const mode = opts.mode || "dinner";
    const defs = mode === "brunch" ? SLOTS_BRUNCH : SLOTS_DINNER;
    const anchor = opts.with ? byId[opts.with] : null;
    const pool = role => RECIPES.filter(r => role.includes(roleOf(r)));
    const exclude = new Set();
    const result = [];
    const locked = Object.fromEntries((prev?.slots || []).filter(s => s.locked && s.id).map(s => [s.slot, s.id]));
    const ctx = { moodTags: MOODS[opts.mood]?.tags, weeknight: opts.mood === "weeknight" };

    // 1) choose main
    let main = locked.main ? byId[locked.main] : null;
    const anchorRole = anchor ? roleOf(anchor) : "";
    const anchorSlot = anchor ? (defs.find(d => d.roles.includes(anchorRole)) || {}).slot : null;
    if (!main && anchor && anchorSlot === "main") main = anchor;
    if (!main) {
      let mains = pool(defs.find(d => d.slot === "main").roles);
      if (opts.protein) mains = mains.filter(r => proteinOf(r) === opts.protein);
      if (opts.cuisine) mains = mains.filter(r => CUISINE_CHIPS[opts.cuisine]?.includes(r.cuisine));
      const mctx = { ...ctx, cuisine: anchor?.cuisine };
      main = pick(mains.length ? mains : pool(["main"]), mctx, exclude);
    }
    if (main) exclude.add(main.id);
    const inc = main?.includes || [];
    ctx.cuisine = main?.cuisine || anchor?.cuisine;
    ctx.heavy = main?.weight === "hearty";

    for (const d of defs) {
      if (d.slot === "main") { result.push({ ...d, id: main?.id, locked: !!locked.main || (anchor && anchor.id === main?.id) }); continue; }
      if (opts.skip?.includes(d.slot)) continue;
      if (mode === "dinner" && d.slot === "starch" && inc.includes("starch") && !(anchor && anchorSlot === "starch")) continue;
      if (mode === "dinner" && d.slot === "veg" && inc.includes("veg") && !(anchor && anchorSlot === "veg")) { /* keep a salad instead */ }
      let r = locked[d.slot] ? byId[locked[d.slot]] : null;
      let isLocked = !!r;
      if (!r && anchor && anchorSlot === d.slot && !exclude.has(anchor.id)) { r = anchor; isLocked = true; }
      if (!r) {
        let roles = d.roles;
        if (d.slot === "veg" && inc.includes("veg")) roles = ["salad"];
        if (d.slot === "starter" && ctx.heavy) roles = ["salad", "starter", "soup"];
        r = pick(pool(roles), ctx, exclude);
      }
      if (r) { exclude.add(r.id); result.push({ ...d, id: r.id, locked: isLocked }); }
    }
    return { mode, opts, slots: result.map(({ slot, label, id, locked }) => ({ slot, label, id, locked })) };
  }

  function shuffleSlot(slot) {
    if (!meal) return;
    const s = meal.slots.find(x => x.slot === slot);
    if (!s) return;
    const defs = meal.mode === "brunch" ? SLOTS_BRUNCH : SLOTS_DINNER;
    const d = defs.find(x => x.slot === slot);
    const used = new Set(meal.slots.map(x => x.id));
    const main = byId[meal.slots.find(x => x.slot === "main")?.id];
    let roles = d.roles;
    if (slot === "main") {
      let mains = RECIPES.filter(r => roles.includes(roleOf(r)));
      if (meal.opts.protein) mains = mains.filter(r => proteinOf(r) === meal.opts.protein);
      if (meal.opts.cuisine) mains = mains.filter(r => CUISINE_CHIPS[meal.opts.cuisine]?.includes(r.cuisine));
      const r = pick(mains, { moodTags: MOODS[meal.opts.mood]?.tags }, used);
      if (r) s.id = r.id;
    } else {
      const ctx = { cuisine: main?.cuisine, heavy: main?.weight === "hearty", moodTags: MOODS[meal.opts.mood]?.tags, weeknight: meal.opts.mood === "weeknight" };
      const r = pick(RECIPES.filter(x => roles.includes(roleOf(x))), ctx, used);
      if (r) s.id = r.id;
    }
    s.locked = false;
    store.set("safe-table-meal", meal);
  }

  function viewBuild(params) {
    setTitle("Build a meal");
    const opts = {
      mode: params.get("mode") || "dinner",
      with: params.get("with") || "",
      protein: params.get("protein") || "",
      cuisine: params.get("cuisine") || "",
      mood: params.get("mood") || "",
      skip: (params.get("skip") || "").split(",").filter(Boolean),
    };
    const sig = JSON.stringify(opts);
    if (!meal || meal.sig !== sig) {
      meal = { ...buildMeal(opts, meal && meal.sig === sig ? meal : null), sig };
      store.set("safe-table-meal", meal);
    }
    const link = (k, v) => {
      const p = new URLSearchParams(params); p.delete("go");
      if (v === null || p.get(k) === v) p.delete(k); else p.set(k, v);
      return "#/build?" + p.toString();
    };
    const chip = (k, v, label) => `<a class="filter-btn" href="${link(k, v)}" aria-pressed="${opts[k] === v}">${esc(label)}</a>`;
    const anchor = byId[opts.with];
    const toggleSkip = s => { const set = new Set(opts.skip); set.has(s) ? set.delete(s) : set.add(s); return link("skip", [...set].join(",") || null); };
    const slotsAvail = opts.mode === "brunch" ? [] : [["starter", "Starter"], ["starch", "Starch side"], ["veg", "Veg side"], ["bread", "Bread"], ["dessert", "Dessert"]];
    const main = byId[meal.slots.find(s => s.slot === "main")?.id];
    return `
      <div class="page-head"><div class="crumbs"><a href="#/">Home</a> / Build a meal</div>
        <h1>🍽 Build a meal</h1>
        <p>Pick a starting point and we'll put together a full menu that goes together: matching cuisine, balanced richness, right for the season. Shuffle any course you don't love, or lock the ones you do.</p>
      </div>
      <section class="builder">
        <div class="builder-row"><span class="filter-label">Meal</span>
          <a class="filter-btn" href="${link("mode", "dinner")}" aria-pressed="${opts.mode === "dinner"}">Dinner</a>
          <a class="filter-btn" href="${link("mode", "brunch")}" aria-pressed="${opts.mode === "brunch"}">Brunch</a>
        </div>
        <div class="builder-row"><span class="filter-label">Start with a dish</span>
          <form id="anchor-form" class="anchor-form">
            <input list="recipe-names" name="dish" placeholder="Type any recipe, e.g. “short ribs”, “lemon bars”…" value="${anchor ? esc(anchor.title) : ""}" aria-label="Choose a recipe to build around">
            <datalist id="recipe-names">${RECIPES.map(r => `<option value="${esc(r.title)}">`).join("")}</datalist>
            ${anchor ? `<a class="filter-btn" href="${link("with", null)}">✕ clear</a>` : ""}
          </form>
        </div>
        ${opts.mode === "dinner" ? `
        <div class="builder-row"><span class="filter-label">…or a protein</span>
          ${chip("protein", "chicken", "🍗 Chicken")}${chip("protein", "beef", "🥩 Beef")}${chip("protein", "pork", "🐖 Pork")}${chip("protein", "lamb", "🐑 Lamb")}${chip("protein", "fish", "🐟 Fish")}${chip("protein", "veg", "🌱 Vegetarian")}
        </div>
        <div class="builder-row"><span class="filter-label">Cuisine</span>
          ${Object.keys(CUISINE_CHIPS).map(c => chip("cuisine", c, c)).join("")}
        </div>` : ""}
        <div class="builder-row"><span class="filter-label">Mood</span>
          ${Object.entries(MOODS).map(([k, m]) => chip("mood", k, m.label)).join("")}
        </div>
        ${slotsAvail.length ? `<div class="builder-row"><span class="filter-label">Courses</span>
          ${slotsAvail.map(([s, l]) => `<a class="filter-btn" href="${toggleSkip(s)}" aria-pressed="${!opts.skip.includes(s)}">${opts.skip.includes(s) ? "＋" : "✓"} ${l}</a>`).join("")}
        </div>` : ""}
      </section>
      <div class="meal-head">
        <h2>${main ? `Your ${esc(main.cuisine && main.cuisine !== "Global" ? main.cuisine + " " : "")}${opts.mode === "brunch" ? "brunch" : "dinner"}` : "No match. Try fewer filters"}</h2>
        <div class="list-actions">
          <button class="btn" data-shuffle-all>🔀 Shuffle unlocked</button>
          <button class="btn ghost" data-meal-list>🛒 Add meal to shopping list</button>
        </div>
      </div>
      <div class="meal-grid">
        ${meal.slots.map(s => {
          const r = byId[s.id]; if (!r) return "";
          return `<div class="meal-slot">
            <div class="slot-bar"><span class="course-label">${esc(s.label)}</span>
              <span><button class="slot-btn" data-lock="${s.slot}" aria-pressed="${!!s.locked}" title="${s.locked ? "Unlock" : "Lock"}">${s.locked ? "🔒" : "🔓"}</button>
              <button class="slot-btn" data-shuffle="${s.slot}" title="Swap this course">🔀</button></span></div>
            ${card(r)}
          </div>`;
        }).join("")}
      </div>
      <p class="muted small">Pairings use each recipe's cuisine, richness, season and what's already in the main (e.g. no potato side when the main has potatoes).</p>`;
  }

  function viewStorage() {
    setTitle("Storage chart");
    const S = window.STORAGE || { rules: [], rows: [] };
    const groups = {};
    S.rows.forEach(r => (groups[r.group || "Other"] ||= []).push(r));
    const host = u => { try { return new URL(u).hostname.replace("www.", ""); } catch { return ""; } };
    return `<div class="page-head"><div class="crumbs"><a href="#/">Home</a> / <a href="#/c/staples">Staples</a> / Storage chart</div>
      <h1>🧊 How long does it keep?</h1>
      <p>Fridge and freezer times for homemade food, from FDA and university food-safety extension guidance (each row links its source). Freezer times are for best quality: frozen food stays safe indefinitely but slowly loses flavor and texture.</p></div>
      ${S.rules.length ? `<div class="guide-sec"><h2>Ground rules</h2><ul class="tips">${S.rules.map(r => `<li>${esc(r.rule)} ${r.source ? `<a class="muted small" href="${esc(r.source)}" target="_blank" rel="noopener">source</a>` : ""}</li>`).join("")}</ul></div>` : ""}
      ${Object.entries(groups).map(([g, rows]) => `<h2 class="group-title">${esc(g)}</h2>
        <div class="table-scroll guide-sec" style="padding:6px 10px"><table class="storage-table"><tr><th>Food</th><th>Counter</th><th>Fridge</th><th>Freezer</th><th>Tips</th></tr>
        ${rows.map(r => `<tr><td><b>${esc(r.food)}</b></td><td>${esc(r.room || "—")}</td><td>${esc(r.fridge || "—")}</td><td>${esc(r.freezer || "—")}</td><td class="small">${esc(r.tips || "")} ${r.source ? `<a class="muted" href="${esc(r.source)}" target="_blank" rel="noopener">(${esc(host(r.source))})</a>` : ""}</td></tr>`).join("")}
        </table></div>`).join("")}
      ${!S.rows.length ? `<div class="empty">Storage chart coming soon.</div>` : ""}`;
  }

  const COLLECTIONS = {
    gourmet: { title: "Gourmet & Project Cooking", emoji: "✨", blurb: "Restaurant-worthy dishes and weekend projects for when you want to really cook: braises, roasts, elegant fish, showpiece desserts and ambitious bakes.", test: r => (r.tags || []).some(t => ["gourmet", "project", "dinner-party"].includes(t)) },
    fun: { title: "Fun Food Nights", emoji: "🎉", blurb: "Takeout-at-home, street food, build-your-own bars and playful bakes. The recipes you make together on a Friday night.", test: r => (r.tags || []).some(t => ["fun", "takeout-fakeout", "street-food", "party", "game-day"].includes(t)) },
  };
  function viewCollection(key) {
    const c = COLLECTIONS[key];
    if (!c) return viewNotFound();
    setTitle(c.title);
    const list = RECIPES.filter(c.test);
    const groups = {};
    list.forEach(r => (groups[catByKey[r.category]?.name || r.category] ||= []).push(r));
    return `<div class="page-head"><div class="crumbs"><a href="#/">Home</a> / ${esc(c.title)}</div>
      <h1>${c.emoji} ${esc(c.title)}</h1><p>${esc(c.blurb)} ${list.length} recipes.</p></div>
      ${Object.entries(groups).map(([g, rs]) => `<h2 class="group-title">${esc(g)} <small>${rs.length}</small></h2><div class="grid">${rs.map(r => card(r)).join("")}</div>`).join("")}`;
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
    else if (parts[0] === "r") html = viewRecipe(parts[1]);
    else if (parts[0] === "build") html = viewBuild(params);
    else if (parts[0] === "storage") html = viewStorage();
    else if (parts[0] === "collection") html = viewCollection(parts[1]);
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
    if (e.target.closest("[data-shuffle-all]") && meal) { meal = { ...buildMeal(meal.opts, meal), sig: meal.sig }; store.set("safe-table-meal", meal); route(); return; }
    const sh = e.target.closest("[data-shuffle]");
    if (sh) { shuffleSlot(sh.dataset.shuffle); route(); return; }
    const lk = e.target.closest("[data-lock]");
    if (lk && meal) { const s = meal.slots.find(x => x.slot === lk.dataset.lock); s.locked = !s.locked; store.set("safe-table-meal", meal); route(); return; }
    const ml = e.target.closest("[data-meal-list]");
    if (ml && meal) { meal.slots.forEach(s => { if (ING[s.id] && !cart[s.id]) cart[s.id] = 1; }); saveCart(); ml.textContent = "✓ Added. View list →"; ml.onclick = () => location.hash = "#/list"; return; }
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
    if (f.id === "anchor-form") {
      e.preventDefault();
      const name = f.dish.value.trim().toLowerCase();
      const r = RECIPES.find(x => x.title.toLowerCase() === name) || RECIPES.find(x => x.title.toLowerCase().includes(name));
      if (!r) { f.dish.setCustomValidity("No recipe by that name"); f.dish.reportValidity(); setTimeout(() => f.dish.setCustomValidity(""), 1500); return; }
      const mode = ["breakfast-main", "breakfast-side", "breakfast-bake"].includes(roleOf(r)) ? "brunch" : "dinner";
      location.hash = `#/build?mode=${mode}&with=${encodeURIComponent(r.id)}`;
    }
    if (f.id === "cat-search") {
      e.preventDefault();
      const p = new URLSearchParams((location.hash.split("?")[1]) || "");
      f.q.value.trim() ? p.set("q", f.q.value.trim()) : p.delete("q");
      location.hash = `#/c/${f.dataset.cat}${p.toString() ? "?" + p : ""}`;
    }
  });
  document.addEventListener("change", e => {
    if (e.target.name === "dish" && RECIPES.some(r => r.title === e.target.value)) { e.target.form.requestSubmit(); return; }
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
