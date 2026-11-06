import json, re, os
D = "/Users/samob917/safe-table/tools/"
raw = json.load(open(D + "ingredients_raw.json"))
if os.path.exists(D + "ingredients_extra.json"):
    for k, v in json.load(open(D + "ingredients_extra.json")).items():
        if v: raw[k] = v

FR = {"½": .5, "⅓": 1/3, "⅔": 2/3, "¼": .25, "¾": .75, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875, "⅕": .2}
UNITS = {
    "cup": "cup", "cups": "cup", "c": "cup", "c.": "cup",
    "tablespoon": "tbsp", "tablespoons": "tbsp", "tbsp": "tbsp", "tbsp.": "tbsp", "tbs": "tbsp", "tb": "tbsp", "tbsps": "tbsp", "t": "tbsp",
    "teaspoon": "tsp", "teaspoons": "tsp", "tsp": "tsp", "tsp.": "tsp", "tsps": "tsp",
    "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb", "lb.": "lb", "lbs.": "lb",
    "ounce": "oz", "ounces": "oz", "oz": "oz", "oz.": "oz",
    "gram": "g", "grams": "g", "g": "g", "kg": "kg", "ml": "ml", "l": "l", "liter": "l",
    "can": "can", "cans": "can", "clove": "clove", "cloves": "clove", "pinch": "pinch", "dash": "dash",
    "package": "pkg", "packages": "pkg", "pkg": "pkg", "bunch": "bunch", "bunches": "bunch",
    "head": "head", "heads": "head", "stalk": "stalk", "stalks": "stalk", "sprig": "sprig", "sprigs": "sprig",
    "slice": "slice", "slices": "slice", "handful": "handful", "jar": "jar", "box": "box", "bag": "bag",
    "quart": "qt", "quarts": "qt", "pint": "pint", "stick": "stick", "sticks": "stick", "large": None,
}
WORDNUM = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "a": 1, "an": 1, "half": .5}

def num(tok):
    tok = tok.strip()
    if not tok: return None
    total = 0; found = False
    for part in tok.split():
        m = re.fullmatch(r"(\d+)?\s*([½⅓⅔¼¾⅛⅜⅝⅞⅕])", part)
        if m:
            total += (int(m.group(1)) if m.group(1) else 0) + FR[m.group(2)]; found = True; continue
        m = re.fullmatch(r"(\d+)/(\d+)", part)
        if m: total += int(m.group(1)) / int(m.group(2)); found = True; continue
        m = re.fullmatch(r"\d+(\.\d+)?", part)
        if m: total += float(part); found = True; continue
        return None
    return total if found else None

QTY_RE = re.compile(r"^((?:\d+\s+)?(?:\d+[./]\d+|\d+|[½⅓⅔¼¾⅛⅜⅝⅞⅕])(?:\s*[½⅓⅔¼¾⅛⅜⅝⅞⅕]|\s+\d+/\d+)?)(?:\s*(?:-|–|to|or)\s*((?:\d+\s+)?(?:\d+[./]\d+|\d+|[½⅓⅔¼¾⅛⅜⅝⅞⅕])))?\s*")

PREP = r"(chopped|diced|minced|sliced|grated|peeled|divided|to taste|optional|melted|softened|room temperature|at room temperature|cut|trimmed|halved|quartered|drained|rinsed|thinly|finely|roughly|freshly|packed|cooked|for |plus|see|about|or more|if|such as|e\.g|torn|crushed|juiced|zested|shredded|cubed|seeded|stemmed|patted|warmed|cold|lightly|beaten|whisked|mashed|sifted|toasted|cooled|frozen|thawed|ground$|rinsed)"
SIZE = r"^(large|small|medium|med|big|extra[- ]large|heaping|level|fresh|organic|raw|ripe|good|good quality|whole|about|scant|generous|heaped|cold|warm|hot|lukewarm|boiling|ice[- ]cold|room temperature|plain|unsweetened|pure|homemade|store[- ]bought|of|dry|dried)\s+"

