import ssl
try:
    import certifi; CTX=ssl.create_default_context(cafile=certifi.where())
except Exception:
    CTX=ssl._create_unverified_context()
import json, re, sys, urllib.request, html, concurrent.futures as cf
s=open('/Users/samob917/safe-table/data/recipes.js').read(); R=json.loads(s[s.index('['):s.rindex(']')+1])
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36','Accept':'text/html'}
def find(o):
    if isinstance(o,dict):
        t=o.get('@type'); t=t if isinstance(t,list) else [t]
        if 'Recipe' in t and o.get('recipeIngredient'): return o['recipeIngredient']
        for v in o.values():
            r=find(v)
            if r: return r
    elif isinstance(o,list):
        for v in o:
            r=find(v)
            if r: return r
def get(r):
    try:
        h=urllib.request.urlopen(urllib.request.Request(r['url'],headers=UA),timeout=25,context=CTX).read().decode('utf-8','ignore')
        for m in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',h,re.S):
            try: ing=find(json.loads(m.group(1).strip()))
            except Exception: continue
            if ing: return r['id'],[html.unescape(re.sub(r'<[^>]+>','',i)).strip() for i in ing]
        return r['id'],'NO_LDJSON'
    except Exception as e: return r['id'],'ERR '+str(e)[:60]
out={}
with cf.ThreadPoolExecutor(12) as ex:
    for k,v in ex.map(get,R): out[k]=v
json.dump(out,open('/Users/samob917/safe-table/tools/ingredients_raw.json','w'),indent=1)
ok=[k for k,v in out.items() if isinstance(v,list)]
print('ok',len(ok),'of',len(R))
for k,v in out.items():
    if not isinstance(v,list): print(' ',k,v[:40])
