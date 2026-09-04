# Admin Dashboard — Tài liệu tổng hợp

Tài liệu này mô tả toàn bộ phần **admin dashboard** đã được thêm vào project WenGo/MiniOTA (frontend Next.js) để CRUD dữ liệu qua backend Spring Boot [`kyss18/Mini-OTA`](https://github.com/kyss18/Mini-OTA).

> Backend đã đổi khá nhiều lần kể từ bản đầu tiên (thêm hệ thống Role/Permission thật, đổi model Hotel/Discount, thêm Province/Ward...). Bản tài liệu này khớp với backend đã **test thật qua kết nối MySQL + Redis chạy thật**, không chỉ đọc code tĩnh.

---

## 1. Mục tiêu & bối cảnh

Backend Mini-OTA có sẵn REST API CRUD cho Hotels, Rooms, RoomTypes, Amenities, Views, Users, Discounts, Roles/Permissions... nhưng chưa có giao diện quản trị. Admin dashboard này là trang `/admin` trong chính project Next.js, gọi API sang backend đó qua 1 lớp proxy (xem mục 3–4).

Các quyết định đã hỏi và chốt qua nhiều lần trao đổi:

| Vấn đề | Đã chốt |
|---|---|
| Backend chưa cấu hình CORS | **Proxy qua Next.js API routes** — FE chỉ gọi `/api/admin/*` (cùng origin), route đó gọi tiếp sang backend ở phía server (server-to-server, không bị CORS) |
| Backend giờ **có** hệ thống Role/Permission thật (`@PreAuthorize("hasAuthority(...)")` trên mọi endpoint CRUD, quyền tra từ DB mỗi request) | FE không cần tự chặn theo role nữa — backend đã là lớp bảo mật thật. FE chỉ giữ 1 bước xác nhận nhẹ lúc đăng nhập (xem mục 4.1) |
| 3 lỗ hổng dữ liệu ban đầu (không có API liệt kê tỉnh, không có API liệt kê loại phòng, `Room.roomType` bị ẩn khỏi response) | **Chấp nhận UX giới hạn** — xem mục 7 |
| Có thêm hệ thống Role/Permission (ngoài phạm vi CRUD chốt ban đầu) | **Thêm trang `/admin/roles` cơ bản** — nếu không có trang này thì không có cách nào qua giao diện để cấp quyền cho tài khoản mới |

Phạm vi CRUD: **Hotels + Rooms + RoomTypes + Amenities + Views + Users + Discounts + Roles/Permissions (cơ bản)**.

---

## 2. Công nghệ sử dụng

- **Next.js 16 App Router** (Route Handlers cho backend proxy, Server Component cho auth guard, Client Component cho toàn bộ UI tương tác).
- **TypeScript** — kiểu dữ liệu khớp với DTO/Entity Java thật (đọc trực tiếp từ Java source, có test lại bằng request thật qua backend chạy thật).
- **CSS Modules** — tái dùng `src/styles/controls.module.css` + 2 module CSS riêng cho admin.
- **Cookie-based session** (`httpOnly`) — access token & refresh token giữ ở cookie phía server, không lộ ra JS phía client.
- Không dùng thư viện form/state ngoài, không thêm dependency mới vào `package.json`.

---

## 3. Kiến trúc & luồng dữ liệu

```
Trình duyệt (Client Component)
        │  fetch("/api/admin/hotels", { credentials: "same-origin" })
        ▼
Next.js Route Handler  (src/app/api/admin/[...path]/route.ts)
        │  đọc cookie access token, gắn "Authorization: Bearer ..."
        │  fetch(`${ADMIN_API_BASE_URL}/hotels`)      ← server-to-server, không bị CORS
        ▼
Backend Spring Boot (Mini-OTA, localhost:8080/api/v1/...)
        │  @PreAuthorize("hasAuthority('HOTEL_READ')") tự tra quyền từ DB theo user.id trong JWT
        ▼
{ statuscode, error, message, data }   ← envelope bọc MỌI response (FormatResponse.java)
```

- Envelope `{statuscode, error, message, data}` được bóc tự động trong `apiClient.ts` — phần còn lại của code chỉ làm việc với dữ liệu thật (`data`), không cần biết envelope tồn tại.
- Không có state quản lý toàn cục — mỗi trang tự fetch dữ liệu qua `src/lib/admin/resources.ts`.
- Không có SSR data-fetching cho các trang CRUD (Client Component, fetch trong `useEffect`) — chỉ bước kiểm tra đăng nhập (`layout.tsx`) chạy ở server.

---

## 4. Luồng xác thực (auth flow)

### 4.1. Đăng nhập thật — không còn dựa vào "role" trong JWT

Thay đổi quan trọng so với bản đầu: **JWT giờ không mang role/permission nào đáng tin cả**. Quyền thật được backend tự tra lại từ DB (bảng `Role` ↔ `Permission` ↔ `User`) ở **mỗi request**, qua `CustomJwtAuthenticationConverter` (dựa vào `user.id` trong JWT). JWT chỉ còn mang `sub`, `user: {id, email, name}`, `iat`, `exp`.

Luồng đăng nhập (`POST /api/admin/auth/login`):
1. Gọi `POST {backend}/auth/login` → backend trả `{ data: { access_token, user }, ... }` (đã bọc envelope) + set cookie `refresh-token-Mini`.
2. **Không đọc role từ JWT nữa.** Thay vào đó, gọi thử `GET {backend}/roles` (cần authority `ROLE_READ`, hiện chỉ `ROLE_ADMIN` có sẵn) bằng chính access token vừa nhận — 200 nghĩa là tài khoản có quyền quản trị thật, 403 nghĩa là đăng nhập đúng mật khẩu nhưng không đủ quyền vào `/admin`.
3. Nếu qua được bước 2: set 2 cookie **của chính Next.js** (`mota_admin_at`, `mota_admin_rt`, `httpOnly`), lấy refresh token thật từ header `Set-Cookie` mà backend trả (phải tự parse thủ công vì đây là gọi server-to-server, trình duyệt không tự nhận cookie đó).

### 4.2. Guard mọi trang trong `/admin` — giờ chỉ còn là UX, không phải lớp bảo mật

`src/app/admin/(dashboard)/layout.tsx` chạy trên server mỗi lần vào trang con: chỉ kiểm tra **có cookie + JWT chưa hết hạn** — **không kiểm tra role nữa** (JWT không còn mang role đáng tin, xem 4.1). Bảo mật thật giờ nằm hoàn toàn ở backend (`@PreAuthorize` theo permission thật) — đây là điểm khác biệt lớn so với bản đầu, khi backend chưa chặn gì cả và FE phải tự gánh vai trò đó.

### 4.3. Gọi API CRUD (proxy + tự làm mới token)

`src/app/api/admin/[...path]/route.ts` — không đổi so với bản đầu: gắn `Authorization: Bearer`, forward request, tự gọi `/auth/refresh` và thử lại 1 lần nếu gặp 401, xoá cookie nếu refresh cũng thất bại.

---

## 5. Danh sách file (cập nhật)

### 5.1. Lớp dữ liệu & API client (`src/lib/admin/`)

| File | Vai trò |
|---|---|
| `types.ts` | Interface khớp DTO/Entity Java thật, đã test qua request thật: `Hotel` (gắn `Ward`, không còn `Province` trực tiếp), `Room`, `RoomType`, `Amenity`, `View`, `AppUser`, `Discount` (`discountValue`+`unit`, không còn ngày), `DiscountDetail` (ngày áp dụng theo từng phòng), `Role`, `Permission`, `Ward`, `Province`, `BackendEnvelope<T>`. |
| `session.ts` | Cookie helpers, `decodeAdminJwt()`, `extractBackendRefreshCookie()`, `refreshBackendSession()` (đã sửa để bóc envelope `.data`), **`probeAdminAccess()`** (mới — gọi thử `GET /roles` để xác nhận quyền admin thật lúc login). |
| `apiClient.ts` | `adminFetch<T>()` — đã thêm bước tự bóc `{data, error, message, statuscode}` ở response thành công. |
| `resources.ts` | Toàn bộ hàm gọi API theo resource — đã cập nhật cho model mới: `createHotel`/`updateHotel` dùng `wardId`, `createRoom` tự gắn `discount_id: []` (né bug backend, xem mục 6), `attachDiscountToRoom`/`detachDiscountFromRoom` theo model discount mới, thêm `listRoles`/`createRole`/`replaceRolePermissions`/`assignUserRoles`/`derivePermissionCatalog`. |

### 5.2. Route nội bộ Next.js (`src/app/api/admin/`) — không đổi cấu trúc

`auth/login/route.ts` (đã cập nhật: bóc envelope + gọi `probeAdminAccess`), `auth/logout/route.ts`, `[...path]/route.ts`.

### 5.3. Giao diện dùng chung (`src/components/admin/`)

Không đổi cấu trúc so với bản đầu (`AdminShell`, `adminPage.module.css`, `NameIconManager`, `RoomCard`) — `RoomCard` đã sửa lại phần hướng nhìn vì `Room.views` bị `@JsonIgnore` (xem mục 7).

### 5.4. Các trang (`src/app/admin/`)

| Route | Ghi chú thay đổi |
|---|---|
| `/admin/hotels`, `/admin/hotels/new`, `/admin/hotels/[id]` | `provinceId` → **`wardId`**; địa chỉ nhập vào chỉ là "số nhà, tên đường", backend tự nối thêm tên phường + tỉnh. |
| `/admin/roomtypes` | Không đổi (vẫn tra theo ID, không có list-all). |
| `/admin/amenities`, `/admin/views` | Không đổi. |
| `/admin/users` | Bỏ hẳn dropdown "Vai trò" cũ (CUSTOMER/ADMIN, cosmetic không cấp quyền) — field "Vai trò" giờ là danh sách role thật (checkbox, lấy từ `listRoles()`), gán qua `POST /users/{id}/roles`, cùng cơ chế với trang Phân quyền. Xem mục 6 về bug `id: null`. |
| `/admin/roles` | **Trang mới** — 1 form dùng chung cho cả Tạo role và Sửa quyền (bấm "Sửa quyền" ở 1 role trong bảng sẽ nạp dữ liệu role đó vào form phía trên, cuộn lên tự động, disable field tên/level/mô tả vì không sửa được). Danh sách quyền lấy gián tiếp từ các role đang có (vì `GET /permissions` là stub luôn trả `null`). Gán role cho user thực hiện ở trang Người dùng. |
| `/admin/discounts` | Viết lại hoàn toàn theo model mới: Discount chỉ là `{discountValue, unit}`, ngày áp dụng gắn theo từng phòng qua `POST /room/{id}/discounts`. |

---

## 6. Bug backend đã xác nhận qua test thật (không phải đoán từ đọc code)

| Bug | Cách phát hiện | Cách FE xử lý |
|---|---|---|
| **`POST /rooms` luôn lỗi "Ids must not be null" nếu không gửi `discount_id`** | Test tạo phòng qua UI thật → lỗi 400; cô lập bằng curl từng field → xác định `RoomService.create_room` gọi `discountRepository.findAllById(discount_id)` **không kiểm tra null**, trong khi field này không bắt buộc theo DTO | `createRoom()` trong `resources.ts` luôn tự gắn thêm `discount_id: []` vào payload, dù field này không dùng vào việc gì |
| **`GET /users` (danh sách phân trang) luôn trả `id: null` cho mọi user**, dù `GET /users/{id}` đơn lẻ thì đúng | Test trang Users thật → React báo "duplicate key" (vì mọi row đều `key=null`) → so sánh response 2 endpoint bằng curl, xác nhận khác nhau | Dùng `email` làm React key thay vì `id`. Nút **Sửa** vẫn luôn mở được form (kể cả khối "Gán role thật" bên trong) — nếu `id` thiếu, form hiện thêm ô nhập tay "User ID" bắt buộc trước khi Cập nhật/Gán được. Nút **Xoá** ở ngoài bảng vẫn cần `id` thật (destructive, không cho đoán) — phải vào form Sửa, nhập ID rồi thao tác từ đó |
| `PATCH /roles/{id}` luôn trả `null`, không sửa gì (stub) | Đọc code backend | Trang Roles không có chức năng "sửa tên/level" — chỉ tạo mới, xoá, và thay bộ quyền |
| `GET /permissions` và `GET /permissions/{id}` luôn trả `null` (stub) | Đọc code backend | Không dùng 2 endpoint này — danh sách quyền lấy gián tiếp bằng cách gộp `permissions` từ tất cả role đang có (`derivePermissionCatalog`) |
| `DELETE /discounts` (gỡ khuyến mãi khỏi phòng) xác thực dữ liệu nhưng **không thật sự xoá** (logic bị comment trong `DiscountService`) | Đọc code backend | Trang Discounts vẫn gọi đúng API này nhưng hiển thị cảnh báo cố định là chưa hoạt động, không giả vờ báo thành công |
| `Room.views` bị `@JsonIgnore` — API không bao giờ trả lại hướng nhìn hiện tại của 1 phòng | Đọc code backend, khớp với hành vi thật quan sát được | `RoomCard` không hiển thị được hướng nhìn hiện tại; chỉ có ô "thêm" (chọn mù) và ô "gỡ" (chọn theo tên, không theo trạng thái hiện tại) |
| `POST /users/{userId}/roles` trả về **entity `User` thô**, lộ cả `password` (hash bcrypt) và `refreshToken` trong JSON | Quan sát response thật lúc test | FE không đọc/hiển thị response này (chỉ quan tâm thành công hay lỗi) nên không lộ ra giao diện, nhưng đáng lưu ý nếu sau này có ai log response này ra |
| `DELETE /roles/{id}` trả lỗi thô HTTP 500 (không qua envelope, không thông báo rõ ràng) nếu role đó đang được gán cho user nào đó | Test xoá role thật khi còn user gán role đó | Không xử lý đặc biệt — người dùng sẽ thấy thông báo lỗi chung, cần tự gỡ role khỏi user trước khi xoá |
| ~~⚠️ Nghiêm trọng — `PUT /users` (update) không có `@Valid`, và `UserService.update` ghi `user.setPassword(req.getPassword())` thẳng không hash lại~~ **ĐÃ SỬA** (lúc làm flow đăng ký/đăng nhập/cập nhật hồ sơ công khai — xem mục 10). `UserService.update` giờ chỉ hash+lưu password khi field không rỗng (`passwordEncoder.encode(...)`), để trống nghĩa là giữ nguyên password cũ, không còn ghi đè bằng chuỗi rỗng nữa. `ReqUpdateUserDTO.password` cũng bỏ `@NotBlank`. Trang Users của admin **không còn bắt buộc phải luôn nhập lại password mỗi lần Sửa** nữa (workaround cũ ở `handleSubmit` vẫn còn bắt nhập — có thể nới ra sau, không cấp thiết) | Test thật: `PUT /users` không gửi field `password` → login lại bằng password cũ vẫn được; gửi password mới → login bằng password mới được, password cũ bị từ chối | — |
| **⚠️ Nghiêm trọng — `DELETE /hotels/{id}` trả 403 "Access Denied" ngay cả với tài khoản `admin@gmail.com` (ROLE_ADMIN đầy đủ quyền).** Khách sạn một khi tạo xong không xoá được qua API/UI nữa trong mọi trường hợp — không phải thiếu quyền của riêng 1 tài khoản, mà có vẻ như thiếu hẳn cấu hình `@PreAuthorize` đúng cho action xoá hotel (hoặc quyền `HOTEL_DELETE` chưa được gán cho ROLE_ADMIN lúc seed). Hệ quả trực tiếp: đã tạo dư 1 khách sạn test (`__probe_ward_1`, id=5, ward "Thanh My Tay") lúc dò `wardId` cho việc seed dữ liệu thật — **không xoá được, cần bạn tự `DELETE FROM hotels WHERE id = 5;` thẳng qua MySQL** | Test thật: `DELETE /hotels/{id}` bằng curl VÀ bằng nút "Xoá" ở giao diện admin thật (cùng tài khoản `admin@gmail.com`) đều trả 403 như nhau | Chưa seed thêm dữ liệu hotel/room thật nào cho tới khi bug này được sửa — mọi lần tạo sai sẽ không xoá lại được qua API, chỉ có thể sửa qua DB trực tiếp. Cần kiểm tra lại `@PreAuthorize` trên `HotelController.delete` và quyền `HOTEL_DELETE` (hoặc tên tương đương) đã thật sự gán cho ROLE_ADMIN chưa |
| **⚠️ Nghiêm trọng — role có 0 quyền biến mất khỏi API và không thể sửa/xoá lại được nữa.** `RoleRepository.findAllRoles()` và `findRoleById()` dùng `join fetch r.permissions` (**inner join**, không phải `left join fetch`) — role nào có 0 permission bị loại thẳng khỏi kết quả. Vì `DELETE /roles/{id}` và `PUT /roles/{id}/permissions` đều gọi `findRoleById()` trước khi thao tác, nên 1 role rơi vào trạng thái 0 quyền sẽ: biến mất khỏi bảng ở trang Phân quyền, `DELETE` trả 404 "Role not found", và **`PUT .../permissions` cũng không gán lại quyền được nữa** (cùng lỗi lookup) — tức là kẹt vĩnh viễn, chỉ gỡ được bằng cách connect thẳng DB (`DELETE FROM roles WHERE ...`). Tình huống này xảy ra tự nhiên chỉ bằng cách: tạo role mới mà không tick quyền nào, HOẶC vào "Sửa quyền" một role đang có sẵn rồi bấm "Bỏ chọn tất cả" → Lưu | Test thật: tạo role qua UI không chọn quyền nào → API trả 200 tạo thành công (role thật sự có trong DB, verify bằng `SELECT * FROM roles`) nhưng biến mất khỏi bảng ngay khi list lại; gọi `DELETE`/`PUT permissions` cho role đó đều trả lỗi | Không có cách né an toàn 100% từ FE (không có role để hiển thị nghĩa là không cản được thao tác) — cách giảm thiểu: **luôn chọn ít nhất 1 quyền khi tạo role**, và cẩn thận khi bấm "Bỏ chọn tất cả" trong lúc sửa quyền 1 role đang dùng thật. Cần sửa backend: đổi `join fetch r.permissions` thành `left join fetch r.permissions` ở cả `findAllRoles()` và `findRoleById()` |
| ~~**⚠️ Nghiêm trọng — khách tự đăng ký (`POST /users` không gửi `role`) thì `role` = null trong DB, và lần đăng nhập đầu tiên crash cứng**~~ **ĐÃ SỬA**. `JwtUtils.createRefToken` gọi `.claim("role", userDetailloading.getRole())` — `JwtClaimsSet.Builder.claim()` ném `IllegalArgumentException("value cannot be null")` khi value null, exception này lọt qua `ExceptionTranslationFilter` nên trả về y hệt lỗi JWT sai (401, `message:"Token incorrect"`, `error:"Access Denied"`) dù email/password đúng 100% — cực khó debug từ phía FE vì trông y hệt lỗi token. Xác nhận nguyên nhân thật bằng 1 JUnit test tạm gọi thẳng `AuthenticationManager`/`JwtUtils` (không phải đoán từ đọc code). Sửa tại gốc: `UserService.create_user` mặc định `role = RoleEnum.CUSTOMER` khi request không gửi field này | JUnit test tạm gọi `authenticationManager.authenticate()` rồi `jwtUtils.createRefToken()` từng bước → bắt được đúng dòng ném `IllegalArgumentException` | — |
| ~~**⚠️ Nghiêm trọng — khách thường không có cách nào tự đọc/sửa hồ sơ của chính mình.**~~ **ĐÃ SỬA**. `GET /users/{id}` và `PUT /users` yêu cầu cứng quyền `USER_READ`/`USER_UPDATE` (quyền admin, cấp qua bảng Role/Permission) — 1 khách tự đăng ký không có Role nào nên luôn bị 403, kể cả khi tự đọc/sửa đúng hồ sơ của chính mình. Đã nới: cả 2 endpoint đổi `@PreAuthorize` thành `isAuthenticated()`, rồi tự kiểm tra "id trong request có trùng id lấy từ JWT của người gọi không" (self) HOẶC có quyền `USER_READ`/`USER_UPDATE` thật (admin sửa user khác) mới cho qua — đối chiếu id lấy từ JWT (`JwtUtils.getIdUserLogin()`), không tin `req.getId()`/path param mù quáng. Tự sửa hồ sơ mình (không có quyền admin) thì **không được đổi field `role`** — chặn đường tự nâng quyền lên ADMIN qua chính API sửa hồ sơ | Test thật bằng curl: khách tự đăng ký gọi `PUT /users` với chính id của mình → trước 403, sau 200; thử gửi kèm `role:"ADMIN"` trong lúc tự sửa → role vẫn giữ nguyên `CUSTOMER` (không escalate được); admin có `USER_UPDATE` vẫn sửa/đổi role user khác bình thường (backward-compat) | — |
| ~~**⚠️ `GET /users/{id}` crash 500 "Unable to connect to Redis" nếu Redis không chạy**~~ **ĐÃ SỬA**. `UserService.fetch_id` có `@Cacheable(value="users", key="#id")` dùng Redis làm cache — Redis không phải lúc nào cũng có sẵn ở máy dev (không cài, không chạy Docker), nên method này (giờ được gọi liên tục bởi trang `/account`) **crash cứng** thay vì chỉ chậm hơn vì mất cache. Đã bỏ `@Cacheable` khỏi `fetch_id` — tra theo id đã có primary key index, không cần cache thêm | Test thật `curl GET /users/{id}` khi Redis không chạy → 500 kèm stack trace `RedisConnectionFailureException` | — |

**Seed dữ liệu thật đầy đủ từ mock frontend** (không phải bug — ghi lại cách đã làm, để tham khảo/bảo trì sau này):

Backend seed qua API (dùng 1 tài khoản admin) không khả thi cho việc này — **đính chính**: từng nghi ngờ lỗi "Hotel already exists" (409) do trùng `latitude`+`longitude`, SAI; đọc thẳng source (`HotelService.create`) mới xác nhận thật ra là `hotelRepository.existsByUserId(user_id)` — **1 user chỉ tạo được đúng 1 hotel** (`@OneToOne` giữa `Hotel.user`/`User.hotel`). Cộng thêm bug `DELETE /hotels` 403 (mục 6) khiến sai sót không sửa lại được. Vì vậy chuyển hẳn sang seed trực tiếp trong `StartupRunner.java` (`seedHotelsAndRooms()`), không qua API:

- Sinh dữ liệu bằng script Node (`generate-seed-full.ts`, không còn trong repo — chạy 1 lần rồi bỏ) dùng ĐÚNG logic sinh phòng deterministic của frontend (`generateRoomsForHotel`, mulberry32) + ward/tỉnh lấy tên thật từ `vn-provinces-wards.json` (5 ward đầu mỗi tỉnh) → ghi ra `src/main/resources/seed/hotels-rooms.json`.
- Seed đầy đủ: **TOÀN BỘ 34 tỉnh** (không giới hạn chỉ tỉnh có khách sạn — để sau này tạo khách sạn mới/lọc theo địa điểm ở bất kỳ đâu tại VN đều có dữ liệu chọn) × TOÀN BỘ ward mỗi tỉnh = **3321 ward**, **6 RoomType**, **12 Amenity** (kèm icon slug tự đặt), **2 View** ("View biển"/"View thành phố" — tách riêng khỏi Amenity cho đúng model backend), **100 khách sạn**, **1300 phòng**.
- **Tên ward KHÔNG duy nhất toàn quốc** (245/2994 tên bị trùng giữa các tỉnh, vd. nhiều tỉnh cùng có "Phường Việt Hưng") — tra ward phải khoá theo cặp **(tên tỉnh, tên ward)**, không phải chỉ theo tên ward, nếu không sẽ gán nhầm sang ward của tỉnh khác. Idempotent-check cũng đối chiếu cả số ward lẫn số phòng (khác 1 trong 2 thì wipe+seed lại).
- Mỗi khách sạn seed kèm 1 user "owner" tổng hợp riêng (`seed.ownerN@miniota.local`, role `ROLE_OWNER`) — vì `Hotel.user` là quan hệ 1-1 bắt buộc về mặt truy vấn (`RoomRepository.findDetail` dùng `JOIN FETCH hotel.user`, hotel không có user sẽ làm phòng của nó không tra được).
- Cơ chế idempotent: so khớp **số phòng hiện có** với số phòng trong JSON — khớp thì bỏ qua (đã seed đúng bộ này), khác 0 thì `wipeSeedData()` xoá sạch (hotel/room/roomtype/amenity/view/ward/province + user "owner", KHÔNG đụng `admin@gmail.com`/`utkim113@gmail.com`) rồi seed lại từ đầu, bằng 0 thì seed mới. Tự "nâng cấp" nếu sau này cập nhật JSON với phạm vi rộng hơn, không cần sửa code lần nữa.
- Bọc `@Transactional` toàn bộ (kể cả bước xoá) — lỗi giữa chừng rollback sạch, không để lại dữ liệu dở dang.
- Ward gán cho từng khách sạn: đối chiếu tên ward xuất hiện trong `address` mock (bỏ dấu, so khớp chuỗi con), không khớp thì round-robin trong các ward của đúng tỉnh đó — không phải khớp chính xác 100% với vị trí thật (vd. khách sạn ở Phú Quốc có thể rơi vào 1 ward không phải Phú Quốc trong tỉnh An Giang sau sáp nhập), chấp nhận được cho mục đích seed demo.

---

## 7. Giới hạn UX đã biết (do backend thiếu API, không phải bug)

| Giới hạn | Ảnh hưởng | Cách FE xử lý |
|---|---|---|
| `GET /provinces` chỉ trả **tên** tỉnh (string[]), không có id | Không dùng được để làm dropdown | Chỉ hiện làm text tham khảo trên form tạo khách sạn |
| `GET /wards/provinces/{id}` cũng chỉ trả tên, và `{id}` đó lại là province id (thứ không có sẵn id) | Không thể chain 2 API này để lấy ward id | Không dùng — Ward ID phải nhập tay, tra theo cột "Phường/xã" ở bảng khách sạn đã có (field đó *có* id thật vì nằm lồng trong response khách sạn) |
| Không có `GET /roomtype` (list toàn bộ) | Không thể hiện danh sách loại phòng để chọn | Trang riêng: tạo mới + tra theo ID; lúc tạo phòng phải tự gõ Room type ID |
| `PUT /rooms` (update) chỉ **cộng thêm** amenities/views, không thay thế | Gửi mảng rỗng không xoá cái đã có (an toàn) nhưng không "ghi đè" được | Gỡ tiện nghi/hướng nhìn dùng riêng `DELETE /relationships` |

---

## 8. Cách chạy thử

1. **Backend**: cần MySQL (`localhost:3306`, DB `Mini_OTA`) và Redis (`localhost:6379`) đang chạy, rồi khởi động Spring Boot app — mặc định `http://localhost:8080`.
2. **Tài khoản ADMIN có sẵn** — `StartupRunner.java` tự seed lúc khởi động lần đầu (nếu chưa có user với email này):
   - Email: `admin@gmail.com` / Mật khẩu: `123456` — có role `ROLE_ADMIN` với đầy đủ quyền, dùng đăng nhập `/admin/login` được ngay, không cần tạo tay.
3. **Frontend**: `npm run dev`, mở `http://localhost:3000/admin/login`, đăng nhập bằng tài khoản trên.

---

## 9. Hướng nâng cấp nếu cần sau này

- **Cần thêm cột `hotelId` vào bảng User** (đã thống nhất trước, sẽ tự thêm) —
  `null`/không có = tài khoản không thuộc khách sạn cụ thể (Admin toàn hệ
  thống), có giá trị = tài khoản Manager/Staff/Reception phụ trách đúng
  khách sạn đó. FE đã chuẩn bị sẵn ở trang `/admin/users`: form Thêm/Sửa có
  dropdown "Khách sạn phụ trách" (gửi `hotelId` trong `UserInput`), bảng
  danh sách có thêm cột "Khách sạn". Đã test với DB rỗng (0 khách sạn) —
  dropdown chỉ còn tuỳ chọn mặc định, tạo user với `hotelId: null` chạy
  đúng; **chưa test được trường hợp chọn 1 khách sạn thật** vì DB test hiện
  không có khách sạn nào và việc tự tạo 1 khách sạn mới bị vướng đúng gotcha
  "Ward ID phải nhập tay" đã ghi ở mục 7 (không có hàng nào sẵn để tra ward
  id). Nên tự test lại bước chọn khách sạn thật sau khi có dữ liệu.
- **Cần thêm `GET /auth/me`** — trả về danh tính + role thật (dùng lại đúng
  `Role`/`Permission` đã có) của CHÍNH user đang đăng nhập (suy theo user.id
  trong JWT, cùng cơ chế đã dùng cho `@PreAuthorize`), bọc trong envelope
  chuẩn như mọi endpoint khác. Đây là bước chuẩn bị cho việc thêm role
  Manager/Staff (quản lý trong phạm vi 1 khách sạn, quyền hẹp hơn Admin) —
  FE đã có sẵn `AdminAccessProvider` (`src/components/admin/`) đọc endpoint
  này để ẩn/hiện nav (`AdminShell.tsx`) và nút hành động (mẫu ở
  `/admin/hotels`) theo quyền thật, nhưng **hiện fail-open hoàn toàn** (hiện
  tất cả) vì endpoint chưa tồn tại — đã tự kiểm chứng bằng đăng nhập thật:
  `/auth/me` trả 400. `probeAdminAccess` (cổng đăng nhập) CỐ Ý không đổi
  sang endpoint này — vẫn dùng `GET /roles` như cũ, vì đổi sẽ khoá mọi tài
  khoản khỏi `/admin` (kể cả admin thật) cho tới khi endpoint tồn tại. Sau
  khi thêm endpoint: đổi `probeAdminAccess` trong `session.ts` sang gọi
  `fetchMe()` + kiểm tra `roles.length > 0` (đã viết sẵn, đang bị comment
  giải thích tại sao chưa dùng), và xác nhận lại các chuỗi `module` đang suy
  đoán trong `AdminShell.tsx`/`hotels/page.tsx` khớp với dữ liệu `Permission`
  thật (xem qua trang `/admin/roles`).
- ~~**Ưu tiên cao nhất**: thêm `@Valid` vào `UserController.update`, và sửa `UserService.update` chỉ gọi `passwordEncoder.encode()` + `setPassword()` khi `req.getPassword()` khác rỗng/null~~ **ĐÃ SỬA** (mục 6, mục 10).
- **Ưu tiên cao**: đổi `join fetch r.permissions` → `left join fetch r.permissions` trong `RoleRepository.findAllRoles()` và `findRoleById()` — hiện tại role 0 quyền bị kẹt vĩnh viễn (không list, không sửa, không xoá được qua API) (mục 6).
- Sửa `RoomService.create_room` để kiểm tra `discount_id != null` trước khi gọi `findAllById` (bug mục 6, đang phải né bằng cách luôn gửi `[]` từ FE).
- Sửa mapping `id` trong `UserService.fetch_all` (danh sách user) để khớp với `fetch_id` (đơn lẻ) — hiện danh sách luôn trả `id: null`.
- Cài lại `PATCH /roles/{id}` (hiện là stub trả `null`, dù `RoleService.update_role` đã viết đầy đủ, chỉ chưa nối vào controller) và `GET /permissions` (hiện cũng stub) — 2 endpoint này xong thì trang Roles có thể làm đầy đủ hơn (sửa role, danh sách quyền không cần suy ra gián tiếp).
- Cài lại logic xoá thật trong `DiscountService.delete_arr_room` (hiện bị comment).
- Bỏ `@JsonIgnore` trên `Room.views` (hoặc thêm field riêng trả về danh sách view hiện tại) để hiển thị được trên `RoomCard`.
- Thêm endpoint trả `{id, name}` cho provinces/wards (thay vì chỉ tên) để bỏ được ô nhập Ward ID thủ công.
- Nếu deploy thật: đổi `ADMIN_API_BASE_URL` sang domain backend thật; CORS không cần cấu hình gì thêm vì kiến trúc vẫn qua proxy.

---

## 10. Luồng đăng ký / đăng nhập / cập nhật hồ sơ công khai (khách hàng, không phải admin)

Kiến trúc **giống hệt** admin (mục 4 + 5.1/5.2) — cùng backend, cùng cơ chế
BFF proxy (cookie httpOnly, tự refresh token) — chỉ tách riêng cookie/route
để 2 phiên (admin, khách) không đá nhau. Đây là nơi phát hiện + sửa 3 bug
backend thật ở mục 6 (role null crash login, self-read/self-update bị chặn
quyền admin, `GET /users/{id}` crash nếu thiếu Redis).

**File mới**:
- `src/lib/auth/{types,session,apiClient,resources}.ts` — bản song song của
  `src/lib/admin/*` cho khách, gọi qua `/api/account/*`. Cookie riêng
  `mota_acc_at`/`mota_acc_rt`.
- `src/app/api/account/auth/{login,register,logout}/route.ts` +
  `src/app/api/account/[...path]/route.ts` (proxy chung đã đăng nhập) +
  `src/app/api/account/session/route.ts` (đọc cookie httpOnly server-side,
  trả `{user}` cho client hydrate — access token không lộ ra JS được).
  `register` gọi `POST /users` (public thật) rồi **tự đăng nhập luôn** bằng
  đúng email/password vừa tạo, để khách không phải tự bấm đăng nhập lần nữa
  sau khi đăng ký.
- `src/components/auth/AccountProvider.tsx` — Context toàn site (mount ở
  `src/app/layout.tsx`), expose `user/ready/login/register/logout/patchUser`.
  `SiteHeader.tsx` đọc context này để đổi "Đăng nhập/Đăng ký" ⇄ "Xin chào X /
  Đăng xuất". `patchUser()` chỉ đồng bộ tên hiển thị phía client ngay sau khi
  sửa hồ sơ — KHÔNG cập nhật lại claim trong JWT (tên trong token chỉ đúng
  lại sau lần đăng nhập/refresh kế tiếp, không ảnh hưởng gì vì token không
  dùng tên để quyết định quyền).
- `src/app/account/{page.tsx,AccountView.tsx,account.module.css}` — trang
  hồ sơ, tự tải qua `GET /users/{id}` (self), sửa qua `PUT /users`. Mật khẩu
  mới để trống = giữ nguyên (đúng hành vi backend đã sửa ở mục 6).
- Trang `/signup`, `/login` (đã có sẵn từ trước, trước đây chỉ `console.log`)
  — nối vào `useAccount().login/register` thật.

**Quyết định kiến trúc đã hỏi ý kiến trước khi làm** (khách tự sửa hồ sơ
mình cần quyền gì): chọn nới `@PreAuthorize` của `GET/PUT /users` thành
`isAuthenticated()` rồi tự so khớp id trong JWT (self) hoặc quyền admin thật
trong `UserService`/`UserController`, thay vì cấp sẵn 1 Role "Khách hàng"
có `USER_UPDATE` cho mọi user mới (phương án còn lại được đưa ra) — tránh
phải tạo thêm Role/Permission mới trong hệ thống chỉ để có tác dụng tương
đương "sửa hồ sơ mình", và không có nguy cơ tự nâng quyền qua field `role`
nếu lỡ quên chặn ở đâu đó.

`usernameFromEmail()` trong `signup/page.tsx` tự sinh `username` từ email
(backend bắt buộc field này, form không có ô riêng — OTA thật thường ẩn
khái niệm username, chỉ cần email+password).

---

## 11. Mở API xem/wishlist/đặt phòng cho khách chưa đăng nhập + audit quyền CUSTOMER

Yêu cầu gốc: khách chưa đăng nhập vẫn xem được hotel/room, add wishlist, và
đặt phòng — chỉ bước "book" mới thật sự cần lưu DB (không cần tài khoản).
Kèm theo: rà lại xem Role "CUSTOMER" (tự tạo tay ở trang Phân quyền) đã đủ
quyền chưa, và quyết định wishlist lưu DB hay session.

### 11.1. Public GET — xem hotel/room không cần đăng nhập

**Cơ chế 2 lớp phải sửa ĐỦ CẢ HAI, thiếu 1 lớp vẫn bị chặn**: (1)
`SecurityConfig.authorizeHttpRequests` (filter chain — chặn trước khi vào
tới controller) và (2) `@PreAuthorize` ở method (chặn sau, dù filter đã cho
qua). Đã tự tay xác nhận: gỡ `@PreAuthorize` mà không sửa filter chain vẫn
401; thêm path vào filter chain mà không gỡ `@PreAuthorize` vẫn 403.

Thêm `PUBLIC_GET_ENDPOINTS` (chỉ áp dụng cho **GET**, dùng
`requestMatchers(HttpMethod.GET, ...)` — KHÔNG dùng chung `PUBLIC_ENDPOINTS`
cũ vì đó permitAll theo path bất kể method, sẽ lỡ mở luôn cả tạo/sửa/xoá):
`GET /hotels`, `/hotels/{id}`, `/rooms/{id}`, `/amenity`, `/view`,
`/roomtype/{id}`, `/hotels/{id}/reviews`, `/rooms/{id}/reviews`,
`/reviews/{id}`, `/provinces`, `/wards/provinces/{id}`. Gỡ `@PreAuthorize`
tương ứng ở `HotelController` (`getById`, `hotelPaginate`),
`RoomController.fetch_room`, `AmenityController.get`, `ViewController.getAll`,
`RoomTypeController.fetch_id`, `ReviewController` (3 hàm GET). Đã test thật:
GET không token → 200; POST/PUT/DELETE cùng path không token → vẫn 401 như
cũ (không bị lỡ mở).

Không có endpoint "GET all rooms" phẳng nào cả — duyệt phòng luôn qua
`rooms` lồng trong response `GET /hotels/{id}`, hoặc `GET /rooms/{id}` cho 1
phòng cụ thể. `GET /rooms/me` KHÔNG phải "xem phòng công khai" dù tên gây
hiểu lầm — đây là API cho chủ khách sạn xem phòng của hotel mình
(`RoomService.show_available_room` → `findAllRoomByUser`), giữ nguyên yêu
cầu đăng nhập.

### 11.2. 🔴 Lỗ hổng bảo mật thật phát hiện khi mở review công khai — đã vá

Mở `GET /hotels/{id}/reviews` v.v. công khai (11.1) làm lộ ra 1 bug rò rỉ dữ
liệu **nghiêm trọng có sẵn từ trước**, giờ mới thật sự khai thác được bởi
BẤT KỲ ai (kể cả chưa đăng nhập): `Review.user` không có `@JsonIgnore`, nên
mọi response review trả thẳng **toàn bộ entity `User`** của người viết —
gồm cả `password` (hash bcrypt) và **`refreshToken` — 1 token còn hiệu lực,
dùng lại được để mạo danh đăng nhập người đó** (giống hệt bug đã biết từ
trước ở `POST /users/{userId}/roles`, xem mục 6, nhưng bug đó chưa từng bị
khai thác được vì cần đăng nhập trước; bug này thì không).

Đã vá theo 2 lớp:
1. `User.password` và `User.refreshToken` thêm `@JsonIgnore` thẳng ở entity
   — 2 field này không có lý do gì để lộ ra JSON dù ở bất cứ endpoint nào,
   sửa 1 lần chặn được ở MỌI chỗ (kể cả bug cũ ở mục 6).
2. `Review.user` thêm `@JsonIgnoreProperties({"email","phone","role","roles",
   "createdBy","updatedBy","discounts","hotel","wishlist"})` — response
   review giờ chỉ còn `id/fullName/userName/createdAt/updatedAt` của người
   viết, đủ để hiển thị "reviewed by X" mà không lộ PII (email/sđt) hay cấu
   trúc quyền nội bộ cho khách vãng lai xem review công khai.

Test thật xác nhận trước/sau: gọi `GET /hotels/{id}/reviews` không token,
so sánh field `user` trong response.

### 11.3. Audit quyền Role "CUSTOMER" — tìm thấy 3 vấn đề thật, đã sửa cả 3

Role "CUSTOMER" (roleid=12, tự tạo tay ở trang Phân quyền) lúc kiểm tra có:

| Vấn đề | Chi tiết | Đã sửa |
|---|---|---|
| 🔴 **`USER_UPDATE` — nguy hiểm, cấp quyền admin-cấp cho MỌI customer** | `UserService.update` coi có `USER_UPDATE` là "admin sửa user khác" (bỏ qua self-check, CHO đổi cả `role`) — gán permission này cho CUSTOMER nghĩa là **mọi khách hàng sửa/đổi role được BẤT KỲ user nào** qua `PUT /users`, không chỉ hồ sơ chính mình. Tự sửa hồ sơ mình không cần permission này (đã có self-id check ở mục 10) | Gỡ khỏi CUSTOMER trong DB (`role_permissions`) |
| Tên permission SAI/chết: `BOOKING_VIEW_OWN`, `BOOKING_CANCEL` | Không khớp tên thật `@PreAuthorize` đang check (`BOOKING_READ_OWN`, `BOOKING_CANCEL_OWN`) — permission catalog có cả tên cũ (chết) lẫn tên mới đang dùng thật, không dọn sau refactor. Hệ quả: CUSTOMER tưởng có quyền xem/huỷ booking của mình nhưng thật ra `GET /bookings/me` và `PATCH /bookings/{id}/cancel` đều 403 | Thay bằng đúng tên `BOOKING_READ_OWN`/`BOOKING_CANCEL_OWN` |
| Thiếu quyền viết review | Không có `REVIEW_CREATE`/`REVIEW_UPDATE`/`REVIEW_DELETE` — khách hàng không viết/sửa/xoá được review của chính mình (đã xác nhận `ReviewService.update`/`delete_review` tự kiểm tra đúng chủ sở hữu ở tầng service, an toàn khi cấp quyền này, khác hẳn tình huống `USER_UPDATE` ở trên) | Thêm cả 3 |

Quyền cuối cùng của CUSTOMER: `WISHLIST_CREATE/READ/DELETE`, `BOOKING_CREATE/
READ_OWN/CANCEL_OWN`, `REVIEW_CREATE/UPDATE/DELETE`, `HOTEL_READ`, `ROOM_READ`
(2 cái cuối giờ dư do đã public ở mục 11.1, giữ lại cũng không hại gì).

Test thật đủ vòng: đăng ký → đăng nhập → `GET /bookings/me` (200, trước đó
403) → đặt phòng có JWT → huỷ đặt phòng tự huỷ → thêm/xem/xoá wishlist →
viết review — tất cả 200.

### 11.4. Tất cả user đăng ký đều tự động có Role "CUSTOMER" thật (không chỉ field hiển thị)

Bug thật phát hiện lúc audit: `UserService.create_user` trước đây CHỈ set
field `role` (enum hiển thị, không cấp quyền gì — xem mục "Roles" ở trên)
thành `CUSTOMER`, nhưng **không hề gán Role thật** (`user.roles`, quan hệ
nhiều-nhiều qua `user_roles`) — nghĩa là mọi khách tự đăng ký có 0 quyền
thật dù role hiển thị đúng "CUSTOMER". Xác nhận qua test: đăng ký xong gọi
`GET /bookings/me` luôn 403 dù CUSTOMER đã có đủ `BOOKING_READ_OWN`.

Đã sửa: `create_user` tự `roleRepository.findByRoleName("CUSTOMER")` rồi gán
vào `user.roles` nếu tìm thấy — không thấy thì bỏ qua (không chặn đăng ký,
role chỉ là bonus quyền). Phụ thuộc vào việc Role tên đúng "CUSTOMER" đã tồn
tại (tự tạo tay, không phải `StartupRunner` seed) — nếu sau này đổi tên role
đó thì phải sửa lại chuỗi `"CUSTOMER"` này theo.

### 11.5. Đặt phòng không cần tài khoản (guest booking) — thay đổi schema

Theo đúng mô tả: *"user và customer chỉ khác nhau ở chỗ thanh toán tự điền
form + có history — quản lý chủ yếu bằng email, sđt, booking id"*. Trước đây
`Booking.user` là `nullable=false` và `BookingService.create()` luôn
`userRepository.findByEmail(...).get()` — **crash `NoSuchElementException`**
với request không có JWT (đã xác nhận: dù `@PreAuthorize` của `POST /bookings`
đã comment sẵn từ trước, filter chain + `.get()` này vẫn chặn/crash 2 lớp).

Đã sửa:
- `Booking` thêm `guestFullName`/`guestEmail`/`guestPhone` (nullable), `user`
  đổi `nullable=true`. **Lưu ý quan trọng**: `spring.jpa.hibernate.ddl-auto=
  update` chỉ CỘNG THÊM cột/bảng mới, KHÔNG tự nới lỏng constraint cột đã có
  sẵn — đổi `@JoinColumn(nullable=true)` ở Java không tự đổi `userid` trong
  MySQL từ `NOT NULL` thành nullable, phải tự `ALTER TABLE bookings MODIFY
  userid BIGINT NULL` thủ công 1 lần (đã làm). Cần nhớ áp dụng lại nếu seed
  lại bảng `bookings` từ đầu ở môi trường khác.
- `BookingService.create()`: có JWT hợp lệ thì gắn `user` như cũ; không có
  JWT thì bắt buộc đủ `guestFullName/guestEmail/guestPhone`, lưu vào 3 field
  guest* thay vì `user`.
- `fetch_id`/`cancel` (nhánh `BOOKING_CANCEL_OWN`): thêm null-check
  `booking.getUser()` trước khi so `.getId()` — tránh NPE khi ai đó (vd.
  ADMIN) xem/thao tác 1 booking khách vãng lai (user null).
- Thêm `GET /bookings/lookup?id=&email=` — **public, không cần đăng nhập**,
  tra theo booking id + email, khớp CẢ booking khách vãng lai (`guestEmail`)
  LẪN booking tài khoản thật (`user.email`) — đúng model "quản lý bằng
  email + booking id" cho cả 2 loại khách. Bug JPQL đã tự vấp phải lúc viết
  query này: `b.user.email` (implicit join qua path nested) bị Hibernate
  dịch thành **INNER JOIN**, loại thẳng mọi booking khách vãng lai (user
  null) ra khỏi kết quả dù nhánh OR có `guestEmail` khớp — phải viết tường
  minh `left join b.user u ... u.email` mới đúng. Đã test thật cả 2 đường
  (guest lookup đúng/sai email, account-holder booking vẫn hoạt động bình
  thường qua JWT như cũ).
- `SecurityConfig`: thêm `PUBLIC_POST_ENDPOINTS` riêng (chỉ `POST /bookings`)
  — không dùng chung `PUBLIC_ENDPOINTS`/`PUBLIC_GET_ENDPOINTS` vì sẽ lỡ mở
  `GET /bookings` (list tất cả, admin) hoặc `PATCH .../cancel`.

### 11.6. Quyết định kiến trúc Wishlist — đã hỏi ý kiến trước khi làm

2 câu hỏi đã hỏi + quyết định:
1. **Wishlist**: chọn **session/localStorage cho khách, merge vào DB khi
   đăng nhập** (giống hệt Cart đã có — `cartStorage.ts` +
   `mergeCartOnLogin`) thay vì bắt buộc đăng nhập mới thêm được. Backend
   KHÔNG cần đổi gì (`Wishlist.user` vẫn `nullable=false`, chỉ áp dụng cho
   customer thật — 3 API `WISHLIST_CREATE/READ/DELETE` đã hoạt động đúng
   sau khi sửa mục 11.3/11.4). Phần frontend (storage cục bộ + provider +
   merge-on-login, mirror `CartProvider`) **CHƯA làm** trong lượt này — hợp
   lý nhất khi làm cùng lúc với việc nối trang công khai (hotel/room list)
   sang gọi API thật, vì hiện tại `src/data/hotels.data.ts`/`rooms.data.ts`
   (mock) dùng id KHÔNG khớp với id thật ở backend, nối wishlist thật vào
   trang đang hiển thị mock data sẽ vô nghĩa.
2. **Guest booking**: chọn làm đầy đủ ngay (mục 11.5) thay vì hoãn lại.

### 11.7. Test thật đã chạy qua trước khi báo hoàn thành

curl trực tiếp backend (không qua FE, vì FE chưa nối API thật cho trang công
khai): GET public (hotel/room/amenity/view/roomtype/review/province/ward)
không token → 200; POST/PUT/DELETE cùng path không token → vẫn 401; đăng ký
→ `GET /bookings/me` 200 (trước 403); đặt phòng có JWT + tự huỷ + wishlist
CRUD + viết review — tất cả đúng quyền; đặt phòng KHÔNG JWT (guest, đủ
guest*) → 201, thiếu field → báo lỗi rõ ràng; tra cứu booking bằng
id+email đúng/sai; admin vẫn sửa được user khác + đổi role như cũ (backward-
compat mục 10 không bị ảnh hưởng). Đã dọn toàn bộ user/booking/review test
tạo ra trong lúc test khỏi DB thật sau khi xong.

---

## 12. Province/Ward đổi từ id tự tăng sang mã hành chính VN thật (dùng chung 1 id cho cả FE/BE)

**Yêu cầu**: dùng thẳng `vn-provinces-wards.json` (đã có sẵn ở FE) cho cả
frontend lẫn backend, bỏ hẳn id tự tăng (`AUTO_INCREMENT`) của
`provinces`/`wards` — lý do bắt nguồn từ câu hỏi "sao không tái dùng file có
sẵn thay vì tự export `admin-locations.json` từ DB" (mục 11 cũ dùng snapshot
DB vì lúc đó id 2 bên lệch nhau, không map được).

