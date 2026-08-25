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

### 4.4. Nút "Xem giao diện Admin (dev)"

Vẫn giữ nguyên cơ chế cũ (tạo JWT giả để qua guard 4.2 mà không cần backend) — chỉ hoạt động khi `NODE_ENV !== "production"`. Vì guard giờ không kiểm tra role, token giả chỉ cần đúng cấu trúc + `exp` hợp lệ.

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

`auth/login/route.ts` (đã cập nhật: bóc envelope + gọi `probeAdminAccess`), `auth/logout/route.ts`, `auth/dev-session/route.ts`, `[...path]/route.ts`.

### 5.3. Giao diện dùng chung (`src/components/admin/`)

Không đổi cấu trúc so với bản đầu (`AdminShell`, `adminPage.module.css`, `NameIconManager`, `RoomCard`) — `RoomCard` đã sửa lại phần hướng nhìn vì `Room.views` bị `@JsonIgnore` (xem mục 7).

### 5.4. Các trang (`src/app/admin/`)

| Route | Ghi chú thay đổi |
|---|---|
| `/admin/hotels`, `/admin/hotels/new`, `/admin/hotels/[id]` | `provinceId` → **`wardId`**; địa chỉ nhập vào chỉ là "số nhà, tên đường", backend tự nối thêm tên phường + tỉnh. |
| `/admin/roomtypes` | Không đổi (vẫn tra theo ID, không có list-all). |
| `/admin/amenities`, `/admin/views` | Không đổi. |
| `/admin/users` | Thêm khối "Gán role thật" (khác với field "Vai trò" chỉ để hiển thị) — xem mục 6 về bug `id: null`. |
| `/admin/roles` | **Trang mới** — tạo role, gán bộ quyền cho role (thay thế toàn bộ), gán role cho user. Danh sách quyền lấy gián tiếp từ các role đang có (vì `GET /permissions` là stub luôn trả `null`). |
| `/admin/discounts` | Viết lại hoàn toàn theo model mới: Discount chỉ là `{discountValue, unit}`, ngày áp dụng gắn theo từng phòng qua `POST /room/{id}/discounts`. |

---

## 6. Bug backend đã xác nhận qua test thật (không phải đoán từ đọc code)

| Bug | Cách phát hiện | Cách FE xử lý |
|---|---|---|
| **`POST /rooms` luôn lỗi "Ids must not be null" nếu không gửi `discount_id`** | Test tạo phòng qua UI thật → lỗi 400; cô lập bằng curl từng field → xác định `RoomService.create_room` gọi `discountRepository.findAllById(discount_id)` **không kiểm tra null**, trong khi field này không bắt buộc theo DTO | `createRoom()` trong `resources.ts` luôn tự gắn thêm `discount_id: []` vào payload, dù field này không dùng vào việc gì |
| **`GET /users` (danh sách phân trang) luôn trả `id: null` cho mọi user**, dù `GET /users/{id}` đơn lẻ thì đúng | Test trang Users thật → React báo "duplicate key" (vì mọi row đều `key=null`) → so sánh response 2 endpoint bằng curl, xác nhận khác nhau | Dùng `email` làm React key thay vì `id`; ẩn nút Sửa/Xoá ở các row có `id` null, kèm ghi chú giải thích cho admin |
| `PATCH /roles/{id}` luôn trả `null`, không sửa gì (stub) | Đọc code backend | Trang Roles không có chức năng "sửa tên/level" — chỉ tạo mới, xoá, và thay bộ quyền |
| `GET /permissions` và `GET /permissions/{id}` luôn trả `null` (stub) | Đọc code backend | Không dùng 2 endpoint này — danh sách quyền lấy gián tiếp bằng cách gộp `permissions` từ tất cả role đang có (`derivePermissionCatalog`) |
| `DELETE /discounts` (gỡ khuyến mãi khỏi phòng) xác thực dữ liệu nhưng **không thật sự xoá** (logic bị comment trong `DiscountService`) | Đọc code backend | Trang Discounts vẫn gọi đúng API này nhưng hiển thị cảnh báo cố định là chưa hoạt động, không giả vờ báo thành công |
| `Room.views` bị `@JsonIgnore` — API không bao giờ trả lại hướng nhìn hiện tại của 1 phòng | Đọc code backend, khớp với hành vi thật quan sát được | `RoomCard` không hiển thị được hướng nhìn hiện tại; chỉ có ô "thêm" (chọn mù) và ô "gỡ" (chọn theo tên, không theo trạng thái hiện tại) |
| `POST /users/{userId}/roles` trả về **entity `User` thô**, lộ cả `password` (hash bcrypt) và `refreshToken` trong JSON | Quan sát response thật lúc test | FE không đọc/hiển thị response này (chỉ quan tâm thành công hay lỗi) nên không lộ ra giao diện, nhưng đáng lưu ý nếu sau này có ai log response này ra |
| `DELETE /roles/{id}` trả lỗi thô HTTP 500 (không qua envelope, không thông báo rõ ràng) nếu role đó đang được gán cho user nào đó | Test xoá role thật khi còn user gán role đó | Không xử lý đặc biệt — người dùng sẽ thấy thông báo lỗi chung, cần tự gỡ role khỏi user trước khi xoá |

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
4. Muốn chỉ xem/sửa giao diện mà không cần backend: nút **"Xem giao diện Admin (dev)"** trên trang login (chỉ hiện khi chạy dev) — lưu ý các thao tác dữ liệu thật vẫn cần backend thật.

---

## 9. Hướng nâng cấp nếu cần sau này

- Sửa `RoomService.create_room` để kiểm tra `discount_id != null` trước khi gọi `findAllById` (bug mục 6, đang phải né bằng cách luôn gửi `[]` từ FE).
- Sửa mapping `id` trong `UserService.fetch_all` (danh sách user) để khớp với `fetch_id` (đơn lẻ) — hiện danh sách luôn trả `id: null`.
- Cài lại `PATCH /roles/{id}` (hiện là stub trả `null`, dù `RoleService.update_role` đã viết đầy đủ, chỉ chưa nối vào controller) và `GET /permissions` (hiện cũng stub) — 2 endpoint này xong thì trang Roles có thể làm đầy đủ hơn (sửa role, danh sách quyền không cần suy ra gián tiếp).
- Cài lại logic xoá thật trong `DiscountService.delete_arr_room` (hiện bị comment).
- Bỏ `@JsonIgnore` trên `Room.views` (hoặc thêm field riêng trả về danh sách view hiện tại) để hiển thị được trên `RoomCard`.
- Thêm endpoint trả `{id, name}` cho provinces/wards (thay vì chỉ tên) để bỏ được ô nhập Ward ID thủ công.
- Nếu deploy thật: đổi `ADMIN_API_BASE_URL` sang domain backend thật; CORS không cần cấu hình gì thêm vì kiến trúc vẫn qua proxy.
