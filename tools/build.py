import json, re, glob, sys, collections
from urllib.parse import urlparse

SRC = "/Users/samob917/safe-table/tools/recipes/*.json"
OUT = "/Users/samob917/safe-table/data/recipes.js"

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("&", "and")).strip("-")

import os
MEDIA = json.load(open(os.path.dirname(SRC.replace("recipes/*.json","")) + "/media.json")) if os.path.exists(SRC.replace("recipes/*.json","media.json")) else {}
recipes, seen, ids = [], set(), set()
for f in sorted(glob.glob(SRC)):
    try:
        data = json.load(open(f))
    except Exception as e:
        print("BAD JSON", f, e); continue
    for r in data:
        url = (r.get("url") or "").strip()
        key = url.rstrip("/").lower().replace("http://", "https://").replace("www.", "")
        if not url or key in seen:
            print("dup/skip:", r.get("title"), "|", f.split("/")[-1]); continue
        seen.add(key)
        rid = slug(r["title"])[:60]
        base, n = rid, 2
        while rid in ids:
            rid = f"{base}-{n}"; n += 1
        ids.add(rid)
        r["id"] = rid
        r["tags"] = [t.strip().lower() for t in r.get("tags", []) if t.strip()]
        r["difficulty"] = (r.get("difficulty") or "").lower()
        recipes.append({k: r.get(k, "") for k in ["id","title","url","site","category","subcategory","time","serves","description","swaps","watch","tags","difficulty"]})
        m = MEDIA.get(rid, {})
        recipes[-1]["img"] = m.get("img") or ""
        recipes[-1]["print"] = m.get("print") or ""
        for fld in ("time","serves"):
            if str(recipes[-1][fld]).lower().startswith("not listed"): recipes[-1][fld] = ""

with open(OUT, "w") as fh:
    fh.write("window.RECIPES = " + json.dumps(recipes, indent=1, ensure_ascii=False) + ";\n")

print("total", len(recipes))
print("by category", collections.Counter(r["category"] for r in recipes))
sites = collections.Counter(r["site"] for r in recipes)
print("sites", len(sites))
print("top sites", sites.most_common(12))
hosts = collections.Counter(urlparse(r["url"]).netloc.replace("www.","") for r in recipes)
print("hosts", len(hosts))
