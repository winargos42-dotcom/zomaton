# ZomATON ACK + transfer-gate: локальный кандидат

Статус: НЕ mainnet, НЕ независимый профессиональный аудит. Никаких кошельков, подписей, сетевых транзакций или расходов. Изменён и Collection, и NFT Item: не совместимо с ранее собранными адресами/BOC.

## Протокол
1. Owner-only mint сохраняет единственный pending init payload (валидный адрес wc0 + metadata ref), отправляет init. Пока pending есть, новый mint запрещён. next_item_index НЕ увеличивается.
2. Item принимает init только от Collection, сохраняет owner/content и заблокирован для transfer. Отправляет ACK с индексом и hash payload.
3. Collection проверяет отправителя по детерминированному адресу item, индекс и hash pending. Атомарно очищает pending, повышает next_item_index и отправляет release.
4. Item принимает release только от Collection; после этого разрешает стандартный TEP transfer.
5. Owner op4 восстанавливает ТОЛЬКО pending: повторяет именно сохранённый payload, не принимает новый owner/content. После ACK op4 запрещён.
6. Owner op5 повторяет release для подтверждённых индексов БЕЗ StateInit. Он не может восстановить удалённый NFT исходным владельцем.

Подтверждённый next_item_index означает получен ACK и release отправлен, но НЕ доказывает доставленный release. Перед продажей/передачей дополнительно читать get_transfer_ready и get_nft_data.

## Хранение и стоимость
Постоянного словаря на 42 млн NFT нет. Collection хранит не более одного pending. Тест 20 последовательных завершений подтверждает одинаковое количество cells collection data после каждого. Каждый NFT остаётся отдельным аккаунтом с собственными расходами storage; это НЕ оценка стоимости 42 млн выпусков.
Минимум deploy_amount 0.1 TON, ACK/release по 0.02 TON — локальные экспериментальные параметры, НЕ смета mainnet и НЕ гарантия при другой gas config. Action errors не игнорируются; ACK action failure при нехватке баланса реально воспроизведён и восстанавливается topup+retry.

## Проверка
npm test: 30/30 PASS (11 базовых + 19 handshake). Запускать из корня zomaton-ton-readiness.
node handshake/build.cjs: BOC и hashes в handshake/build/manifest.json.
Функциональность: mint/transfer, TEP getters/content/static data/royalty/notifications, cap, ACL, fake ACK/release, wrong hash, malformed payload, pending/retry, withheld ACK/release, terminal deletion, owner rotation, insufficient balance и storage bound.

## Граница модели и честные ограничения
- Предполагается TON FIFO для сообщений одного sender одному destination. Источник: https://docs.ton.org/pdfs/ton.pdf . Точный safety argument требует независимого аудита с текущими сетевыми правилами.
- independent-race.test.cjs специально нарушает FIFO, имеет ожидаемый FAIL и НЕ включён в нормативный npm test. Это модельный контрпример, не доказательство mainnet exploit.
- setShardAccount(createEmptyShardAccount) моделирует УЖЕ deleted item, не реальный срок/механику storage debt.
- Partial queues используют allowParallel:true. В ранних recovery delay tests этого не было: default shared queue могла автоматически завершить сообщения; эти ранние PASS не считать доказательством задержек. Старый deletion FAIL не зависел от этого и остаётся подтверждённым.
- При permanent failure/frozen item единственный pending блокирует последующие mint. Нет автоматического пропуска/отмены pending: это сознательно сохраняет адрес/право вместо опасного повторного выделения. Требуется отдельная политика ливнеса/операторского обслуживания.
- Нет полноценного frozen-state test и настоящего item compute failure с bounce; ACK action failure проверен отдельно. Нет долговременной симуляции storage costs.
- Внешние metadata example.invalid, root mapping aw2/zp1, права, royalties, owner и цены не финализированы.
- Нужны testnet, независимый security review, актуальная оценка комиссий/резерва и подтверждение пользователя перед mainnet.