def clean(s):
    s = s.replace("\xa0", " ").replace("((", "(").replace("))", ")")
    s = re.sub(r"\s+", " ", s).strip(" *•-")
    return s

def parse(line):
    s = clean(line)
    s = re.sub(r"^(one|two|three|four|five|six|a|an)\s+(?=\S)", lambda m: str(WORDNUM[m.group(1).lower()]) + " ", s, flags=re.I) if re.match(r"^(one|two|three|four|five|six)\b", s, re.I) else s
    q = None; q2 = None; unit = ""; rest = s
    m = QTY_RE.match(s)
    if m:
        q = num(m.group(1)); q2 = num(m.group(2)) if m.group(2) else None
        rest = s[m.end():]
        rest = re.sub(r"^(heaping|heaped|scant|level|generous|rounded)\s+", "", rest, flags=re.I)
        # skip "/ 65 ml" metric duplicates
        rest = re.sub(r"^/\s*\d+\s*(ml|g|grams)\b\s*", "", rest)
        # (14 oz) can
        mm = re.match(r"^\(?(\d+(?:\.\d+)?)[- ]?(oz|ounce|ml|g)\.?\)?\s+(cans?|jars?|packages?|boxes|box|bags?)\b\s*(of\s+)?", rest, re.I)
        if mm:
            unit = UNITS.get(mm.group(3).lower(), mm.group(3).lower()) + f" ({mm.group(1)} {mm.group(2)})"
            rest = rest[mm.end():]
        else:
            w = re.match(r"^([A-Za-z.]+)\b\.?\s*", rest)
            if w and w.group(1).lower() in UNITS and UNITS[w.group(1).lower()]:
                unit = UNITS[w.group(1).lower()]; rest = rest[w.end():]
                rest = re.sub(r"^of\s+", "", rest)
        rest = re.sub(r"^/\s*[\d.]+\s*[a-zA-Z]+\.?\s*", "", rest)
    name = rest
    for _ in range(4): name = re.sub(r"\([^()]*\)", "", name)
    name = re.sub(r"\(.*$", "", name).replace(")", "")
    name = name.split(" – ")[0].split(" - ")[0]
    segs = [x.strip() for x in name.split(",")]
    keep = []
    for i, seg in enumerate(segs):
        if i > 0 and (re.match(PREP, seg.lower()) or not seg): break
        keep.append(seg)
    name = ", ".join(keep).strip()
    name = re.sub(r"\b(for (garnish|serving|topping|the \w+)|to taste|optional|as needed|if needed|divided)\b.*$", "", name, flags=re.I).strip(" ,;:*")
    disp = name[:1].upper() + name[1:] if name else clean(line)
    key = name.lower()
    for _ in range(3): key = re.sub(SIZE, "", key)
    key = re.sub(r"\b(chopped|diced|minced|sliced|grated|peeled|shredded|cubed|finely|roughly|thinly|freshly|fresh)\b", "", key)
    key = re.sub(r"\s+", " ", key).strip(" ,.")
    if q2: q = q2
    if q == 0: q = None
    return q, q2, unit, disp, key

