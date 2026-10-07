#!/usr/bin/env python3
"""
Сборка конфигуратора (движок studio/) из таблиц завода.

    python3 tools/studio_build.py              собрать все бренды из brands/
    python3 tools/studio_build.py mashko       собрать один
    python3 tools/studio_build.py --check      только проверить, ничего не писать

Что лежит в brands/<бренд>/ и правится руками:
    brand.json      название, цвета, контакты, тексты, пакеты комплектации, группы материалов
    models.csv      одна строка — одна модель: id, name, description
    variants.csv    одна строка — одна планировка модели и её цены
    materials.csv   образцы: фальц, фасад, терраса, отделка внутри
    media/<модель>/ картинки модели, имена по соглашению (см. README)
    media/_shared/  общие картинки для всех моделей (запасные)

Что получается (не править руками):
    brands/<бренд>/build/catalog.json   весь каталог одним файлом
    brands/<бренд>/build/img/...        сжатые копии тяжёлых картинок и превью карточек
    <output>/index.html                 страница конфигуратора

Зависимости: pip install pillow
"""
import csv, json, os, re, sys, hashlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRANDS = os.path.join(ROOT, 'brands')
STUDIO = os.path.join(ROOT, 'studio')
IMG_EXT = ('.jpg', '.jpeg', '.png', '.webp')
MAX_SIDE, MAX_BYTES = 1800, 650_000          # тяжелее — сожмём копию в build/img
CARD_W = 760                                 # ширина превью для карточек каталога

PRICE_COLS = ['kit_factory', 'windows', 'seam', 'foundation', 'mount', 'crane', 'finish', 'mep']


# ───────────────────────── чтение таблиц ─────────────────────────

def read_csv(path):
    """CSV из Excel/Numbers/Google Sheets: utf-8 с BOM или без, разделитель , или ;"""
    with open(path, encoding='utf-8-sig', newline='') as f:
        text = f.read()
    dialect = ';' if text.count(';') > text.count(',') else ','
    rows = list(csv.DictReader(text.splitlines(), delimiter=dialect))
    return [{(k or '').strip(): (v or '').strip() for k, v in r.items()} for r in rows
            if any((v or '').strip() for v in r.values())]


def num(s):
    """'1 413 600', '1413600', '81,5' → число; пусто → 0"""
    s = re.sub(r'[\s ₽]', '', str(s or '')).replace(',', '.')
    if not s:
        return 0
    v = float(s)
    return int(v) if v == int(v) else v


# ───────────────────────── картинки ─────────────────────────

def scan(folder):
    """{'имя-без-расширения': путь} для картинок в папке"""
    if not os.path.isdir(folder):
        return {}
    out = {}
    for f in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(f)
        if ext.lower() in IMG_EXT and not f.startswith('.'):
            out.setdefault(stem.lower(), os.path.join(folder, f))
    return out


def optimize(src, bdir, max_side=MAX_SIDE, quality=82, tag=''):
    """Лёгкая картинка как есть; тяжёлая или png — сжатая jpg-копия в build/img."""
    from PIL import Image
    size = os.path.getsize(src)
    with Image.open(src) as im:
        w, h = im.size
        light = size <= MAX_BYTES and max(w, h) <= max_side and src.lower().endswith(('.jpg', '.jpeg'))
        if light and not tag:
            return src, (w, h)
        key = hashlib.md5(f'{src}:{os.path.getmtime(src)}:{size}:{max_side}:{quality}'.encode()).hexdigest()[:10]
        rel = os.path.relpath(src, os.path.join(bdir, 'media'))
        name = re.sub(r'[^a-z0-9_-]+', '-', os.path.splitext(rel)[0].lower()) + (f'-{tag}' if tag else '') + f'-{key}.jpg'
        dst = os.path.join(bdir, 'build', 'img', name)
        im2 = im.convert('RGB')
        if max(w, h) > max_side:
            r = max_side / max(w, h)
            im2 = im2.resize((round(w * r), round(h * r)), Image.LANCZOS)
        if not os.path.exists(dst):
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            im2.save(dst, 'JPEG', quality=quality, optimize=True, progressive=True)
        return dst, im2.size


# ───────────────────────── сборка ─────────────────────────

