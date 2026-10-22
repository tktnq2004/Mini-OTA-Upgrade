# Trạm OTA — Frontend

Frontend đặt phòng khách sạn (Next.js App Router, React 19, TypeScript). Backend là
dự án Spring Boot **Mini-OTA** — frontend không gọi thẳng backend từ trình duyệt mà đi
qua các route proxy trong `src/app/api/` (xem mục [Gọi API](#gọi-api)).

## Chạy dự án

```bash
npm install
npm run dev        # http://localhost:3000
```

| Lệnh | Làm gì |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Build production / chạy bản build |
| `npm run lint` | ESLint |
| `npm test` | Unit test (Vitest) — chạy 1 lần |
| `npm run test:watch` | Unit test, chạy lại khi sửa file |

### Biến môi trường (`.env`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `ADMIN_API_BASE_URL` | ✓ | Gốc API backend cho các proxy phía server, vd. `http://localhost:8080/api/v1` |
| `NEXT_PUBLIC_BACKEND_ORIGIN` | ✓ | Origin backend cho link đăng nhập Google (trình duyệt điều hướng thẳng) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✓ | Khoá publishable Stripe (thanh toán thẻ) |
| `NEXT_PUBLIC_MAPTILER_KEY` | ✓ | Khoá MapTiler cho bản đồ |
| `NEXT_PUBLIC_SITE_URL` | | URL public của site (canonical, sitemap). Mặc định `http://localhost:3000` |
| `NEXT_PUBLIC_ALLOW_DOUBLE_SUBMIT` | | `true` = cho bấm gửi liên tiếp, CHỈ để test idempotency backend (đặt ở `.env.local`, không commit) |

## Tổ chức thư mục

Theo hướng dẫn [Project Structure](https://nextjs.org/docs/app/getting-started/project-structure)
của Next.js, kết hợp 2 cách: **code dùng chung ở `src/`**, **code riêng của 1 route nằm
ngay trong route đó** (trong các thư mục riêng tư bắt đầu bằng `_`).

```
src/
├─ app/                     Route (App Router) — mỗi thư mục có page.tsx là 1 trang
│  ├─ page.tsx              Trang chủ
│  ├─ _components/          Các section CHỈ trang chủ dùng
│  ├─ checkout/
│  │  ├─ page.tsx · CheckoutView.tsx · checkout.module.css
│  │  ├─ _components/       Component chỉ trang checkout dùng
│  │  ├─ _hooks/            Hook chỉ trang checkout dùng
│  │  └─ payment/           Route con /checkout/payment (cùng quy ước)
│  ├─ admin/(dashboard)/    Route group: các trang admin dùng chung layout có sidebar
│  ├─ admin/(editor)/       Route group: trang toàn màn hình (editor tour, xem panorama)
│  └─ api/                  Route handler — proxy tới backend (public / account / admin)
├─ components/              Component dùng ở TỪ 2 TRANG TRỞ LÊN (header, date picker...)
├─ hooks/                   Hook dùng chung
├─ lib/                     Logic không phải component, chia theo nghiệp vụ
│  ├─ api/                  Nói chuyện với backend: kiểu dùng chung, bóc envelope, client công khai
│  ├─ admin/ auth/ booking/ hotels/ media/ tour/   API + type của từng mảng
│  └─ format.ts, searchFilters.ts...                tiện ích dùng chung
├─ data/                    Dữ liệu tĩnh (danh mục tỉnh/xã, nội dung pháp lý)
└─ styles/                  CSS dùng chung (controls.module.css...)
```

### Quy ước

1. **Gốc thư mục của 1 route** chỉ để: `page.tsx` (+ `layout.tsx`, `loading.tsx`... nếu có),
   component chính của trang (`XxxView.tsx`) và file CSS của trang.
2. **Code chỉ route đó dùng** đặt trong thư mục riêng tư của route:
   - `_components/` — component con
   - `_hooks/` — hook
   - `_lib/` — hàm thuần (tính toán, validate, hằng số) + file test của chúng

   Thư mục bắt đầu bằng `_` không bao giờ thành route, kể cả lỡ đặt `page.tsx` bên trong.
3. **Route con dùng chung với route cha** thì để ở thư mục `_` của route cha — vd. trang
   `/hotel/[id]/room/[roomId]` dùng `RoomCard` từ `hotel/[id]/_components/`.
4. **Dùng ở từ 2 trang (không cùng nhánh) trở lên** → chuyển lên `src/components/`,
   `src/hooks/` hoặc `src/lib/`.
5. **Trang ít file** (dưới ~5) để phẳng, không tạo thư mục `_` chỉ có 1 file.
6. **Import:** code trong cùng route dùng đường dẫn tương đối (`./_components/...`); code
   dùng chung dùng alias `@/` (`@/components/...`, `@/lib/...`). Không import `@/app/...`
   — nếu 2 trang khác nhánh cùng cần, chuyển nó ra `src/` theo quy ước 4.
7. **CSS Module** đặt cạnh component dùng nó. Component con của 1 trang có thể dùng chung
   file CSS của trang (`../checkout.module.css`).
8. **Test** (`*.test.ts`) đặt cạnh file được test. Chỉ test logic thuần, không render component.

## Gọi API

Trình duyệt không gọi thẳng backend (backend chưa mở CORS, và token nằm trong cookie
httpOnly để JavaScript phía client không đọc được). Mọi lời gọi đi qua 3 proxy:

| Proxy | Dùng cho | Client |
|---|---|---|
| `/api/public/*` | Trang công khai (khách sạn, đặt phòng, thanh toán) | `lib/api/public.ts` |
| `/api/account/*` | Khách đã đăng nhập (cookie `mota_acc_*`) | `lib/auth/apiClient.ts` |
| `/api/admin/*` | Trang quản trị (cookie `mota_admin_*`) | `lib/admin/apiClient.ts` |

Backend bọc mọi response JSON trong envelope `{ statuscode, error, message, data }`. Các
client tự bóc `data` ra và ném lỗi có `message` đọc được (`lib/api/envelope.ts`), nên
component chỉ làm việc với dữ liệu thật. Backend tắt / treo thì proxy trả `502` / `504`
với envelope tương tự (`lib/api/backendProxy.ts`).

Server Component gọi thẳng backend (server-to-server, không vướng CORS) qua
`lib/hotels/server.ts`, `lib/media/server.ts`.
