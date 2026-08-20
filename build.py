#!/usr/bin/env python3
"""
Skyframe — сборка конфигураторов из контента.

    python3 build.py            собрать все бренды из content/
    python3 build.py skyframe   собрать один
    python3 build.py --check    только проверить контент, ничего не писать

Что делает: читает content/<бренд>/catalog.xlsx и brand.json, находит картинки
по именам папок и файлов, подставляет всё в движок из engines/ и кладёт готовую
страницу туда, куда указано в brand.json → output.

Зависимости: pip install openpyxl
"""
import json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
CONTENT = os.path.join(ROOT, 'content')
ENGINES = os.path.join(ROOT, 'engines')

COLS = ['model', 'name', 'factory', 'config', 'label', 'm2',
        'kit', 'mount', 'foundation', 'finish', 'mep']
PRICE_COLS = ['kit', 'mount', 'foundation', 'finish', 'mep']


# ─────────────────────────── чтение контента ───────────────────────────

def read_catalog(path):
    """catalog.xlsx → список строк-словарей. Первая строка — заголовки, порядок колонок фиксирован."""
    import openpyxl
    ws = openpyxl.load_workbook(path, data_only=True)['catalog']
    rows = []
    for r in ws.iter_rows(min_row=2, values_only=True):
        if not r or not r[0]:
            continue
        row = dict(zip(COLS, r))
        for k in PRICE_COLS:
            row[k] = int(row.get(k) or 0)
        row['m2'] = int(row.get('m2') or 0)
        for k in ('model', 'config'):
            row[k] = str(row[k]).strip()
        rows.append(row)
    return rows


def media_root(brand_key, brand):
    """Пак может брать картинки у другого бренда — чтобы не дублировать мегабайты."""
    return os.path.join(CONTENT, brand.get('media_from', brand_key))


def collect(brand_key, brand, rows):
    """Строки таблицы + файлы на диске → структура для движка. Здесь же вся валидация."""
    mroot = media_root(brand_key, brand)
    problems, models, order = [], {}, []

    for row in rows:
        mk, ck = row['model'], row['config']
        mdir = os.path.join(mroot, 'models', mk)

        if mk not in models:
            cover = os.path.join(mdir, 'cover.jpg')
            sil = os.path.join(mdir, 'silhouette.png')
            if not os.path.isfile(cover):
                problems.append(f'{mk}: нет cover.jpg')
            if not os.path.isfile(sil):
                problems.append(f'{mk}: нет silhouette.png')
            models[mk] = {'key': mk, 'name': row['name'], 'factory': row['factory'],
                          'cover': cover, 'sil': sil, 'variants': []}
            order.append(mk)

        plan = os.path.join(mdir, f'plan-{ck}.jpg')
        if not os.path.isfile(plan):
            problems.append(f'{mk}/{ck}: нет plan-{ck}.jpg')
        if row['kit'] <= 0:
            problems.append(f'{mk}/{ck}: не заполнена цена домокомплекта')
        if row['m2'] <= 0:
            problems.append(f'{mk}/{ck}: не заполнена площадь')

        models[mk]['variants'].append({
            'key': ck, 'title': row['label'] or f"{row['m2']} м²", 'm2': row['m2'],
            'mat': row['kit'], 'rab': row['mount'], 'fund': row['foundation'],
            'otd': row['finish'], 'inzh': row['mep'], 'plan_src': plan})

    opt = os.path.join(mroot, 'options')
    roof = sorted(_ls(os.path.join(opt, 'roof')))
    inter = sorted(_ls(os.path.join(opt, 'interior')))
    if not roof:
        problems.append('options/roof: нет ни одной картинки кровли')

    # site/ — картинки витрины (разрез, процесс, объекты). Ключ = имя файла без расширения.
    site = {os.path.splitext(os.path.basename(f))[0]: f
            for f in _ls(os.path.join(mroot, 'site'))}

    out = [models[k] for k in order]
    for m in out:
        m['variants'].sort(key=lambda v: v['mat'])
    out.sort(key=lambda m: min(v['mat'] for v in m['variants']))
    return out, roof, inter, site, problems


def _ls(d):
    if not os.path.isdir(d):
        return []
    return [os.path.join(d, f) for f in os.listdir(d)
            if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp'))]


# ─────────────────────────── сборка ───────────────────────────

def build(brand_key, check_only=False):
    bdir = os.path.join(CONTENT, brand_key)
    brand = json.load(open(os.path.join(bdir, 'brand.json'), encoding='utf-8'))
    cdir = os.path.join(CONTENT, brand.get('catalog_from', brand_key))
    rows = read_catalog(os.path.join(cdir, 'catalog.xlsx'))
    models, roof, inter, site, problems = collect(brand_key, brand, rows)

    print(f"\n■ {brand_key}: {len(models)} моделей, {sum(len(m['variants']) for m in models)} конфигураций")
    for p in problems:
        print('  ! ' + p)
    if check_only:
        return not problems
    if problems:
        print('  сборка остановлена — сначала поправьте контент')
        return False

    outdir = os.path.join(ROOT, brand.get('output', brand_key))
    os.makedirs(outdir, exist_ok=True)

    def put(src, rel=None):
        # картинки не копируем: страница ссылается прямо в content/ относительным путём
        return os.path.relpath(src, outdir).replace(os.sep, '/')

    data, sils = [], []
    for m in models:
        sils.append(put(m['sil']))
        data.append({
            'name': m['name'], 'factory': m['factory'],
            'photo': put(m['cover']),
            'variants': [{'title': v['title'], 'm2': v['m2'], 'mat': v['mat'], 'rab': v['rab'],
                          'fund': v['fund'], 'otd': v['otd'], 'inzh': v['inzh'],
                          'plan': put(v['plan_src'])}
                         for v in m['variants']]})
    ex = [put(p) for p in roof]
    it = [put(p) for p in inter]
    st = {k: put(v) for k, v in sorted(site.items())}

    engine = open(os.path.join(ENGINES, brand.get('engine', 'wizard') + '.html'), encoding='utf-8').read()
    j = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
    html = (engine
            .replace('__DATA__', j(data)).replace('__EX__', j(ex))
            .replace('__INT__', j(it)).replace('__SIL__', j(sils))
            .replace('__SITE__', j(st))
            .replace('__TITLE__', brand['title']).replace('__PHONE__', brand['phone'])
            .replace('__PHONE_HREF__', brand['phone_href'])
            .replace('__CATALOG__', brand.get('catalog_pdf') or '#')
            .replace('__ACCENT__', brand.get('accent', '#c9f24e')))

    open(os.path.join(outdir, 'index.html'), 'w', encoding='utf-8').write(html)
    where = brand.get('output', brand_key)
    print(f"  → {where}/index.html  ({len(html)//1024} КБ), движок: {brand.get('engine','wizard')}, "
          f"картинки берутся из content/{brand.get('media_from', brand_key)}/")
    return True


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('-')]
    check = '--check' in sys.argv
    brands = args or sorted(d for d in os.listdir(CONTENT)
                            if os.path.isfile(os.path.join(CONTENT, d, 'brand.json')))
    ok = all(build(b, check) for b in brands)
    print('\nготово' if ok else '\nесть замечания')
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
