# MIVY — template riêng theo ngành

## Mục tiêu
Thay 12 bộ lọc dùng chung 6 layout bằng template có cấu trúc nội dung, ảnh và bố cục riêng từng ngành. Không xem đổi palette hay tên mẫu là template mới.

## Phân công và giới hạn
- Codex: PO/PM, tiêu chí nghiệm thu, review tích hợp và QC.
- Gemini qua Antigravity: thiết kế schema, code các đợt triển khai, sửa lỗi theo báo cáo QC.
- Không dùng Claude nếu anh chưa cho phép. Không tự chuyển sang Codex code khi Gemini hết quota. Không gọi API trả phí.
- Gemini làm patch riêng, không ghi đè thay đổi đang có. Chỉ tích hợp sau kiểm tra.

## Đợt 1 — ba ngành có cấu trúc khác rõ rệt
1. Tuyển dụng: vị trí, lương (nếu có), địa điểm, yêu cầu, quyền lợi, liên hệ. Hai concept: thông báo tuyển dụng và hồ sơ đội ngũ.
2. Bất động sản: loại bất động sản, giá, diện tích, địa chỉ, phòng ngủ, tiện ích, liên hệ. Hai concept: ảnh kiến trúc lớn với dải thông số và brochure nhiều ảnh.
3. Ẩm thực: món/combo, giá, mô tả, ưu đãi, địa chỉ/đặt món. Hai concept: hero món ăn và menu/combo.
Mỗi ngành có form, content mapping và bố cục riêng. Một concept dùng chung các tỷ lệ nhưng phải reflow, không kéo giãn.

## Đợt 2
Khóa học, sự kiện, làm đẹp: mỗi ngành hai concept riêng sau khi đợt 1 được duyệt.

## Đợt 3
Du lịch, sản phẩm, thể thao, app/công nghệ, thương hiệu cá nhân, dịch vụ. Chưa làm xong thì hiển thị mẫu dùng chung rõ ràng; không gắn nhãn template chuyên ngành.

## Luồng người dùng
Chọn ngành → chọn mẫu bằng preview có dữ liệu minh họa đúng ngành → nhập thông tin → thêm ảnh nền/ảnh chính → chỉnh và tải xuống.
Preview thư viện không lấy JD tuyển dụng đang mở để minh họa bất động sản. Chọn mẫu không chèn dữ liệu minh họa vào chiến dịch thật. Draft riêng theo ngành; chuyển ngành không mất nội dung.

## Ảnh và chữ
- Hai lớp độc lập: nền phủ canvas; ảnh chính đúng slot. Không tráo vai trò.
- Giữ bo góc, fit/contain, zoom/pan; xuất PNG/ZIP giống preview.
- Ngành không có ảnh vẫn có layout phù hợp, không để khung trống lớn.
- VI/EN/mixed giữ dấu và ngôn ngữ. Không bịa giá/lương/liên hệ, không lặng lẽ bỏ thông tin dài; phân trang khi cần.

## QC bắt buộc
1. Data: category/template tương thích; dữ liệu ví dụ không rò vào chiến dịch; lưu/khôi phục draft theo ngành.
2. Render: 3 ngành × 2 concept × 3 tỷ lệ; cả không ảnh/nền/ảnh chính/cả hai; tiếng Việt dài và English.
3. Export: đúng tỷ lệ, đủ trang, fonts tải xong, nền và crop giống preview.
4. Visual: review contact sheet của 6 concept với cùng brief trong từng ngành; khác hierarchy, ảnh, detail và cấu trúc, không chỉ đổi màu.
5. Không công bố đạt thương mại chỉ vì TypeScript hoặc canvas tests pass. Anh duyệt chất lượng hình ở bước cuối.

## Bước đang giao Gemini
Contract và 6 concept đợt 1 đã có triển khai, nhưng chưa đạt nghiệm thu thẩm mỹ. Không mở đợt 2.
- Đang chặn: phiên Gemini property-edge chưa trả artifact hoàn chỉnh; không dispatch trùng. Xem IMPLEMENTATION_STATUS.md.
- Ưu tiên sửa: PROPERTY_EDGE_REPAIR.md (nội dung ít/dài ở bất động sản), sau đó CONTACT_MIGRATION_QC.md (liên hệ trong bản nháp cũ).
- QC còn lại: đối chiếu preview/PNG/ZIP cho concept mới, phân trang và hai lớp ảnh độc lập. ZIP legacy và PNG property VI/EN 4:5 mới được kiểm tra phạm vi hẹp.
- Không chạy production build vào .next đang phục vụ dev; cache cũ đã được giữ khi khôi phục runtime.


