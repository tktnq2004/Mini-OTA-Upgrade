# Loại phòng (RoomType) — đặc tả API

Từ 2026-10-25, **sức chứa, chính sách, tiện nghi, hướng nhìn** chuyển từ từng phòng lên
**loại phòng**. Mỗi khách sạn tự định nghĩa loại phòng của mình (vd. "Deluxe hướng biển");
phòng chỉ còn những gì khác nhau giữa các phòng cùng loại: **tên/số phòng, giá, mô tả, ảnh**.

## 1. Quy tắc nghiệp vụ

| Quy tắc | Chi tiết |
|---|---|
| Phạm vi | Loại phòng thuộc **1 khách sạn** (`hotelId`). Tên loại không trùng trong cùng khách sạn (không phân biệt hoa thường); 2 khách sạn khác nhau được trùng tên. |
| Thuộc loại phòng | `capacity` (số khách tối đa / phòng), `allowSmoking`, `allowPets`, `cancellationPolicy`, `amenities`, `views`. |
| Thuộc phòng | `name`, `price`, `thumbnail`, `description`, ảnh (`images`, panorama qua `/media`). |
| Phòng ↔ loại | Mỗi phòng **bắt buộc** có 1 loại, và loại đó phải thuộc **đúng khách sạn của phòng** (sai → 400). |
| Xoá loại | Còn phòng thuộc loại → **409**, không âm thầm xoá phòng. Chuyển phòng sang loại khác hoặc xoá phòng trước. |
| Xoá khách sạn | Xoá luôn các loại phòng của khách sạn đó (sau khi xoá phòng). |
| Tiện nghi / hướng nhìn | Vẫn là **danh mục dùng chung** do admin hệ thống quản lý (`/amenity`, `/view`). Loại phòng chỉ chọn từ danh mục. Xoá 1 tiện nghi/hướng nhìn → tự gỡ khỏi mọi loại phòng. |
| Phân quyền theo hotel | Giống Discount: người gọi có `hotelId = 0` (admin hệ thống) quản lý loại phòng của mọi khách sạn; owner chỉ của đúng khách sạn mình (khác → 403). Quyền: `ROOM_TYPE_CREATE/READ/UPDATE/DELETE` — OWNER có đủ 4, STAFF không có. |

## 2. Đối tượng `RoomType`

```json
{
  "id": 41,
  "hotelId": 3,
  "roomTypeName": "Deluxe hướng biển",
  "capacity": 2,
  "allowSmoking": false,
  "allowPets": false,
  "cancellationPolicy": true,
  "amenities": [{ "id": 1, "name": "Wi-Fi miễn phí", "icon": "wifi" }],
  "views": [{ "id": 2, "name": "View biển", "icon": "view-bien" }]
}
```

Phòng (`Room`) ở mọi response — `GET /hotels`, `/hotels/{id}`, `/hotels/me`, `/rooms/{id}`,
`/hotel/{id}/rooms` — trả **lồng nguyên** `roomType` như trên. Các field `capacity`,
`allowSmoking`, `allowPets`, `cancellationPolicy`, `amenities`, `views` **không còn** ở cấp phòng.

```json
{
  "id": 120,
  "name": "Phòng 301",
  "price": 1450000,
  "thumbnail": "https://…",
  "description": "…",
  "roomType": { "id": 41, "hotelId": 3, "roomTypeName": "Deluxe hướng biển", "capacity": 2, "…": "…" },
  "images": []
}
```

## 3. Endpoint loại phòng

| Method | Path | Quyền | Ghi chú |
|---|---|---|---|
| GET | `/api/v1/hotels/{hotelId}/room-types` | công khai | Mọi loại của hotel, sắp theo `id`. Hotel không tồn tại → 404. |
| GET | `/api/v1/room-types/{id}` | công khai | 404 nếu không có. |
| POST | `/api/v1/hotels/{hotelId}/room-types` | `ROOM_TYPE_CREATE` + đúng hotel | 201, trả `RoomType`. |
| PUT | `/api/v1/room-types/{id}` | `ROOM_TYPE_UPDATE` + đúng hotel | Trả `RoomType`. Không đổi được hotel. |
| DELETE | `/api/v1/room-types/{id}` | `ROOM_TYPE_DELETE` + đúng hotel | 409 nếu còn phòng. |

Body POST và PUT giống nhau:

```json
{
  "roomTypeName": "Deluxe hướng biển",
  "capacity": 2,
  "allowSmoking": false,
  "allowPets": false,
  "cancellationPolicy": true,
  "amenityIds": [1, 4, 7],
  "viewIds": [2]
}
```

- `amenityIds` / `viewIds` là danh sách **đầy đủ** — PUT thay thế toàn bộ, không cộng dồn.
  Bỏ trống = `[]`.
- 3 chính sách bỏ trống = `false`.

Lỗi:

