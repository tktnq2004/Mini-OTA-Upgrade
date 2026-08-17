# Admin Dashboard — Tài liệu tổng hợp

Tài liệu này mô tả toàn bộ phần **admin dashboard** đã được thêm vào project WenGo/MiniOTA (frontend Next.js) để CRUD dữ liệu qua backend Spring Boot [`kyss18/Mini-OTA`](https://github.com/kyss18/Mini-OTA).

---

## 1. Mục tiêu & bối cảnh

Backend Mini-OTA (Java/Spring Boot) đã có sẵn REST API CRUD cho Hotels, Rooms, RoomTypes, Amenities, Views, Users, Discounts... nhưng chưa có giao diện quản trị. Yêu cầu: xây một trang `/admin` trong chính project Next.js này, gọi API sang backend đó để quản lý dữ liệu.

Trước khi code, đã khảo sát trực tiếp mã nguồn backend (clone tạm về máy để đọc, không sửa) và phát hiện 2 nhóm vấn đề cần quyết định cách xử lý — đã hỏi và chốt với bạn:

| Vấn đề | Đã chốt |
|---|---|
| Backend chưa cấu hình CORS (`SecurityConfig.java` chỉ có `.cors(Customizer.withDefaults())` nhưng không có `CorsConfigurationSource` nào) → nếu FE gọi thẳng từ trình duyệt sang `localhost:8080` sẽ bị chặn | **Proxy qua Next.js API routes** — FE chỉ gọi `/api/admin/*` (cùng origin), route đó gọi tiếp sang backend ở phía server (server-to-server, không bị CORS) |
| Backend không có `@PreAuthorize`/`hasRole` nào — bất kỳ user đã đăng nhập (kể cả role `CUSTOMER`) đều gọi được các endpoint CRUD | **Chỉ chặn ở FE** (kiểm tra `role` từ JWT, redirect nếu không phải `ADMIN`) — chấp nhận đây là giới hạn demo, backend thực tế vẫn chưa an toàn tuyệt đối nếu ai đó gọi API trực tiếp bằng token hợp lệ |
| 3 lỗ hổng dữ liệu: không có `GET /provinces`, không có `GET /roomtype` (list toàn bộ), `Room.roomType` bị đánh `@JsonIgnore` nên không bao giờ trả về trong JSON | **Chấp nhận UX giới hạn** — xem mục 6 |

Phạm vi CRUD đã chọn: **Hotels + Rooms + RoomTypes + Amenities + Views, Users, Discounts**.

---

## 2. Công nghệ sử dụng

- **Next.js 16 App Router** (Route Handlers cho backend proxy, Server Component cho auth guard, Client Component cho toàn bộ UI tương tác).
- **TypeScript** — toàn bộ code admin có kiểu dữ liệu khớp với DTO backend (đọc trực tiếp từ Java source).
- **CSS Modules** — tái dùng `src/styles/controls.module.css` (input/button/select có sẵn của toàn site) + 2 module CSS mới riêng cho admin (`AdminShell.module.css`, `adminPage.module.css`).
- **Cookie-based session** (`httpOnly`, không dùng localStorage cho token) — access token & refresh token của backend được giữ ở cookie phía server, không lộ ra JS phía client.
- Không dùng thư viện form/state ngoài (React state thuần), không thêm dependency mới nào vào `package.json`.

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
```

- **Không có state quản lý toàn cục (Redux/Context) cho dữ liệu** — mỗi trang tự fetch dữ liệu của nó qua các hàm trong `src/lib/admin/resources.ts`.
- **Không có SSR data-fetching** cho các trang CRUD (tất cả là Client Component, fetch trong `useEffect` sau khi mount) — chỉ riêng bước kiểm tra đăng nhập (`layout.tsx`) chạy ở server.

---

## 4. Luồng xác thực (auth flow)

### 4.1. Đăng nhập thật

1. Người dùng nhập email/password ở `/admin/login` → `POST /api/admin/auth/login` (route nội bộ Next.js).
2. Route này gọi `POST {backend}/auth/login`. Backend trả về `{ access_token, user }` + set cookie `refresh-token-Mini` (cookie của backend, scope tới domain `localhost:8080`, path `/api/v1`).
3. Route giải mã payload của `access_token` (JWT) để đọc `role` — **nếu `role !== "ADMIN"` thì từ chối ngay** (403), không cho vào dù đăng nhập đúng mật khẩu.
4. Nếu là ADMIN: set 2 cookie **của chính Next.js** (domain `localhost:3000`, `httpOnly`):
   - `mota_admin_at` — access token thật của backend.
   - `mota_admin_rt` — refresh token thật của backend (giá trị lấy từ header `Set-Cookie: refresh-token-Mini=...` mà backend trả về, parse thủ công vì đây là gọi server-to-server nên trình duyệt không tự nhận cookie đó).
5. Chuyển hướng vào `/admin`.

### 4.2. Guard mọi trang trong `/admin`

`src/app/admin/(dashboard)/layout.tsx` là **Server Component**, chạy trên server mỗi lần vào bất kỳ trang con nào:
- Đọc cookie `mota_admin_at`, giải mã JWT (chỉ đọc payload, không cần verify chữ ký ở đây vì mọi API call thật sự vẫn phải qua backend tự verify).
- Không có cookie, hoặc `role !== "ADMIN"` → `redirect("/admin/login")`.
- Hợp lệ → render `<AdminShell>` (sidebar + topbar) bọc quanh nội dung trang.

### 4.3. Gọi API CRUD (proxy + tự làm mới token)

`src/app/api/admin/[...path]/route.ts` là **catch-all route**, nhận mọi method (GET/POST/PUT/DELETE/PATCH) tới `/api/admin/<bất kỳ path nào>`:
1. Lấy access token từ cookie, gắn header `Authorization: Bearer <token>`, forward request sang backend với path + query string y hệt.
2. Nếu backend trả `401` (token hết hạn) **và** có refresh token trong cookie → tự gọi `GET {backend}/auth/refresh` (gắn thủ công header `Cookie: refresh-token-Mini=...`), lấy access token mới, **thử lại request gốc 1 lần**, đồng thời cập nhật lại 2 cookie.
3. Nếu vẫn `401` sau khi refresh (hoặc không có refresh token) → xoá cả 2 cookie, trả `401` về client.
4. Phía client (`src/lib/admin/apiClient.ts`), nếu nhận `401` → tự động `window.location.href = "/admin/login"`.

→ Người dùng gần như không bao gigiờ thấy lỗi hết hạn phiên trong lúc thao tác — refresh diễn ra âm thầm ở route proxy.


## 5. Danh sách file đã tạo

### 5.1. Lớp dữ liệu & API client (`src/lib/admin/`)

| File | Vai trò |
|---|---|
| `types.ts` | Toàn bộ interface TypeScript khớp với DTO/Entity Java: `Hotel`, `Room`, `RoomType`, `Amenity`, `View`, `AppUser`, `Discount`, `Province`, `Meta`, `Paginated<T>`... |
| `session.ts` | Hàm dùng ở server: tên cookie (`ACCESS_COOKIE`, `REFRESH_COOKIE`), `decodeAdminJwt()` (giải mã payload JWT base64url), `extractSetCookie()`/`extractBackendRefreshCookie()` (parse header `Set-Cookie` thủ công), `refreshBackendSession()` (gọi `/auth/refresh` backend), `getAdminApiBaseUrl()` (đọc env `ADMIN_API_BASE_URL`). |
| `apiClient.ts` | `adminFetch<T>()` — hàm fetch dùng ở client, gọi `/api/admin/*`, tự parse envelope lỗi của backend (`{error, message}`), tự redirect về login khi gặp 401. Có sẵn `adminGet/adminPost/adminPut/adminDelete`. |
| `resources.ts` | Toàn bộ hàm gọi API theo từng resource: `listHotels`, `createHotel`, `updateRoom`, `listAmenities`, `assignDiscountToRoom`, `removeRoomAmenity`... — nơi duy nhất biết URL/path thật của backend. |

### 5.2. Route nội bộ Next.js (`src/app/api/admin/`)

| File | Vai trò |
|---|---|
| `auth/login/route.ts` | Xử lý đăng nhập thật (mục 4.1). |
| `auth/logout/route.ts` | Gọi `POST /auth/logout` bên backend (best-effort) rồi xoá cookie phía FE. |
| `auth/dev-session/route.ts` | Tạo session giả cho dev (mục 4.4). |
| `[...path]/route.ts` | Proxy chung + tự refresh token (mục 4.3). |

### 5.3. Giao diện dùng chung (`src/components/admin/`)

| File | Vai trò |
|---|---|
| `AdminShell.tsx` + `.module.css` | Khung layout: sidebar (menu điều hướng 6 mục), topbar (tên admin đang đăng nhập + nút đăng xuất). |
| `adminPage.module.css` | Bộ class CSS dùng chung cho mọi trang admin: `pageHeader`, `panel`, `table`, `pagination`, `card`, `formGrid`, `chip`... — tránh lặp CSS giữa các trang. |
| `NameIconManager.tsx` | Component dùng chung cho 2 trang **Tiện nghi** và **Hướng nhìn** (cấu trúc dữ liệu giống hệt nhau: `{id, name, icon}`) — 1 component nhận vào các hàm `list/create/update/remove` qua props, tránh trùng code 2 lần. |
| `RoomCard.tsx` | Component hiển thị 1 phòng trong trang chi tiết khách sạn — sửa thông tin cơ bản, thêm/gỡ tiện nghi & hướng nhìn, xoá phòng. |

### 5.4. Các trang (`src/app/admin/`)

| Route | File | Chức năng |
|---|---|---|
| `/admin/login` | `login/page.tsx` + `login.module.css` | Form đăng nhập + nút dev-bypass. |
| `/admin` | `(dashboard)/layout.tsx` | Auth guard + bọc `AdminShell` (mục 4.2). |
| `/admin` | `(dashboard)/page.tsx` | Trang tổng quan — 6 thẻ liên kết nhanh tới từng mục. |
| `/admin/hotels` | `hotels/page.tsx` | Danh sách khách sạn, phân trang, tìm theo tên, xoá. |
| `/admin/hotels/new` | `hotels/new/page.tsx` | Form tạo khách sạn mới. |
| `/admin/hotels/[id]` | `hotels/[id]/page.tsx` | Sửa thông tin khách sạn **+ quản lý toàn bộ phòng của khách sạn đó** (thêm/sửa/xoá phòng, gán/gỡ tiện nghi-hướng nhìn) trong cùng 1 trang. |
| `/admin/roomtypes` | `roomtypes/page.tsx` | Tạo loại phòng mới + tra cứu/sửa/xoá theo ID (không có bảng danh sách — xem mục 6). |
| `/admin/amenities` | `amenities/page.tsx` | CRUD tiện nghi (dùng `NameIconManager`). |
| `/admin/views` | `views/page.tsx` | CRUD hướng nhìn (dùng `NameIconManager`). |
| `/admin/users` | `users/page.tsx` | Danh sách người dùng, phân trang, tìm theo email, tạo/sửa/xoá, đổi vai trò. |
| `/admin/discounts` | `discounts/page.tsx` | CRUD mã giảm giá (%, ngày bắt đầu/kết thúc) + form gán/gỡ mã giảm giá vào 1 phòng cụ thể (nhập room ID + discount ID). |

### 5.5. File khác đã sửa

- `.env` — thêm `ADMIN_API_BASE_URL=http://localhost:8080/api/v1` (không có tiền tố `NEXT_PUBLIC_` vì chỉ dùng ở server, không lộ ra trình duyệt).

---

## 6. Giới hạn đã biết (do backend, không phải bug ở FE)

| Giới hạn | Ảnh hưởng | Cách FE xử lý |
|---|---|---|
| Không có `GET /provinces` | Không thể làm dropdown chọn tỉnh khi tạo/sửa khách sạn | Ô nhập số **Province ID** thủ công |
| Không có `GET /roomtype` (list toàn bộ) | Không thể hiện danh sách loại phòng để chọn | Trang `/admin/roomtypes` chỉ có "tạo mới" + "tra theo ID"; khi tạo phòng phải tự gõ **Room type ID** |
| `Room.roomType` bị `@JsonIgnore` trong entity Java | API không bao giờ trả tên/ID loại phòng của 1 phòng đã tạo | Không hiển thị được loại phòng trên `RoomCard` |
| Không có `GET /rooms` (list toàn bộ) | Không thể có trang "danh sách tất cả phòng" độc lập | Quản lý phòng lồng trong trang chi tiết từng khách sạn (`hotels/[id]`), lấy qua field `rooms` trả về kèm trong `GET /hotels/{id}` |
| `PUT /rooms` (update) chỉ **cộng thêm** amenities/views, không thay thế toàn bộ danh sách | Nếu gửi danh sách rỗng sẽ không xoá cái đã có (an toàn), nhưng không thể "ghi đè" 1 lần | Tách riêng: sửa thông tin cơ bản dùng `PUT /rooms`; gỡ tiện nghi/hướng nhìn dùng riêng `DELETE /relationships` |
| Backend không kiểm tra `role` ở tầng API | Một user role `CUSTOMER` có JWT hợp lệ vẫn gọi được API xoá/sửa dữ liệu nếu biết endpoint | FE chỉ chặn ở giao diện (đã thống nhất là chấp nhận được cho demo) |

---

## 7. Cách chạy thử

1. **Backend**: cần MySQL (`localhost:3306`, DB `Mini_OTA`) và Redis (`localhost:6379`) đang chạy, rồi khởi động Spring Boot app (repo `Mini-OTA`) — mặc định lắng nghe `http://localhost:8080`.
2. **Tạo tài khoản ADMIN đầu tiên** (nếu chưa có) — gọi thẳng API tạo user (endpoint này public):
   ```bash
   curl -X POST http://localhost:8080/api/v1/users \
     -H "Content-Type: application/json" \
     -d '{"fullName":"Admin","username":"admin","email":"admin@example.com","password":"Admin123!","phone":"0900000000","role":"ADMIN"}'
   ```
3. **Frontend**: `npm run dev`, mở `http://localhost:3000/admin/login`, đăng nhập bằng tài khoản ADMIN vừa tạo.
4. Muốn chỉ xem/sửa giao diện mà không cần backend: dùng nút **"Xem giao diện Admin (dev)"** ngay trên trang login (chỉ hiện khi chạy dev).

---

## 8. Hướng nâng cấp nếu cần sau này

- Thêm `@PreAuthorize("hasRole('ADMIN')")` ở các controller CRUD bên backend để chặn thật sự ở tầng API, không chỉ ở FE.
- Thêm `GET /provinces` và `GET /roomtype` (list toàn bộ) bên backend để bỏ được các ô nhập ID thủ công, thay bằng dropdown thật.
- Bỏ `@JsonIgnore` trên `Room.roomType` (hoặc thêm riêng field `roomTypeId`/`roomTypeName` vào response) để hiển thị được loại phòng trong danh sách phòng.
- Nếu cần deploy thật (không chỉ chạy local): đổi `ADMIN_API_BASE_URL` sang domain backend thật, và cấu hình CORS thật ở backend nếu sau này muốn bỏ proxy gọi thẳng từ trình duyệt.
