#!/bin/bash
# Планировки и фото ALPINE FACHWERK с mashkobuild.ru → в эту же папку.
# Запуск: двойной клик по файлу. Или в Терминале: bash СКАЧАТЬ.command
cd "$(dirname "$0")"

B=http://mashkobuild.ru/images/projects/alpinefachwerk/img/plans
F=http://mashkobuild.ru/images/projects/alpinefachwerk/img/fotorama

# имена сразу по нашему соглашению: plan-<площадь>
# внимание: на сайте порядок файлов не по порядку вариантов
curl -fsSL "$B/plan_6.png" -o "plan-54.png"
curl -fsSL "$B/plan_1.png" -o "plan-72.png"
curl -fsSL "$B/plan_2.png" -o "plan-93.png"
curl -fsSL "$B/plan_3.png" -o "plan-96.png"
curl -fsSL "$B/plan_4.png" -o "plan-117.png"
curl -fsSL "$B/plan_5.png" -o "plan-142.png"

for i in 1 2 3 4; do curl -fsSL "$F/$i.jpg" -o "foto-$i.jpg"; done

echo
ls -la plan-*.png foto-*.jpg
echo
echo "Готово. Скажите Клоду — он приведёт всё к одному формату и подставит в каталог."