Checkpoint 2026-10-07 14:45 UTC: prioritize outstanding draft persistence races/durability before renderer expansion. Gemini follow-up active; see DRAFT_ASSET_REVIEW.md revision section and IMPLEMENTATION_STATUS.md. Overall acceptance unchanged.

Checkpoint 2026-10-07 15:40 UTC: controller revision reviewed, asset cache integrity reproduction failed; follow-up pending unlocked Antigravity. See DRAFT_ASSET_REVIEW.md. No expansion.

Checkpoint 2026-10-08 01:54 UTC: Antigravity unlocked; controller integrity review dispatched to Gemini, now working. Await revision; no expansion.

Checkpoint 2026-10-08 02:55 UTC: outgoing edit regression reproduced despite8 passing tests; Gemini bounded follow-up running. Persistence gate still open.

Checkpoint 2026-10-08 03:59 UTC: late outgoing-save timer changes reload category; reproduced and assigned bounded Gemini fix.19 tests/tsc pass but not acceptance.

Checkpoint 2026-10-08 05:02 UTC: outgoing timer repro now passes; browser/native-IDB and raster QC pending locked Mac. No scope expansion.

Checkpoint 2026-10-08 07:00 UTC: Gemini preparing isolated dev browser QC harness under marketing/review; next native-IDB/reload and restored-canvas verification.

Checkpoint 2026-10-08 07:58 UTC: native-browser harness exposed missing QC schema and false-positive inline fallback checks; Gemini repairing harness before further acceptance.

Checkpoint 2026-10-08 09:01 UTC: isolated native IDB6/6 and actual page reload verified; restored main/background PNG inspected. Narrow persistence milestone only; aesthetic/VI-EN/export gates remain.

Checkpoint 2026-10-13 06:40 UTC: provider reports prior story repair interrupted by server restart without edits. One bounded Gemini resume dispatched; await result and independent export QC, no scope expansion.

Checkpoint 2026-10-13 09:46 UTC: legacy agenda source recovery confirmed in actual two-page ZIP PNGs ; standalone PNG byte parity failed and needs investigation;10 focused tests pass. Overall visual acceptance remains open.

Checkpoint 2026-10-13 15:03 UTC: bounded preview/ZIP font-parity investigation dispatched to Gemini; await result and independent cold-browser QC. No scope expansion.

Checkpoint 2026-10-14 07:57 UTC: bounded Gemini completion of partial font-parity helper dispatched; await results before cold-browser QC.

Checkpoint 2026-10-14 10:01 UTC: legacy VI4:5 standalone PNG/ZIP decoded pixels now identical (0/1458000), focused tests6/6. Detached-canvas export parity only; visible preview/cold cache/remaining variants and aesthetic gates still open. Evidence reports/font-parity-r2-20261014.

Checkpoint 2026-10-14 11:12 UTC: visible legacy preview screenshot saved; raw preview parity pending dev-only capture control through Gemini. Antigravity locked; no job dispatched.

Checkpoint 2026-10-14 12:21 UTC: Antigravity still locked; preview-capture task not dispatched. No acceptance change or scope expansion.

Checkpoint 2026-10-14 13:21 UTC: native access still locked; no dispatch or acceptance change.

Checkpoint 2026-10-14 14:23 UTC: Antigravity remains locked; preview-capture task pending, no acceptance change.

Checkpoint 2026-10-14 15:17 UTC: bounded attached-preview capture control dispatched to existing Gemini session; await result then actual preview/export QC.

Checkpoint 2026-10-14 16:30 UTC: attached-preview vs fresh export FAIL37107/1458000 pixels despite7/7focused tests. Evidence reports/attached-preview-20261014; Gemini follow-up unsent because Mac locked.

Checkpoint 2026-10-14 17:27 UTC: existing Gemini session reports active; no duplicate repair dispatch. Actual-preview parity failure remains open.

Checkpoint 2026-10-14 18:41 UTC: Mac locked; prior job status unavailable, no duplicate dispatch or acceptance change.

Checkpoint 2026-10-14 19:38 UTC: native access remains locked; no dispatch or acceptance change.

Checkpoint 2026-10-14 20:39 UTC: Mac remains locked; no dispatch or acceptance change.

Checkpoint 2026-10-14 21:40 UTC: native access still locked; no dispatch or acceptance change.

Checkpoint 2026-10-14 22:48 UTC: Mac remains locked; no dispatch or acceptance change.

Checkpoint 2026-10-14 23:58 UTC: Mac remains locked; no dispatch or acceptance change.

Checkpoint 2026-10-15 00:59 UTC: native access remains locked; no dispatch or acceptance change.