CANON = [
    (r"^(kosher |fine |coarse |flaky |fine sea |sea |himalayan |pink )?(sea )?salt$|^salt and (black )?pepper|^salt & pepper", "salt"),
    (r"(black )?pepper$", "black pepper"),
    (r"^(garlic cloves?|cloves? (of )?garlic|garlic)$", "garlic"),
    (r"^(extra[- ]virgin )?olive oil$", "olive oil"),
    (r"^(yellow |white |sweet )?onions?$", "yellow onion"),
    (r"^red onions?$", "red onion"),
    (r"^lemons?$|^lemon juice$|^juice of", "lemons"),
    (r"^limes?$|^lime juice$", "limes"),
    (r"^(pure )?vanilla( extract)?$", "vanilla extract"),
    (r"^(ground )?cinnamon$", "ground cinnamon"),
    (r"^(pure )?maple syrup$", "maple syrup"),
    (r"^(cold |warm )?water$", "water"),
    (r"^baking soda$", "baking soda"), (r"^baking powder$", "baking powder"),
    (r"^(fresh )?cilantro( leaves)?$", "cilantro"), (r"^(fresh )?parsley( leaves)?$|^flat[- ]leaf parsley$|^italian parsley$", "parsley"),
    (r"^scallions?$|^green onions?$", "green onions"),
    (r"^avocados?$", "avocado"), (r"^carrots?$", "carrots"), (r"^bananas?$", "bananas"),
    (r"^(granulated |white |cane |organic cane )sugar$|^sugar$", "granulated sugar"),
    (r"^(light |dark )?brown sugar$", "brown sugar"),
    (r"^(ground )?cumin$", "ground cumin"), (r"^(smoked )paprika$", "smoked paprika"),
    (r"^chili powder$", "chili powder"), (r"^garlic powder$", "garlic powder"), (r"^onion powder$", "onion powder"),
    (r"^(dried )?oregano$", "dried oregano"),
]
STAPLES = {"salt", "black pepper", "water", "olive oil", "baking soda", "baking powder", "garlic powder", "onion powder", "ground cinnamon", "ground cumin", "dried oregano", "chili powder", "smoked paprika", "vanilla extract", "granulated sugar", "ice", "cooking spray", "neutral oil", "oil", "avocado oil", "canola oil", "vegetable oil", "red pepper flakes", "paprika", "ground ginger", "nutmeg", "ground nutmeg", "dried thyme", "italian seasoning", "turmeric", "ground turmeric", "cayenne pepper", "bay leaves", "bay leaf", "ice water", "boiling water", "hot water", "warm water"}

AISLES = [
    ("Meat & Fish", r"chicken|beef|steak|pork|lamb|turkey|duck|bacon|sausage|salmon|cod|tilapia|fish|tuna|chuck|ribs|brisket|ground meat|halibut|trout|prosciutto|ham\b|chorizo"),
    ("Dairy-Free Fridge", r"tofu|tempeh|vegan butter|dairy[- ]free butter|plant butter|yogurt|cream cheese|non[- ]?dairy milk|nondairy milk|plant[- ]based milk|plant milk|oat milk|soy milk|rice milk|hemp milk|pea milk|almond milk|cashew milk|creamer|vegan cheese|mozzarella|parmesan|sour cream|\bmilk\b(?!.*coconut)|\bbutter\b(?!.*(sun|seed|peanut|almond|cashew|cocoa|nut))|mayo|vegenaise|hummus|miso|kimchi|sauerkraut|tortillas?|\beggs?\b"),
    ("Produce", r"onion|garlic|shallot|lemon|lime|orange|apple|banana|berr|strawberr|blueberr|raspberr|cherr(?!y tomato sauce)|peach|mango|pineapple|pear|grape|avocado|tomato(?!.*(paste|sauce|crushed|diced canned|canned))|potato|carrot|celery|kale|spinach|lettuce|romaine|cabbage|broccoli|cauliflower|zucchini|squash|pumpkin(?! puree| seeds)|cucumber|pepper(?!corn|\s*flakes)|jalape|chile|chili(?! powder| flakes| sauce)|mushroom|asparagus|green bean|brussels|beet|radish|fennel|leek|scallion|green onion|cilantro|parsley|basil|mint|dill|thyme|rosemary|sage|chive|ginger(?! ground|, ground)|lemongrass|herb|arugula|greens|corn on|eggplant|plantain|sweet potato|yam|sprouts|edamame|pitaya|dragon fruit|fig|date|kiwi|grapefruit|pomegranate|cranberr|rhubarb|okra|turnip|parsnip|bok choy|snow pea|snap pea|sugar snap|bean sprout"),
    ("Frozen", r"frozen|ice cream|peas$|frozen peas"),
    ("Baking", r"flour|starch|arrowroot|baking|yeast|xanthan|psyllium|sugar|cocoa|cacao|chocolate|chips|vanilla|extract|sprinkles|gelatin|agar|molasses|honey|maple|agave|syrup|flax|chia|oats|oat flour|cornmeal|coconut flakes|shredded coconut|powdered|confectioners|cream of tartar|marshmallow|food coloring|dates"),
    ("Spices & Seasonings", r"salt|pepper|cumin|paprika|cinnamon|nutmeg|clove|ginger|turmeric|oregano|thyme|basil|rosemary|sage|chili powder|chipotle powder|cayenne|curry powder|garam masala|coriander|cardamom|allspice|seasoning|bay lea|red pepper flakes|onion powder|garlic powder|mustard seed|fennel seed|caraway|za.atar|sumac|herbes|dill weed|nutritional yeast|bouillon|everything bagel|ranch"),
    ("Grains, Pasta & Bread", r"rice(?! vinegar| milk| paper| flour)|quinoa|pasta|spaghetti|fusilli|penne|noodle|bread|bun|baguette|tortilla|cracker|pretzel|graham|cereal|polenta|grits|millet|buckwheat|couscous|panko|breadcrumb|rice paper|cornflake|crisp"),
    ("Canned & Jarred", r"canned|can\b|broth|stock|beans|chickpea|garbanzo|lentil|coconut milk|coconut cream|tomato paste|tomato sauce|crushed tomatoes|diced tomatoes|salsa|pumpkin puree|olives|capers|artichoke|aquafaba|split pea|chipotle(s)? in adobo|pickle|roasted red pepper|curry paste|enchilada|marinara|applesauce|jam|preserves|jelly"),
    ("Oils, Vinegars & Condiments", r"oil|vinegar|tamari|soy sauce|coconut aminos|mustard|ketchup|hot sauce|sriracha|worcestershire|fish sauce|hoisin|tahini|sunflower (seed )?butter|sunbutter|seed butter|harissa|chili garlic|sambal|liquid smoke|mirin|wine|sherry|cognac|rum|brandy|gochujang|teriyaki|bbq|barbecue|dressing|cooking spray"),
    ("Nuts, Seeds & Dried Fruit", r"seeds|pepitas|hemp|sesame|raisin|dried|sunflower|pumpkin seed|trail"),
]

