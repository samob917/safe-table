import ssl, json, re, html, urllib.request, concurrent.futures as cf
from urllib.parse import urljoin
try:
    import certifi; CTX=ssl.create_default_context(cafile=certifi.where())
except Exception: CTX=ssl._create_unverified_context()
s=open('/Users/samob917/safe-table/data/recipes.js').read(); R=json.loads(s[s.index('['):s.rindex(']')+1])
UA={'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36','Accept':'text/html'}
def img_from_ld(o):
    if isinstance(o,dict):
        t=o.get('@type'); t=t if isinstance(t,list) else [t]
        if 'Recipe' in t and o.get('image'):
            im=o['image']
            if isinstance(im,list): im=im[0]
            if isinstance(im,dict): im=im.get('url')
            return im
        for v in o.values():
            r=img_from_ld(v)
            if r: return r
    elif isinstance(o,list):
        for v in o:
            r=img_from_ld(v)
            if r: return r
def get(r):
    res={'img':None,'print':None}
    try:
        h=urllib.request.urlopen(urllib.request.Request(r['url'],headers=UA),timeout=25,context=CTX).read().decode('utf-8','ignore')
    except Exception as e:
        return r['id'],res
    m=re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',h) or re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',h)
    if m: res['img']=html.unescape(m.group(1))
    if not res['img']:
        for mm in re.finditer(r'<script[^>]*application/ld\+json[^>]*>(.*?)</script>',h,re.S):
            try: im=img_from_ld(json.loads(mm.group(1).strip()))
            except Exception: continue
            if im: res['img']=im; break
    for pat in [r'href=["\']([^"\']*wprm_print[^"\']*)["\']', r'href=["\']([^"\']*tasty-recipes-print[^"\']*)["\']', r'href=["\']([^"\']*/print/[^"\']*)["\'][^>]*(?:print|Print)', r'href=["\']([^"\']*[?&]print[^"\']*)["\']']:
        p=re.search(pat,h)
        if p: res['print']=urljoin(r['url'],html.unescape(p.group(1))); break
    return r['id'],res
out={}
with cf.ThreadPoolExecutor(12) as ex:
    for k,v in ex.map(get,R): out[k]=v
json.dump(out,open('/Users/samob917/safe-table/tools/media.json','w'),indent=1)
print('img',sum(1 for v in out.values() if v['img']),'print',sum(1 for v in out.values() if v['print']),'of',len(R))
print('no img:',[k for k,v in out.items() if not v['img']])
import itertools
print([v['print'] for v in itertools.islice((v for v in out.values() if v['print']),8)])