def build(key, check_only=False):
    bdir = os.path.join(BRANDS, key)
    brand = json.load(open(os.path.join(bdir, 'brand.json'), encoding='utf-8'))
    models = read_csv(os.path.join(bdir, 'models.csv'))
    variants = read_csv(os.path.join(bdir, 'variants.csv'))
    materials = read_csv(os.path.join(bdir, 'materials.csv'))
    errors, warns = [], []
    outdir = os.path.join(ROOT, brand.get('output', f'd/{key}'))
    rel = lambda p: os.path.relpath(p, outdir).replace(os.sep, '/')
    shared = scan(os.path.join(bdir, 'media', '_shared'))

    # группы материалов: из brand.json (порядок, заголовки) + образцы из materials.csv
    groups = []
    for g in brand.get('groups', []):
        items = [{'id': m['id'], 'name': m['name'], 'note': m.get('note', ''), 'color': m.get('color', '#cccccc')}
                 for m in materials if m.get('group') == g['id']]
        if not items:
            errors.append(f"materials.csv: нет образцов для группы «{g['id']}»")
        groups.append({**g, 'items': items})
    known = {g['id']: {i['id'] for i in g['items']} for g in groups}
    for m in materials:
        if m.get('group') not in known:
            warns.append(f"materials.csv: группа «{m.get('group')}» не описана в brand.json → groups, строка пропущена")

    out_models, seen = [], set()
    for m in models:
        mid = m.get('id', '').lower()
        if not mid:
            continue
        if mid in seen:
            errors.append(f'models.csv: модель «{mid}» встречается дважды')
        seen.add(mid)
        rows = [v for v in variants if v.get('model', '').lower() == mid]
        if not rows:
            warns.append(f'{mid}: нет ни одной строки в variants.csv — модель не показана')
            continue
        media = scan(os.path.join(bdir, 'media', mid))
        img = {}
        for stem, path in media.items():
            if stem == 'silhouette':
                continue
            p, size = optimize(path, bdir)
            img[stem] = rel(p)
        card_src = media.get('ext-evening') or media.get('cover') or media.get('ext-hero')
        if not card_src:
            errors.append(f'{mid}: нет ни cover.jpg, ни ext-evening.jpg, ни ext-hero.jpg')
        else:
            p, _ = optimize(card_src, bdir, max_side=CARD_W, quality=78, tag='card')
            img['_card'] = rel(p)
        vs = []
        for v in rows:
            vid = v.get('variant', '')
            prices = {c: num(v.get(c)) for c in PRICE_COLS}
            if prices['kit_factory'] <= 0:
                errors.append(f'{mid}/{vid}: не заполнена цена «kit_factory»')
            area = num(v.get('area_m2'))
            if area <= 0:
                errors.append(f'{mid}/{vid}: не заполнена площадь')
            if f'plan-{vid}'.lower() not in media:
                warns.append(f'{mid}/{vid}: нет plan-{vid}.jpg — планировка не покажется')
            vs.append({'id': vid, 'area': area, 'label': v.get('label', ''), 'prices': prices})
        missing = [f"ext-{g['view']}-{it['id']}" for g in groups if g.get('view') in ('hero', 'facade', 'terrace')
                   for it in g['items'] if f"ext-{g['view']}-{it['id']}" not in img]
        missing += [f"int-{it['id']}" for g in groups if g.get('view') == 'interior' for it in g['items']
                    if f"int-{it['id']}" not in img and f"int-{it['id']}" not in shared]
        if missing:
            warns.append(f"{mid}: нет {len(missing)} кадров — " + ', '.join(missing[:4]) + (' …' if len(missing) > 4 else ''))
        out_models.append({'id': mid, 'name': m.get('name', mid), 'description': m.get('description', ''),
                           'variants': vs, 'img': img})

    shared_img = {}
    for stem, path in shared.items():
        p, _ = optimize(path, bdir)
        shared_img[stem] = rel(p)

    kit = lambda v: sum(v['prices'][c] for c, _ in brand['base']['parts'])
    out_models.sort(key=lambda m: min(kit(v) for v in m['variants']))
    for m in out_models:
        m['variants'].sort(key=lambda v: (v['area'], kit(v)))

    print(f"\n■ {key}: {len(out_models)} моделей, {sum(len(m['variants']) for m in out_models)} планировок")
    for w in warns:
        print('  · ' + w)
    for e in errors:
        print('  ! ' + e)
    if errors:
        print('  сборка остановлена — сначала поправьте таблицы')
        return False
    if check_only:
        return True

    public = {k: v for k, v in brand.items() if not k.startswith('_') and k not in ('output',)}
    for k in ('logo', 'logo_light'):
        if brand.get(k):
            public[k] = rel(os.path.join(bdir, brand[k]))
    catalog = {'brand': public, 'groups': groups, 'models': out_models, 'shared': shared_img}

    os.makedirs(os.path.join(bdir, 'build'), exist_ok=True)
    json.dump(catalog, open(os.path.join(bdir, 'build', 'catalog.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    page = open(os.path.join(STUDIO, 'page.html'), encoding='utf-8').read()
    j = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
    ver = hashlib.md5((open(os.path.join(STUDIO, 'studio.js'), 'rb').read() +
                       open(os.path.join(STUDIO, 'studio.css'), 'rb').read())).hexdigest()[:8]
    html = (page.replace('{{CATALOG}}', j)
                .replace('{{STUDIO}}', rel(STUDIO))
                .replace('{{V}}', ver)
                .replace('{{TITLE}}', brand.get('site_title', brand['title']))
                .replace('{{DESCRIPTION}}', brand.get('description', ''))
                .replace('{{ACCENT}}', brand.get('accent', '#F39240'))
                .replace('{{ACCENT_INK}}', brand.get('accent_ink', '#17191C'))
                .replace('{{ROBOTS}}', '<meta name="robots" content="noindex,nofollow">' if brand.get('noindex') else ''))
    os.makedirs(outdir, exist_ok=True)
    open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8').write(html)
    print(f"  → {os.path.relpath(outdir, ROOT)}/index.html ({len(html) // 1024} КБ)")
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    check = '--check' in sys.argv
    keys = args or sorted(d for d in os.listdir(BRANDS) if os.path.isfile(os.path.join(BRANDS, d, 'brand.json')))
    ok = all([build(k, check) for k in keys])
    print('\nготово' if ok else '\nесть ошибки')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