**Thay đổi cốt lõi**: `Province.id`/`Ward.id` đổi từ `Long`
(`@GeneratedValue(IDENTITY)`) sang `String` (assigned identifier — không
`@GeneratedValue` nữa), gán trực tiếp = **mã hành chính VN thật** (`Code`
trong `vn-provinces-wards.json`, vd. `"01"` = Hà Nội, `"00070"` = Hoàn Kiếm).
`Hotel.ward_id` (FK) đổi theo tương ứng (`VARCHAR` thay vì `BIGINT`).

**File backend đổi**:
- `Province.java`, `Ward.java` — `@Id private String id;`
- `ProvinceRepository`, `WardRepository` — `JpaRepository<Province/Ward, String>`
- `ReqCreateHotelDTO.wardId`, `ReqUpdateHotelDTO.wardId` — `Long` → `String`
- `WardController.getWardsFromProvince` — `@PathVariable String id`
- `StartupRunner.java` — `SeedProvince` thêm field `code`, `wards` đổi từ
  `List<String>` sang `List<SeedWard>` (record `{code, name}`); vòng lặp seed
  gọi `province.setId(p.code)` / `ward.setId(w.code)` thay vì để DB tự sinh.
- `src/main/resources/seed/hotels-rooms.json` — ghi thêm field `code` cho
  từng tỉnh/ward, cross-reference từ `vn-provinces-wards.json` bằng cách so
  khớp TÊN đã bỏ tiền tố ("Thành phố "/"Tỉnh "/"Phường "/"Xã "/"Thị trấn
  "/"Đặc khu ") — đúng logic `stripPrefix` mà `locations.data.ts` (frontend)
  đã dùng, để đảm bảo khớp 100% (đã chạy: 34/34 tỉnh, 3321/3321 ward khớp
  được code, không thiếu cái nào).

**File frontend đổi**:
- `src/lib/admin/types.ts` — `Province.id`, `Ward.id`, `HotelInput.wardId`:
  `number` → `string`.
- `src/lib/admin/resources.ts` — `listHotels`: filter turkraft giờ phải bọc
  nháy đơn quanh id (`ward.id : '00070'` thay vì `ward.id : 00070` — id giờ
  là string, không bọc nháy sẽ lỗi parse phía backend).
- **`src/components/admin/ProvinceWardSelect.tsx`** — đổi nguồn dữ liệu từ
  `@/lib/admin/adminLocations` (snapshot DB, đã xoá) sang **thẳng
  `@/data/locations.data`** (bọc `vn-provinces-wards.json`, dùng chung với
  trang Map) — vì giờ id 2 bên đã khớp nhau, không còn lý do gì phải giữ
  snapshot DB riêng nữa. **Đã xoá hẳn** `src/data/admin-locations.json` và
  `src/lib/admin/adminLocations.ts`.
- `src/app/admin/(dashboard)/hotels/{new,[id],page}.tsx` — `wardId`/
  `provinceId` state đổi `number`/`0` → `string`/`""`.

**⚠️ Migrate dữ liệu (thao tác tay, không phải code)**: `spring.jpa.hibernate.
ddl-auto=update` KHÔNG tự đổi type cột đã tồn tại (`BIGINT` → `VARCHAR`) —
đã tự DROP hẳn (không chỉ xoá dữ liệu) các bảng phụ thuộc trực tiếp/gián tiếp
vào `provinces`/`wards`/`hotels`/`rooms` (`amenities_rooms`,
`discount_details`, `reviews`, `room_images`, `room_views`, `wishlists`,
`bookings`, `rooms`, `hotels`, `wards`, `provinces` — theo đúng thứ tự FK,
tắt `FOREIGN_KEY_CHECKS` lúc drop), TRUNCATE 3 bảng catalog seed lại
unconditional mỗi lần (`amenities`, `views`, `room_types` — StartupRunner
seed lại các bảng này không kiểm tra "đã có chưa" nên phải xoá trước, nếu
không insert trùng unique key sẽ crash cả app lúc khởi động — **đã tự vấp
lỗi này lúc migrate thật**, sửa bằng cách TRUNCATE trước khi restart), xoá
tay user "owner" tổng hợp (`seed.owner*`, vì bypass `wipeSeedData()` ở tầng
app nên phần dọn user đó không tự chạy). Không đụng bảng `users` thật
(`admin@gmail.com`, `utkim113@gmail.com`, hay tài khoản khách thật nào khác)
— chỉ xoá đúng user `seed.owner*` sinh tự động lúc seed. Restart app —
Hibernate tự tạo lại `provinces`/`wards`/`hotels`/`rooms`/... với đúng type
cột mới, `StartupRunner` seed lại toàn bộ (34 tỉnh/3321 ward/100 khách sạn/
1300 phòng) từ đầu.

**Nếu cần lặp lại thao tác này ở môi trường khác** (deploy, máy khác...):
chạy đúng thứ tự — (1) drop các bảng liệt kê trên (tắt FK checks), (2)
truncate `amenities`/`views`/`room_types`, (3) xoá `users` có email bắt đầu
`seed.owner`, (4) khởi động lại app.

**Test thật đã chạy qua**: `GET /provinces`, `GET /wards/provinces/01` (mã
mới) → đúng; `GET /wards/provinces/1` (id số kiểu cũ) → rỗng, không lỗi;
tạo hotel qua API với `wardId: "00070"` → 201, `ward.id`/`ward.province.id`
trả về đúng string; filter `GET /hotels?filter=ward.id : '00070'` và
`ward.province.id : '01'` → đúng số lượng. **QA qua trình duyệt thật** (không
chỉ curl): tạo khách sạn qua dropdown Tỉnh→Phường ở `/admin/hotels/new` →
thành công, reload trang sửa → 2 dropdown pre-select đúng tỉnh/phường vừa
chọn; trang danh sách lọc theo tỉnh rồi theo phường → đúng số khách sạn hiện
ra. Đã dọn khách sạn/dữ liệu test tạo ra trong lúc QA.

---

## 13. Trang công khai nối API thật — xoá hẳn mock data

Xoá `src/data/hotels.data.ts`/`rooms.data.ts`, toàn bộ trang công khai (trang
chủ, `/hotels`, `/hotel/[id]`, `/hotel/[id]/room/[roomId]`, `/map`, `/cart`,
`/checkout`) giờ gọi thẳng backend thật.

**Lớp dữ liệu mới** (`src/lib/hotels/`): `types.ts` (khớp response thật),
`config.ts` (`getApiBaseUrl`, chỉ dùng server), `envelope.ts` (bóc envelope
dùng chung), `server.ts` (`getHotelServer`/`getRoomServer` — gọi THẲNG backend,
dùng trong Server Component `hotel/[id]/page.tsx` và `room/[roomId]/page.tsx`,
không qua proxy vì server-to-server không có CORS), `client.ts`
(`listHotels`/`getHotel`/`getRoom`/`listAmenities`/`listViews`/reviews — gọi
qua `src/app/api/public/[...path]/route.ts`, proxy GET-only KHÔNG cần cookie,
dùng trong mọi client component: Map, `/hotels`, Cart, Checkout, trang chủ).

**Backend sửa thêm 1 chỗ** (`Room.java`/`RoomType.java`): `Room.roomType` bỏ
`@JsonIgnore` (trang công khai cần hiển thị/lọc theo loại phòng) — kèm theo
**bắt buộc** phải thêm `@JsonIgnore` vào `RoomType.rooms` (chiều ngược lại),
nếu không Jackson serialize vòng lặp vô hạn Room→RoomType→rooms→Room→...
(StackOverflowError ngay request đầu, đã tự phát hiện trước khi ship nhờ đọc
kỹ quan hệ 2 chiều, không phải từ crash thật).

**Model dữ liệu thật khác mock ở vài điểm — đã điều chỉnh UI cho khớp**:
`Room` không có `sizeSqm` (bỏ hiển thị m²), `roomType` là quan hệ thật
`{id, roomTypeName}` thay vì enum cứng (dropdown lọc loại phòng giờ tự rút
ra từ chính các phòng của khách sạn đó, không dùng danh sách cố định chung
cho mọi khách sạn nữa), `amenities` là mảng object `{id,name,icon}` thay vì
string[], `images` hiện luôn rỗng (chưa có tính năng thêm ảnh phòng ở admin)
nên gallery phòng chỉ còn đúng 1 ảnh (thumbnail) thay vì 5 ảnh sinh giả như
mock cũ, `Room` không mang `hotelId` (`hotel` bị `@JsonIgnore`) nên mọi nơi
cần hotelId phải lấy từ context (route param hoặc `Hotel.rooms[]`).

**Giỏ hàng (Cart) đổi cách hoạt động**: trước đây `CartItem`/`findRoomForItem`
tra cứu đồng bộ trong mảng mock có sẵn trong bộ nhớ; giờ giỏ chỉ lưu
`hotelId`+`roomId` (localStorage, không đổi), còn tên/giá/ảnh phòng phải tải
lại từ backend mỗi lần vào `/cart` hoặc `/checkout` — `cartUtils.ts` thêm
`loadHotelsForCart(items)` (gọi `getHotel()` 1 lần cho mỗi hotelId DUY NHẤT
trong giỏ, không phải 1 lần/phòng, vì response hotel đã kèm sẵn toàn bộ
`rooms`), `CartView`/`CheckoutView` thêm state loading trong lúc tải.
`CartItem.roomId` đổi từ `string` (id giả `${hotelId}-r${i}` của mock) sang
`number` (khớp id thật của Room).

**Giải quyết đúng lo ngại "kéo/zoom map gọi API liên tục"** (câu hỏi trước
đó): `useHotelFilters` giờ fetch hotel theo TỈNH đang chọn qua backend thật
(1 lần khi đổi tỉnh/xã, size đủ lớn để lấy hết — không phải tải "hết cả
nước"), rồi lọc tiếp bbox (kéo map)/bán kính (tìm quanh đây) ở CLIENT trên
tập đã tải, không gọi lại API. Lý do không lọc bbox thật ở backend: cột
`Hotel.latitude`/`longitude` là kiểu `String`, không so sánh khoảng số đúng
được qua turkraft filter — cần đổi kiểu cột (không làm trong lượt này). Đã
đo bằng Playwright thật: 6 lần kéo + 8 nấc zoom liên tiếp trong cùng 1 tỉnh
→ **0 lần gọi `/api/public/*`**; đổi tỉnh → đúng **1 lần**.

**Đã test qua trình duyệt thật đủ vòng**: trang chủ (6 destination card từ
dữ liệu thật) → `/hotels` (danh sách + phân trang) → chi tiết khách sạn (13
phòng thật, đúng tên/giá/loại/tiện nghi) → chi tiết phòng → thêm giỏ → xem
giỏ → qua checkout (đúng tên khách sạn/phòng/tổng tiền) → `/map` (37 marker
thật ở HCM, đổi tỉnh sang Đà Nẵng đúng). `tsc --noEmit` và `eslint` sạch
(chỉ còn 4 warning không liên quan đã có từ trước).

---

## 14. Backend: bỏ hẳn `Hotel.user`, chuyển khoá ngoại sở hữu hotel sang `User.hotel`

Không phải thay đổi ở frontend, nhưng ghi lại ở đây vì ảnh hưởng trực tiếp
đến mọi trang admin liên quan tới "hotel của tôi" (Rooms/Discounts theo
hotel đang quản lý) — chi tiết đầy đủ (từng file, từng SQL, cách test) xem
`BACKEND_CHANGES.md` mục 10.

**Vấn đề phát hiện qua câu hỏi**: "1 hotel có nhiều owner/staff, 1 owner chỉ
thuộc 1 hotel — vậy khoá ngoại phải nằm ở bảng `users`, sao lại để `user_id`
ở bảng `hotels`?". Đúng — thiết kế cũ `Hotel.user` (`@OneToOne`, có
`UNIQUE KEY` trên `hotels.user_id`) chỉ cho **đúng 1 user/hotel**, sai với
mô hình 1 hotel nhiều nhân viên. Đã quyết định: bỏ hẳn `Hotel.user`, mọi nơi
(kể cả owner) xác định qua `User.hotel` (`@ManyToOne`, khoá ngoại thật nằm ở
`users.hotel_id`).

**Ảnh hưởng tới admin dashboard**: toàn bộ authorization "chỉ được sửa/xoá
hotel/room/discount/booking của **chính mình**" (các permission dạng
`*_OWN`) vẫn hoạt động đúng như cũ về mặt hành vi — chỉ đổi cách backend tra
cứu bên trong (từ `hotel.getUser()` sang `caller.getHotel()`), FE không cần
đổi gì. Đã xác nhận bằng test thật trên DB thật (viết + chạy + xoá 1
`@SpringBootTest` tạm gọi thẳng `RoomService.create_room()`): owner tạo được
room trong đúng hotel mình quản lý, bị chặn (`Forbidden`) khi thử tạo room ở
hotel người khác quản lý.

