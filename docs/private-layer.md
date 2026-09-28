# Защищённый слой ЦУП · Yandex Cloud

Статус на 29.09.2026: код готов и проверен тестами, в облаке ещё не развёрнут. `PRIVATE_URL` в `public/private-source.js` пустой — ЦУП показывает «не подключён».

## Как устроено

```
Компьютер Штаба ──(загрузка снимка)──▶ закрытый бакет Object Storage
                                            │ читает с IAM-токеном своего сервисного аккаунта
ЦУП в MAX ──(подпись запуска MAX)──▶ Cloud Function private-gateway ──▶ JSON снимка
```

- Функция отдаёт снимок только если подпись данных запуска MAX верна, данные не старше суток и `user.id` есть в `ALLOWED_USER_IDS`.
- Из браузера по ссылке снимок не открыть: нет подписи MAX.
- Публичная телеметрия (`live/status.json`) не меняется и по-прежнему не содержит приватного.
- Всё в пределах бесплатного объёма serverless (вызовы функции, 1 ГБ хранения).

## Формат снимка `private/snapshot.json`

```json
{
  "schema": "private-1",
  "generated_at": "2026-09-29T09:00:00+03:00",
  "ttl_seconds": 300,
  "events": [{"id":"…","title":"…","kind":"meeting|trip|vks|payment|checkpoint|auto","start":"ISO","end":"ISO","endConfirmed":false,"format":"online|offline","location":"…","joinUrl":"https://…","project":"h45","source":"google-calendar"}],
  "tasks":  [{"id":"<источник>#<ID задачи>","title":"…","status":"OPEN|PROPOSED|IN_PROGRESS|WAITING|HOLD|DEFERRED|DONE","deadline":"…","project":"…","owner":"…","source":"TASKS — …","links":[]}],
  "inbox":  [{"id":"…","channel":"MAX|Telegram","receivedAt":"ISO","type":"…","project":null,"triage":"new|linked|done","summary":"…"}]
}
```

- `endConfirmed: true` только если окончание реально указано во встрече. Иначе ЦУП пишет «Окончание не указано».
- Статус задачи — код из проектных TASKS / HQ TASK INDEX как есть. Приоритет в снимок не входит: он хранится на телефоне.
- `triage: "done"` только для явно разобранного. Прочитано ботом ≠ разобрано.
- `project` — id или название из `public/projects.js`.

## Развёртывание (делает Claude Code на компьютере Штаба или Алексей в консоли)

1. Каталог в Yandex Cloud, платёжный аккаунт — **Алексей сам**.
2. Закрытый бакет Object Storage (без публичного доступа), например `shtab-private`.
3. Сервисный аккаунт `shtab-gateway` с ролями `storage.viewer` на бакет и `lockbox.payloadViewer` на секрет.
4. Секрет Lockbox `shtab-max-bot` с ключом `MAX_BOT_TOKEN` — токен бота MAX, через который открывается ЦУП.
5. Функция `shtab-private-gateway`: среда Node.js 22, точка входа `index.handler`, код — `cloud/private-gateway/index.js`, сервисный аккаунт из п. 3, переменные `ALLOWED_USER_IDS`, `BUCKET`, секрет из Lockbox в `MAX_BOT_TOKEN`, память 128 МБ, таймаут 5 с. Функцию сделать публичной (проверка доступа — внутри).
6. Отдельный сервисный аккаунт `shtab-uploader` с ролью `storage.uploader` только на этот бакет, статический ключ хранится на компьютере Штаба (не в репозитории).
7. Сборщик на компьютере Штаба выгружает `private/snapshot.json` раз в 1–5 минут.
8. Проверка: запрос к адресу функции без заголовка → 401; из MAX → 200. Затем вписать адрес функции в `PRIVATE_URL` и опубликовать ЦУП.

Откат: очистить `PRIVATE_URL` и опубликовать — ЦУП вернётся к «не подключён». Функцию и бакет можно удалить из консоли.