Checkpoint 2026-10-15 01:55 UTC: bounded attached-preview parity repair dispatched to idle Gemini; await result and real raster QC.

Checkpoint 2026-10-15 02:57 UTC: preview/export still FAIL20926pixels; export/ZIP0, tests8/8. Evidence saved; bounded Gemini follow-up running.

Checkpoint 2026-10-15 04:02 UTC: actual legacy preview/PNG/ZIP now0pixel differences. Focused suite Test8 fails brittle600character window; normalize call exists. Preserve concurrent supersampling edits; wider QC pending.

Checkpoint 2026-10-15 05:07 UTC: Mac locked; focused-test repair not dispatched, wider concept/clear QC still pending.

Checkpoint 2026-10-15 06:03 UTC: test-only Gemini repair dispatched; await result, preserve production and supersampling edits.

Checkpoint 2026-10-15 07:02 UTC: focused tests8/8 restored; concept page4 and intentional-clear VI4:5 actual previews inspected, evidence reports/concept-clear-20261015. Wider ZIP/VIEN/visual gates remain.

Checkpoint 2026-10-15 08:07 UTC: concept ZIP four story rasters verified3/3/2/2 and all10items; duplicate display numbering remains. Evidence reports/concept-zip-20261015.

Checkpoint 2026-10-15 09:09 UTC: Antigravity loading surface then noWindowsAvailable; numbering repair not dispatched.

Checkpoint 2026-10-15 10:04 UTC: Antigravity empty window; numbering repair remains unsent.


### 2026-10-15 11:13 UTC — native access timeout
Required checkpoints read. One Antigravity access attempt timed out; conversation/model/idle state cannot be verified. No prompt sent, duplicate job, further retries, fallback implementation or redundant renders/tests. Display-only duplicate numbering repair remains pending; existing raster evidence unchanged. Overall NOT ACCEPTED. Resume bounded Gemini dispatch only when native access and idle session can be verified.


### 2026-10-15 13:57 UTC — Antigravity loading surface persists
Required checkpoints read. One native access attempt returned an empty Antigravity HTML surface at127.0.0.1:52279 with only an image and window controls. No conversation, selected model or composer is available to verify idle state. No prompt sent, duplicate job, further retries, fallback code or redundant tests/renders. Display-only duplicate numbering repair remains pending; prior raster evidence unchanged. Overall NOT ACCEPTED.


### 2026-10-15 14:59 UTC — native access still unavailable
Read required checkpoints. One Antigravity access attempt timed out; cannot verify the existing Gemini conversation or idle state. No dispatch, repeated retry, fallback implementation or redundant render/test run. Duplicate display numbering repair remains pending; previous raster QC evidence unchanged, overall NOT ACCEPTED.


### 2026-10-15 16:11 UTC — native access locked
Read required checkpoints. One Antigravity access attempt reports locked Mac; existing Gemini conversation and idle state remain unverifiable. No prompt sent, duplicate job, repeated retry, provider fallback or redundant tests/renders. Duplicate display numbering repair remains pending; previous raster evidence unchanged. Overall NOT ACCEPTED. Resume when native access returns.


### 2026-10-15 17:38 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac. No dispatch or further retries; existing session idle state remains unverifiable. Duplicate display numbering repair pending; no code changes, redundant tests/renders or broader acceptance. Prior raster evidence unchanged; overall NOT ACCEPTED.


### 2026-10-15 18:39 UTC — locked access unchanged
Read required checkpoints. Single Antigravity access attempt reports locked Mac; Gemini idle state cannot be verified. No dispatch, further retry, fallback code or redundant tests/renders. Display numbering repair remains pending and prior raster evidence unchanged; overall NOT ACCEPTED.


### 2026-10-15 19:56 UTC — locked access unchanged
Required checkpoints read. One native Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retry, fallback implementation or redundant tests/renders. Duplicate numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-15 22:48 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; cannot verify existing Gemini idle state. No dispatch, additional retries, fallback code or redundant tests/renders. Duplicate numbering repair remains pending; prior raster evidence unchanged and overall NOT ACCEPTED.


### 2026-10-15 23:50 UTC — locked access unchanged
Required checkpoints read. Single Antigravity access attempt reports locked Mac; existing Gemini idle state unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Display numbering repair pending; prior raster QC unchanged, overall NOT ACCEPTED.