**Migrate DB thật đã làm** (không mất dữ liệu, 100/100 hotel thật vẫn giữ
đúng owner):
```sql
UPDATE users u JOIN hotels h ON h.user_id = u.id SET u.hotel_id = h.id;
ALTER TABLE hotels DROP FOREIGN KEY FKbmtnc1ekbiwke2dfj0p64h4d3;
ALTER TABLE hotels DROP KEY UKedof2un7abelc56v6tarsdx25;
ALTER TABLE hotels DROP COLUMN user_id;
```

**Gợi ý còn bỏ ngỏ (chưa làm, chưa được yêu cầu)**: form Users trong admin
(`src/app/admin/.../users/`) có sẵn dropdown "Khách sạn phụ trách" từ trước
nhưng chưa nối được vào backend vì trước đây `User` không có field `hotel`
lộ ra qua API (chỉ `Hotel.user` bị `@JsonIgnore` một chiều). Giờ `User.hotel`
đã tồn tại thật ở DB nhưng đang bị `@JsonIgnore` (tránh lộ cả object
`Hotel`/`rooms[]` qua mọi response `User`) — muốn nối dropdown đó vào thật
thì cần thêm `hotelId` (kiểu `Long`, không phải cả object) vào
`ReqCreateUserDTO`/`ReqUpdateUserDTO`/response user, việc này nằm ngoài yêu
cầu gốc của đợt refactor này nên chưa làm.

