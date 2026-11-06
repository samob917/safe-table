# Yummy Food

A hand-picked collection of free recipes from across the web that are free of **egg, wheat, gluten, barley, dairy, tree nuts, peanuts and shellfish**, or need only one easy swap (noted on every recipe). Grouped by meal, with date-night and entertaining menus, a swap guide, and an auto-combining shopping list.

All recipes belong to their original authors; this site links to them. Always read labels.

Static site: open `index.html`, or visit the GitHub Pages URL.

## Updating
Add recipes to `tools/recipes/*.json`, then run `python3 tools/build.py`, `tools/fetch_ing.py`, `tools/fetch_media.py`, `tools/build.py` again, then `tools/process_ing.py`. Menus live in `data/plans.js`.