### 2026-10-16 00:56 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini session idle state remains unverifiable. No dispatch, further retry, fallback code or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 01:59 UTC — native access timeout
Required checkpoints read. Single Antigravity access attempt timed out; existing Gemini conversation/model/idle state remains unverifiable. No dispatch, additional retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 03:02 UTC — native access timeout persists
Required checkpoints read. One Antigravity access attempt timed out; cannot verify existing Gemini conversation/model/idle state. No dispatch, further retry, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 03:58 UTC — native access timeout unchanged
Required checkpoints read. One Antigravity access attempt timed out; existing Gemini conversation/model/idle state cannot be verified. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 05:06 UTC — native access locked
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini conversation/model/idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 06:02 UTC — empty Antigravity surface
Required checkpoints read. One native access attempt returned only an empty HTML surface/image and window controls; conversation, model and composer unavailable. Existing Gemini idle state cannot be verified. No prompt sent, duplicate dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 07:01 UTC — empty Antigravity surface unchanged
Required checkpoints read. One native access attempt returned only an empty HTML surface/image and window controls. No conversation/model/composer available to verify idle Gemini session. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 08:10 UTC — empty Antigravity surface persists
Required checkpoints read. One native access attempt returned only an empty HTML surface/image at127.0.0.1:53044 and window controls. No conversation/model/composer available to verify idle Gemini session. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 09:08 UTC — empty Antigravity surface unchanged
Required checkpoints read. One native access attempt returned only empty HTML/image and window controls; conversation/model/composer unavailable, idle Gemini state unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-16 10:12 UTC — empty Antigravity window persists
Required checkpoints read. One native access attempt returned only empty containers and window controls; no conversation/model/composer to verify idle Gemini session. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 04:01 UTC — empty Antigravity surface persists
Required checkpoints read. One native access attempt returned only empty HTML/image and window controls; conversation/model/composer unavailable, existing Gemini idle state unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 05:06 UTC — native access locked
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini conversation/model/idle state cannot be verified. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 07:55 UTC — empty Antigravity surface persists
Required checkpoints read. One native access attempt returned only empty HTML/image and window controls; conversation/model/composer unavailable, Gemini idle state unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 08:58 UTC — native access timeout
Required checkpoints read. One Antigravity access attempt timed out; existing Gemini conversation/model/idle state cannot be verified. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 10:03 UTC — native access locked
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini conversation/model/idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 11:08 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 12:09 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 13:06 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 14:08 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 15:07 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 16:09 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 17:08 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 18:05 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 19:11 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 20:14 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 21:14 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 22:16 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-18 23:14 UTC — locked access unchanged
Required checkpoints read. One Antigravity access attempt reports locked Mac; existing Gemini idle state remains unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-19 00:24 UTC — empty Antigravity surface persists
Required checkpoints read. One native access attempt returned only empty HTML/image and window controls; conversation/model/composer unavailable, existing Gemini idle state unverifiable. No dispatch, further retries, fallback implementation or redundant tests/renders. Duplicate display numbering repair remains pending; prior raster evidence unchanged, overall NOT ACCEPTED.


### 2026-10-19 01:43 UTC — numbering repair dispatched
Required checkpoints read. Native Antigravity access restored; opened existing Mivy Studio conversation 3f16b73d-1489-49c4-a5a4-08346785b3e0 and verified idle Gemini 3.8 Flash High with prior test-only result. Sent one bounded display-numbering repair using concept ZIP raster evidence, preserving raw source, meaningful numeric content, pagination, parity and concurrent edits. UI confirmed Working/Cancel. Await STORY_NUMBERING_RESULT.md before independent focused tests and actual PNG QC. No duplicate job or acceptance; overall NOT ACCEPTED.


### 2026-10-19 02:40 UTC — numbering tests pass, live fixture discrepancy
Received STORY_NUMBERING_RESULT.md; independent numbering suite7/7 PASS. Actual browser renders inspected: duplicate text prefixes absent, but concept fixture unexpectedly resolves12 items3/3/3/3 by prepending salary/location, contradicting expected10 items3/3/2/2 and test claims. Cause/ownership not established; preserve concurrent edits. Evidence report reports/numbering-20261019/QC.md. PNG download not located, no fresh pixel parity claim. No new dispatch; next inspect resolver/fixture discrepancy then bounded Gemini correction. Overall NOT ACCEPTED.


### 2026-10-19 03:42 UTC — real copy-path repair dispatched
Required checkpoints read. Inspected fixture: buildBalanced10ConceptState uses makeIndustryCopy; concept resolver returns copy.points unchanged. Existing Mivy Studio idle Gemini3.8 FlashHigh verified. Sent bounded investigation/fix for12-vs10 discrepancy, requiring real copy-generator regression coverage and retaining salary/location as metadata, concurrent changes and parity. UI confirmed Working/Cancel. Await STORY_SOURCE_COUNT_RESULT.md then independent actual raster QC. No duplicate job or new acceptance; overall NOT ACCEPTED.