---

## 15. 400 hotel test đổi từ RANDOM sinh trong code sang dữ liệu THẬT viết cứng trong seed JSON

Cũng không phải thay đổi frontend, nhưng ghi lại vì liên quan trực tiếp tới
dữ liệu demo hiển thị trên `/hotels`, `/map`: theo yêu cầu tiếp theo, 400
hotel test (mục trước trong lịch sử dự án — xem `BACKEND_CHANGES.md` mục 9)
không còn được random sinh trong code Java nữa, mà đã tra cứu tay 400 hotel
**thật** (tên chuỗi/khách sạn có thật ở VN: Mường Thanh, Vinpearl, Sài Gòn
Tourist, Novotel...) kèm địa chỉ/toạ độ/ward đúng, viết cứng vào
`resources/seed/hotels-rooms.json`, trải đủ 34/34 tỉnh — vẫn giữ nguyên
100 hotel thật ban đầu, vẫn không owner/không phòng (chi tiết đầy đủ xem
`BACKEND_CHANGES.md` mục 11). Không cần đổi gì ở frontend — API
`GET /api/v1/hotels` vẫn trả đúng hình dạng dữ liệu như trước, chỉ khác nội
dung `name`/`address` (giờ là tên thật thay vì "Test Hotel N - Ward").