PRIORITY = [
    ("Baking", r"flour|starch|yeast|xanthan|psyllium|baking (soda|powder)|bicarbonate|cocoa|cacao|chocolate|sugar|extract|sweetener|erythritol|\boats?\b|rolled oat|coconut (flake|shred)|shredded coconut|sprinkle|whipped|cocowhip|coco whip|cookies|pie crust|sourdough starter"),
    ("Canned & Jarred", r"broth|stock\b|bouillon|applesauce|apple sauce|capers?\b|pumpkin puree|canned pumpkin|tomato paste|tomato sauce|crushed tomato|diced tomato|coconut milk|coconut cream"),
    ("Spices & Seasonings", r"all ?spice"),
    ("Nuts, Seeds & Dried Fruit", r"walnut|pecan|almond|cashew|peanut|\bnuts?\b"),
    ("Dairy-Free Fridge", r"veggie ground|plant[- ]based (ground|crumbles)"),
]
def aisle(key):
    for name, pat in PRIORITY:
        if re.search(pat, key): return name
    for name, pat in AISLES:
        if re.search(pat, key): return name
    return "Other"

def safety(raw_line, key):
    L = clean(raw_line).lower()
    W, B = [], ""
    has_or = " or " in L
    def neg(pre, word):
        return re.search(pre + r"\s*(-)?\s*" + word, L)
    # eggs
    if re.search(r"\beggs?\b|egg whites?|egg yolks?", L) and not re.search(r"flax ?egg|chia ?egg|egg replacer|eggplant|vegan (fried )?eggs?|egg[- ]free|eggless|just egg|egg[- ]sized|egg substitute", L):
        if re.search(r"flax|chia|aquafaba|replacer", L): W.append("Use the egg-free option listed here"); B = "Ground flaxseed (for flax eggs)"
        else: W.append("Contains egg. Use the recipe's egg-free option (flax egg)"); B = "Ground flaxseed (for flax eggs)"
    # nuts
    nut = re.search(r"\b(almonds?|cashews?|walnuts?|pecans?|pistachios?|hazelnuts?|macadamias?|pine nuts?|peanuts?|brazil nuts?)\b", L)
    if nut and not re.search(r"nut[- ]free|sunflower", L):
        if "almond milk" in L or "cashew milk" in L: B = "Oat or soy milk (not nut milk)"; W.append("Nut milk. Buy oat or soy instead")
        elif "almond extract" in L: B = "Vanilla extract"; W.append("Almond extract. Use vanilla")
        elif re.search(r"(peanut|almond|cashew) butter", L): B = "Sunflower seed butter"; W.append("Nut butter. Use sunflower seed butter")
        elif "almond flour" in L or "almond meal" in L: W.append("Almond flour. Use the recipe's nut-free option")
        else: W.append(f"Contains {nut.group(1)}. Leave out or use pepitas/sunflower seeds"); B = "Pepitas or sunflower seeds"
    # dairy
    plant = r"(vegan|dairy[- ]free|non[- ]?dairy|nondairy|plant[- ]based|plant|coconut|oat|soy|rice|hemp|pea|cashew|almond|nut[- ]free|df|violife|tofutti|daiya)"
    if re.search(r"\bbutter\b", L) and not re.search(r"(sunflower|sun|seed|peanut|almond|cashew|cocoa|nut|apple|soy|cookie)\s*butter|butter,? (lettuce|beans?|squash|bibb)|buttermilk|butterscotch", L):
        if re.search(plant + r"[\w\s]*butter", L) or re.search(r"earth balance|miyoko|melt", L):
            W.append("Pick a nut-free vegan butter (check label)"); B = "Nut-free vegan butter"
        else:
            W.append("Dairy. Use nut-free vegan butter or oil"); B = "Nut-free vegan butter"
    if re.search(r"\b(milk|buttermilk)\b", L) and not re.search(plant + r"[\w\s-]*(milk|buttermilk)|condensed", L):
        W.append("Dairy. Use oat or soy milk"); B = B or "Oat or soy milk"
    elif re.search(r"(non[- ]?dairy|nondairy|plant[- ]based|plant|dairy[- ]free|vegan) (milk|buttermilk)", L) and not B:
        B = "Oat or soy milk (not nut milk)"
    if re.search(r"\b(cheese|parmesan|mozzarella|cheddar|feta|cotija|pecorino|ricotta|sour cream|cream cheese|yogurt|yoghurt|heavy cream|whipping cream|half[- ]and[- ]half|ghee|creme fraiche)\b", L):
        if re.search(plant + r"[\w\s-]*(cheese|parmesan|mozzarella|cream|yogurt|yoghurt|feta)", L) or "nutritional yeast" in L:
            W.append("Choose a nut-free brand (many are cashew- or almond-based)")
        else:
            W.append("Dairy. Skip it or use a nut-free dairy-free version")
    # gluten
    if re.search(r"\bflour\b", L) and not re.search(r"gluten[- ]free|gf |besan|gram flour|rice flour|oat flour|buckwheat|chickpea|garbanzo|bean flour|tapioca|coconut flour|sorghum|millet|teff|cassava|corn ?flour|masa|potato|arrowroot|almond|quinoa|1[- ]to[- ]1|1:1|measure for measure|cup4cup|all[- ]purpose gf|flour blend|flaxseed|flax|banana flour|tigernut", L):
        W.append("Use a 1-to-1 gluten-free flour blend"); B = "1-to-1 gluten-free flour blend"
    if re.search(r"\boats?\b|oat flour|oatmeal|rolled oats|oat milk", L) and not re.search(r"certified|gluten[- ]free|gf", L):
        W.append("Must be certified gluten-free")
    if re.search(r"soy sauce|shoyu", L) and not re.search(r"gluten[- ]free|tamari|coconut aminos", L):
        W.append("Wheat. Use gluten-free tamari"); B = "Gluten-free tamari"
    if re.search(r"bread ?crumbs|panko|croutons", L) and not re.search(r"gluten[- ]free|gf", L):
        W.append("Use gluten-free, egg-free breadcrumbs"); B = "GF breadcrumbs / panko"
    if re.search(r"worcestershire", L): W.append("Use a gluten-free brand (no malt vinegar)")
    if re.search(r"hoisin", L): W.append("Use a gluten-free hoisin (check for peanuts)")
    if re.search(r"oyster sauce", L): W.append("Shellfish. Use mushroom 'oyster' sauce"); B = "Vegetarian mushroom stir-fry sauce"
    if re.search(r"\bmiso\b", L): W.append("Use chickpea or rice miso (not barley)")
    if re.search(r"\bmalt|beer|\bale\b|brewer'?s yeast", L): W.append("Barley/gluten. Use a gluten-free alternative")
    if re.search(r"chocolate|cacao chips|carob chips", L) and not re.search(r"cocoa powder|cacao powder", L): W.append("Use allergy-safe, dairy-free chocolate")
    if re.search(r"rice (crisp|krispies)|crisp rice|cereal", L): W.append("Use a gluten-free (malt-free) cereal")
    if re.search(r"\b(bread|buns?|baguette|ciabatta|tortillas?|wraps?|crackers?|pretzels?|graham|pasta|spaghetti|fusilli|penne|noodles?|macaroni|pizza crust)\b", L) and not re.search(r"rice noodles?|rice paper|corn tortillas?|bread ?crumbs|panko", L):
        W.append("Buy gluten-free, egg-free, dairy-free (check label)")
    if re.search(r"broth|stock|bouillon", L): W.append("Check label is gluten-free")
    if re.search(r"curry paste", L): W.append("Many contain shrimp paste. Check the label")
    if re.search(r"\b(shrimp|prawns?|crab|lobster|scallops?|clams?|mussels?|oysters?)\b", L) and "oyster sauce" not in L and "mushroom" not in L:
        W.append("Shellfish. Leave out")
    if re.search(r"mayo|mayonnaise", L) and not re.search(r"vegan|egg[- ]free", L): W.append("Use egg-free (vegan) mayo")
    elif re.search(r"vegan mayo|egg[- ]free mayo|vegenaise", L): W.append("Check vegan mayo is nut-free")
    # dedupe
    out = []
    for w in W:
        if w not in out: out.append(w)
    return " · ".join(out), B