| HTTP | Khi nào | `message` |
|---|---|---|
| 400 | Thiếu/sai field (`roomTypeName` trống hoặc > 100 ký tự, `capacity` < 1) | thông báo validate |
| 400 | `hotelId = 0` khi tạo | `Hotel is required` |
| 400 | Có id tiện nghi/hướng nhìn không tồn tại | `Some amenities are not found` / `Some views are not found` |
| 403 | Loại phòng / hotel không phải của người gọi | `You are not allowed to manage room types of this hotel` |
| 404 | Hotel / loại phòng không tồn tại | `Hotel not found` / `This room type is not exist` |
| 409 | Trùng tên trong hotel | `Room type "…" already exists in this hotel` |
| 409 | Xoá loại còn phòng | `This room type still has N room(s) — move them to another type or delete them first` |

## 4. Endpoint phòng (đã đổi)

`POST /api/v1/rooms`

```json
{ "hotelId": 3, "roomTypeId": 41, "name": "Phòng 301", "price": 1450000, "thumbnail": "", "description": "…" }
```

`PUT /api/v1/rooms`

```json
{ "roomId": 120, "roomTypeId": 41, "name": "Phòng 301", "price": 1500000, "description": "…" }
```

- `roomTypeId` (PUT) bỏ trống = giữ loại hiện tại; `thumbnail` (PUT) bỏ trống = giữ ảnh hiện tại.
- Loại phòng không tồn tại → 400 `Room type not found`; của hotel khác → 400
  `Room type does not belong to this hotel`.
- **Đã bỏ:** `DELETE /api/v1/relationships` (gỡ tiện nghi/hướng nhìn khỏi phòng) và các field
  `capacity`, `allowSmoking`, `allowPets`, `cancellationPolicy`, `amenities_id`, `viewIds` trong body phòng.
- **Đã bỏ:** `GET/POST/PUT/DELETE /api/v1/roomtype…` (loại phòng dùng chung cũ).

## 5. Dữ liệu & migration

- Bảng `room_types` thêm `hotel_id`, `capacity`, `allow_smoking`, `allow_pets`, `cancellation_policy`;
  bảng nối mới `room_type_amenities`, `room_type_views` (Hibernate `ddl-auto=update` tự tạo).
- Chuyển dữ liệu có sẵn (giữ id phòng, booking, wishlist, ảnh, panorama): khởi động backend bản mới
  1 lần cho Hibernate thêm cột/bảng, rồi chạy theo thứ tự:
  1. `Mini-OTA/docs/migrations/2026-10-25_room_type_per_hotel_convert.sql` — mỗi nhóm (khách sạn,
     loại dùng chung cũ) thành 1 loại phòng của khách sạn đó, cùng tên; sức chứa/chính sách lấy giá
     trị phổ biến nhất trong nhóm, tiện nghi/hướng nhìn lấy hợp; phòng trỏ sang loại mới; xoá loại
     dùng chung cũ. Chạy lại vẫn an toàn.
  2. `Mini-OTA/docs/migrations/2026-10-25_room_type_per_hotel.sql` — `ddl-auto=update` **không xoá**
     cột/bảng cũ nên phải xoá tay `amenities_rooms`, `room_views` và 4 cột cũ của `rooms`. Phải chạy:
     2 bảng nối cũ còn khoá ngoại tới `rooms`, chưa xoá thì không xoá được phòng.
- DB mới tinh: seed (`StartupRunner`) tự tạo loại phòng theo từng khách sạn — các phòng cùng
  `roomTypeLabel` trong `hotels-rooms.json` gộp thành 1 loại, cùng quy tắc như trên.

## 6. Frontend

| Nơi | Thay đổi |
|---|---|
| `lib/api/types.ts` | `RoomType` đầy đủ field; `RoomBase` bỏ 4 field, thêm `roomType`. |
| `lib/hotels/roomType.ts` | `roomCapacity`, `roomAmenities` (đọc qua `room.roomType`, phòng chưa gán loại = 1 khách), `roomTypePolicyLabels`. |
| `lib/admin/resources.ts` | `listRoomTypes`, `createRoomType`, `updateRoomType`, `deleteRoomType` theo endpoint mới; bỏ `removeRoomRelations`. |
| `/partner/room-types` (+ `/new`, `/[id]`) | Trang mới: danh sách, thêm, sửa, xoá loại phòng của khách sạn. |
| `/partner/rooms/*` | Form phòng chỉ còn tên, loại (dropdown), mô tả, giá, ảnh; cột phụ tóm tắt thông tin của loại. |
| `/admin/hotels/[id]` | Mục "Loại phòng" mới; form thêm/sửa phòng chọn loại từ dropdown. |
| `/admin/roomtypes` | Đã bỏ (cùng mục menu và thẻ ở trang tổng quan). |
| Trang khách (`/hotel/[id]`, phòng, checkout) | Sức chứa, tiện nghi đọc từ `room.roomType`. |
