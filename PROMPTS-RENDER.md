# Skyframe — промты для дорендера

Что нужно дорендерить для конфигуратора, в порядке приоритета. Все промты на английском — так стабильнее работают Midjourney / Flux / Imagen / ChatGPT. Русский комментарий над каждым блоком объясняет, зачем это.

---

## Базовый стиль (вставлять в конец каждого промта)

Единая сцена для всей линейки — вечерний лес, как в текущих рендерах:

```
, twilight blue hour, warm interior lights glowing through large panoramic windows,
surrounded by tall pine forest, natural stone boulder and low landscape lighting nearby,
wooden deck terrace, ultra realistic architectural photography, 35mm lens, eye level,
high detail, no people, no text, no watermark --ar 3:2
```

Для дневных вариантов замените первую строку на: `soft overcast daylight, natural tones`.

---

## Приоритет 1 — ракурсы каждой модели (нужно для листания на шаге «Экстерьер»)

Сейчас на модель один кадр. Нужно минимум 3: фасад ¾ слева, ¾ справа, вид с террасы/тыла.
К каждому промту добавляйте базовый стиль ↑.

Шаблон:

```
Modern prefab house [ОПИСАНИЕ МОДЕЛИ], three-quarter view from the [left/right],
[вид сзади: rear view showing terrace]
```

Описания моделей (вставлять в шаблон):

| Модель | Описание для промта |
|---|---|
| ОБЛАКО | tiny gable-roof cabin 16–24 sqm, standing seam metal roof, one large window, vertical wood siding |
| ЗАКАТ | compact gable-roof house 36–42 sqm with full-height glazed gable end, covered porch |
| ПИК | classic A-frame cabin 44 sqm, steep triangular silhouette, glazed front, metal roof |
| МОНБЛАН | flat-roof minimalist cube house 54 sqm, dark vertical timber cladding, corner glazing |
| РАССВЕТ | two-storey barn-style house 54–142 sqm with slightly angled walls, balconies, standing seam roof |
| ПРОСТОР | single-storey house 65–82 sqm with mono-pitched (skillion) roof, deep roof overhang over terrace |
| ГОРИЗОНТ | single-storey flat-roof house 69–89 sqm with integrated carport, long horizontal volume |
| ВЕРШИНА | barn house 72–108 sqm, steep gable roof, brick chimney, black timber cladding |
| ДАЛЬ | long single-storey flat-roof house 112 sqm with column colonnade along glazed facade |
| ПОЛДЕНЬ | wide flat-roof single-storey house 130 sqm, two offset volumes, panoramic glazing |
| ВЫСОТА | two-storey gable barn house 125–222 sqm, chimney, large glazed sections |
| МЕРИДИАН | large two-storey gable house 240 sqm, long ridge line, repeating window rhythm |

Итого: 12 моделей × 3 ракурса = **36 кадров**.

---

## Приоритет 2 — цвета кровли (шаг «Экстерьер» сейчас показывает A-frame для всех)

Один и тот же дом, меняется только цвет фальцевой кровли. КРИТИЧНО: ракурс, свет и окружение
должны быть идентичны — иначе переключение цвета будет «прыгать».
Лучший способ — image-to-image / редактирование готового кадра («recolor the roof to …»), а не генерация заново.

Цвета (RAL для точности):

```
terracotta RAL 8004 / graphite grey RAL 7016 / wine red RAL 3005 /
silver metallic RAL 9006 / dark bordeaux RAL 3007
```

Промт для редактирования существующего рендера:

```
Change only the standing seam metal roof color to [ЦВЕТ]. Keep everything else identical:
lighting, facade, windows, landscape, camera angle.
```

Минимум: 5 цветов × 3 ходовые модели (ЗАКАТ, ПРОСТОР, ВЕРШИНА) = **15 кадров**.
Максимум: × все 12 моделей = 60.

---

## Приоритет 3 — фасадная доска (переключение фасада пока только образцами)

Аналогично кровле, тот же приём «поменяй только одно»:

```
Change only the vertical timber cladding color to [natural larch / walnut brown /
dark coffee / charcoal black / pale linen]. Keep roof, windows, scene identical.
```

Минимум: 5 фасадов × те же 3 модели = **15 кадров**.

---

## Приоритет 4 — интерьеры в трёх стилях (шаг «Интерьер»)

Сейчас 6 случайных интерьеров из каталога. Нужно по 2 кадра (гостиная-кухня + спальня)
на каждый из трёх стилей отделки:

```
Scandinavian prefab house interior, open living room with kitchen, [СТИЛЬ],
large panoramic window with evening forest view, warm cozy lighting, wide angle,
photorealistic interior photography, no people --ar 16:9
```

Стили:

- Светлый: `light oak flooring, white walls, white kitchen fronts, minimal furniture`
- Тёплый: `walnut flooring, warm off-white walls, walnut kitchen fronts, soft textiles`
- Графит: `dark graphite floor, deep green-grey kitchen fronts, black window frames, moody accent lighting`

Плюс те же три стиля для спальни (`bedroom with low bed, panoramic window` вместо гостиной)
и по одному санузлу (`bathroom, walk-in shower, ceramic tray, matte black fixtures`).

Итого: 3 стиля × 3 помещения = **9 кадров**.

---

## Приоритет 5 — «без отделки» и «под чистовую» (честные фото этапов)

Это лучше снять на реальном объекте, но можно и сгенерировать:

```
Interior of a prefab house under construction, [ЭТАП], clean construction site,
daylight through installed windows, photorealistic --ar 16:9
```

- Без отделки: `bare OSB subfloor, exposed wooden battens on walls and ceiling`
- Под чистовую: `smooth primed walls ready for finishing, rough floor screed`

**2 кадра.**

---

## Сводка

| Приоритет | Что | Кадров | Разблокирует |
|---|---|---|---|
| 1 | Ракурсы всех моделей | 36 | листание на шаге «Экстерьер» |
| 2 | Цвета кровли | 15–60 | живое переключение цвета |
| 3 | Цвета фасада | 15 | живое переключение фасада |
| 4 | Интерьеры 3 стилей | 9 | шаг «Интерьер» со сменой картинки |
| 5 | Этапы отделки | 2 | честный показ «без отделки / под чистовую» |

Технические требования к файлам: JPEG, 3:2 (интерьеры 16:9), длинная сторона ≥1600 px,
одна модель = один каталог `assets/renders/<model>/`, имена вида `zakat_34left.jpg`,
`zakat_roof_ral7016.jpg`, `int_light_living.jpg` — тогда подключу их без переименований.