def canon(key):
    for pat, c in CANON:
        if re.search(pat, key): return c
    k = re.sub(r"(?<=[a-z])s$", "", key) if not re.search(r"(ss|us|is|ies|oes)$", key) else key
    return k

out = {}
for rid, lines in raw.items():
    if not isinstance(lines, list): continue
    items = []
    for ln in lines:
        c = clean(ln)
        if not c or len(c) < 2: continue
        if re.match(r"^(for the|for |frosting|filling|topping|crust|sauce|dough|glaze|garnish)[^,]*:?$", c, re.I) and not re.search(r"\d", c): continue
        if re.search(r"\b(pan|parchment|skewers?|toothpicks?|muffin liners?|cupcake liners?|cooking spray|non-stick spray)\b", c, re.I) and not re.search(r"pan-fry|pancake", c, re.I): continue
        q, q2, unit, disp, key = parse(c)
        if re.search(r"\bwater\b", key) and not re.search(r"watermelon|chestnut|coconut water", key): continue
        k = canon(key) or key
        if k == "garlic" and not unit and q: unit = "clove"
        warn, buy = safety(c, k)
        PRETTY = {"lemons": "Lemons (or lemon juice)", "limes": "Limes (or lime juice)", "salt": "Salt", "garlic": "Garlic"}
        disp = PRETTY.get(k) or (key[:1].upper() + key[1:] if key else disp)
        items.append({"r": c, "q": q, "q2": q2, "u": unit, "n": disp, "k": k, "a": aisle(key or k), "s": k in STAPLES, "w": warn, "b": buy})
    out[rid] = items

open("/Users/samob917/safe-table/data/ingredients.js", "w").write("window.INGREDIENTS = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
print("recipes", len(out), "lines", sum(len(v) for v in out.values()))
import collections
print(collections.Counter(i["a"] for v in out.values() for i in v))
