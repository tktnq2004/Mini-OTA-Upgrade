# Backend Changes — Mini-OTA

Changelog kỹ thuật cho các thay đổi ở backend (`D:\Mini-OTA`, repo `kyss18/Mini-OTA`) thực hiện trong phiên làm việc gần đây: mở API xem công khai, audit + sửa quyền Role "CUSTOMER", cho phép đặt phòng không cần tài khoản, và 1 lỗ hổng bảo mật phát hiện dọc đường. Mỗi mục ghi rõ **file**, **code trước → sau**, **lý do**, **kết quả** (đã test thật bằng curl, không chỉ đọc code).

> Không gồm `StartupRunner.java` / `application.properties` (thay đổi từ việc seed dữ liệu thật ở phiên trước, đã ghi trong `ADMIN.md`). Bản tóm tắt gọn hơn, theo hướng kể chuyện, nằm ở `ADMIN.md` mục 10–11 — file này là bản chi tiết đối chiếu code.

---

## 1. Mở API đọc (GET) cho khách chưa đăng nhập

**Vấn đề**: dự án cho phép khách chưa đăng nhập xem hotel/room/tiện nghi/review, nhưng mọi API đọc đều bắt buộc `@PreAuthorize` + JWT hợp lệ.

**File: `src/main/java/com/Mini_OTA/rebuild/config/SecurityConfig.java`**

Trước:
```java
private static final String[] PUBLIC_ENDPOINTS = {
        "/api/v1/users",
        "/api/v1/users/**",
        "/api/v1/auth/login-google",
        "/api/v1/auth/login",
        "/api/v1/auth/login-google2",
        "/api/v1/auth/session/**",
        "/api/v1/hotels/*/thumbnail",
        "/api/v1/rooms/*/thumbnail"
};
...
.authorizeHttpRequests(
        authz -> authz.requestMatchers(PUBLIC_ENDPOINTS).permitAll().anyRequest()
                .authenticated())
```

Sau:
```java
private static final String[] PUBLIC_ENDPOINTS = { /* giữ nguyên như cũ */ };

// Chỉ GET mới public ở nhóm này
private static final String[] PUBLIC_GET_ENDPOINTS = {
        "/api/v1/hotels",
        "/api/v1/hotels/*",
        "/api/v1/rooms/*",
        "/api/v1/amenity",
        "/api/v1/view",
        "/api/v1/roomtype/*",
        "/api/v1/hotels/*/reviews",
        "/api/v1/rooms/*/reviews",
        "/api/v1/reviews/*",
        "/api/v1/provinces",
        "/api/v1/wards/provinces/*",
        "/api/v1/bookings/lookup"
};

// POST duy nhất /bookings public
private static final String[] PUBLIC_POST_ENDPOINTS = {
        "/api/v1/bookings"
};
...
.authorizeHttpRequests(
        authz -> authz.requestMatchers(HttpMethod.GET, PUBLIC_GET_ENDPOINTS).permitAll()
                .requestMatchers(HttpMethod.POST, PUBLIC_POST_ENDPOINTS).permitAll()
                .requestMatchers(PUBLIC_ENDPOINTS).permitAll().anyRequest()
                .authenticated())
```

**Tại sao tách riêng mảng mới thay vì thêm vào `PUBLIC_ENDPOINTS` cũ**: `PUBLIC_ENDPOINTS` dùng `requestMatchers(String...)` — permitAll theo **path, bất kể HTTP method**. Nếu thêm `/api/v1/hotels` vào đó, `POST /hotels` (tạo khách sạn) và `DELETE /hotels/{id}` cũng bị mở theo, chỉ còn `@PreAuthorize` của method chặn lại (đổi 401 → 403, không phải lỗ hổng nhưng cẩu thả). Dùng `requestMatchers(HttpMethod.GET, ...)`/`requestMatchers(HttpMethod.POST, ...)` để giới hạn đúng method.

**File: `HotelController.java`, `RoomController.java`, `AmenityController.java`, `ViewController.java`, `RoomTypeController.java`, `ReviewController.java`**

Ví dụ (`HotelController.java`):
```diff
+    // Public — khách chưa đăng nhập vẫn xem được khách sạn
     @GetMapping("/hotels/{id}")
-    @PreAuthorize("hasAuthority('HOTEL_READ')")
     @ResponseBody
     public ResponseEntity<ResHotelDTo> getById(@PathVariable Long id) throws ExceptMessage {

     @GetMapping("/hotels")
-    @PreAuthorize("hasAuthority('HOTEL_READ')")
     @ResponseBody
     public ResHotelPaginate hotelPaginate(...) throws ExceptMessage {
```
Cùng pattern (gỡ `@PreAuthorize` khỏi đúng 1 method GET) áp dụng cho: `RoomController.fetch_room`, `AmenityController.get`, `ViewController.getAll`, `RoomTypeController.fetch_id`, `ReviewController.getHotelReviews`/`getRoomReviews`/`getid`.

**Tại sao phải sửa CẢ 2 lớp (filter chain + `@PreAuthorize`)**: Spring Security có 2 lớp độc lập — filter chain (`SecurityConfig`, chặn TRƯỚC khi request tới controller) và method security (`@PreAuthorize`, chặn SAU khi tới controller, kể cả khi filter đã cho path đó `permitAll`). Đã tự tay xác nhận: gỡ `@PreAuthorize` mà chưa sửa filter chain → vẫn 401 (filter chặn trước). Thêm path vào filter chain mà chưa gỡ `@PreAuthorize` → vẫn 403 (method chặn sau, `hasAuthority(...)` fail vì user ẩn danh không có quyền nào).

**Kết quả** (curl thật, không token): `GET /hotels`, `/hotels/{id}`, `/rooms/{id}`, `/amenity`, `/view`, `/roomtype/{id}`, `/hotels/{id}/reviews`, `/provinces`, `/wards/provinces/{id}` → **200**. `POST /hotels`, `DELETE /hotels/{id}` không token → vẫn **401** (không bị lỡ mở).

---

## 2. Đặt phòng không cần tài khoản (guest booking)

**Vấn đề**: `Booking.user` bắt buộc (`nullable=false`), và `BookingService.create()` luôn giả định có JWT hợp lệ — request ẩn danh crash `NoSuchElementException`.

**File: `src/main/java/com/Mini_OTA/rebuild/domain/Booking.java`**

Trước:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "UserID", nullable = false)
//user authenticated
private User user;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "RoomID", nullable = false)
private Room room;
```

Sau:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "UserID", nullable = true)
private User user;

@Column(name = "GuestFullName")
private String guestFullName;
@Column(name = "GuestEmail")
private String guestEmail;
@Column(name = "GuestPhone")
private String guestPhone;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "RoomID", nullable = false)
private Room room;
```

**File: `src/main/java/com/Mini_OTA/rebuild/domain/request/Booking/ReqCreateBookingDTO.java`** — thêm 3 field tương ứng (`guestFullName`, `guestEmail`, `guestPhone`), không `@NotBlank` vì chỉ bắt buộc *có điều kiện* (khi không có JWT).

**File: `src/main/java/com/Mini_OTA/rebuild/service/BookingService.java` — `create()`**

Trước:
```java
Room room=optionalRoom.get();
Booking booking=new Booking();
booking.setCheckIn(reqCreateBookingDTO.getCheckIn());
booking.setCheckOut(reqCreateBookingDTO.getCheckOut());
booking.setRoom(room);
//security context
Optional<User> optionalUser = this.userRepository.findByEmail(JwtUtils.getCurrentUserLogin().orElse(""));
booking.setUser(optionalUser.get());
```

Sau:
```java
String currentEmail = JwtUtils.getCurrentUserLogin().orElse("");
Optional<User> optionalUser = currentEmail.isBlank()
        ? Optional.empty()
        : this.userRepository.findByEmail(currentEmail);
boolean isGuest = optionalUser.isEmpty();
if (isGuest) {
    if (reqCreateBookingDTO.getGuestFullName() == null || ...isBlank()) error.add("Guest full name is required...");
    if (reqCreateBookingDTO.getGuestEmail() == null || ...isBlank()) error.add("Guest email is required...");
    if (reqCreateBookingDTO.getGuestPhone() == null || ...isBlank()) error.add("Guest phone is required...");
}
if (!error.isEmpty()) throw new NotFound(error);

Room room=optionalRoom.get();
Booking booking=new Booking();
booking.setCheckIn(reqCreateBookingDTO.getCheckIn());
booking.setCheckOut(reqCreateBookingDTO.getCheckOut());
booking.setRoom(room);
if (isGuest) {
    booking.setGuestFullName(reqCreateBookingDTO.getGuestFullName());
    booking.setGuestEmail(reqCreateBookingDTO.getGuestEmail());
    booking.setGuestPhone(reqCreateBookingDTO.getGuestPhone());
} else {
    booking.setUser(optionalUser.get());
}
```

**File: `BookingService.java` — `fetch_id()` và `cancel()`** — thêm null-check `booking.getUser()` trước khi gọi `.getId()`, vì giờ có thể null (booking khách vãng lai):
```diff
- if (booking.getUser().getId() == user.getId() || user.getRole() == RoleEnum.ADMIN) {
+ boolean isOwner = booking.getUser() != null && booking.getUser().getId() == user.getId();
+ if (isOwner || user.getRole() == RoleEnum.ADMIN) {
```
```diff
- if (booking.getUser().getId().equals(user.getId())){
+ if (booking.getUser() != null && booking.getUser().getId().equals(user.getId())){
```

**File mới trong `BookingRepository.java`** — API tra cứu công khai bằng id + email:
```java
@Query("select b from Booking b left join b.user u where b.id = :id and (b.guestEmail = :email or u.email = :email)")
Optional<Booking> findByIdAndEmail(@Param("id") Long id, @Param("email") String email);
```
Lưu ý kỹ thuật: **phải** dùng `left join b.user u` tường minh. Viết tắt `b.user.email` (implicit join) bị Hibernate dịch thành `INNER JOIN` ở SQL sinh ra — loại thẳng mọi booking có `user = null` khỏi kết quả dù mệnh đề `OR guestEmail = :email` đúng lẽ ra phải khớp. Tự dính bug này khi viết lần đầu (test: tra đúng id+email vẫn báo "không tìm thấy"), sửa bằng left join mới đúng.

**File: `BookingController.java`** — thêm endpoint, bỏ dòng `@PreAuthorize` đã comment sẵn (không còn ý nghĩa vì method giờ có logic guest/user riêng):
```diff
+    @PostMapping("/bookings")
-    //@PreAuthorize("hasAuthority('BOOKING_CREATE')")
-    @ResponseBody
     public ResponseEntity<Booking> create(...) { ... }

+    @GetMapping("/bookings/lookup")
+    @ResponseBody
+    public ResponseEntity<Booking> lookup(@RequestParam("id") Long id, @RequestParam("email") String email) throws Exception {
+        return ResponseEntity.ok(this.bookingService.lookup(id, email));
+    }
```

**Database — thay đổi thủ công ngoài code**: `spring.jpa.hibernate.ddl-auto=update` chỉ **cộng thêm** cột/bảng mới, **không tự nới lỏng** constraint cột đã tồn tại. Đổi `@JoinColumn(nullable=true)` ở Java không tự đổi cột `userid` trong MySQL từ `NOT NULL` sang nullable — phải chạy tay:
```sql
ALTER TABLE bookings MODIFY userid BIGINT NULL;
```
Nếu deploy/seed lại schema `bookings` ở môi trường khác, phải chạy lại lệnh này (hoặc dùng migration tool thay vì `ddl-auto=update`).

**Kết quả** (curl thật):
- `POST /bookings` không token, đủ `guestFullName/guestEmail/guestPhone` → **201**, `user: null`, 3 field guest điền đúng.
- `POST /bookings` không token, thiếu `guestPhone` → lỗi rõ ràng "Guest phone is required...", không crash.
- `POST /bookings` có token → vẫn hoạt động như cũ (`user` set, guest fields null) — không phá luồng cũ.
- `GET /bookings/lookup?id=&email=` đúng → trả booking; sai email → báo không tìm thấy, không lộ dữ liệu.

---

## 3. Tất cả user đăng ký tự động có Role "CUSTOMER" thật

**Vấn đề**: `UserService.create_user` chỉ set field `role` (enum hiển thị, không cấp quyền — khác với `roles`, quan hệ nhiều-nhiều thật với bảng `Permission`). Mọi khách tự đăng ký có **0 quyền thật** dù field `role` hiện đúng "CUSTOMER".

**File: `src/main/java/com/Mini_OTA/rebuild/service/UserService.java` — `create_user()`**

Trước:
```java
user.setRole(req.getRole());
user.setFullName(req.getFullName());
user.setPhone(req.getPhone());
user.setUserName(req.getUsername());
User save_user= this.userRepository.save(user);
```

Sau:
```java
user.setRole(req.getRole() != null ? req.getRole() : RoleEnum.CUSTOMER);
user.setFullName(req.getFullName());
user.setPhone(req.getPhone());
user.setUserName(req.getUsername());
this.roleRepository.findByRoleName("CUSTOMER")
        .ifPresent(customerRole -> user.setRoles(new HashSet<>(Set.of(customerRole))));
User save_user= this.userRepository.save(user);
```

**Lý do 2 phần**:
1. `role` null (không gửi field lúc đăng ký công khai) làm `JwtUtils.createRefToken` crash `IllegalArgumentException` ngay lần đăng nhập đầu (JwtClaimsSet không cho claim value null) — mặc định `CUSTOMER` khi thiếu.
2. `roleRepository.findByRoleName("CUSTOMER")` — tự gán Role thật (tên "CUSTOMER", tạo tay ở trang Phân quyền admin) vào `user.roles`, để user mới có quyền thật ngay từ lúc tạo, không chỉ field hiển thị. Không tìm thấy role thì bỏ qua (không chặn đăng ký).

**Kết quả**: đăng ký → đăng nhập → `GET /bookings/me` từ **403** (trước khi sửa) → **200** (sau khi sửa).

---

## 4. Audit + sửa quyền Role "CUSTOMER"

**Không phải thay đổi code — thay đổi dữ liệu** trong bảng `role_permissions` (`roleid = 12`, role "CUSTOMER") sau khi rà lại tên quyền thật đang được `@PreAuthorize` các nơi kiểm tra.

| Permission | Trước | Sau | Lý do |
|---|---|---|---|
| `USER_UPDATE` | Có | **Gỡ** | 🔴 Nguy hiểm: `UserService.update` coi có quyền này = "admin", cho sửa/đổi role **BẤT KỲ** user nào, không chỉ hồ sơ mình. Tự sửa hồ sơ mình không cần quyền này (đã có self-id check riêng — xem mục "PUT /users tự sửa hồ sơ mình" trong `ADMIN.md` mục 10). |
| `BOOKING_VIEW_OWN` | Có | **Gỡ**, thay bằng `BOOKING_READ_OWN` | Tên permission chết — không khớp `@PreAuthorize("hasAuthority('BOOKING_READ_OWN')")` thật ở `BookingController.getAllByUser`. Customer tưởng xem được booking của mình nhưng thực tế luôn 403. |
| `BOOKING_CANCEL` | Có | **Gỡ**, thay bằng `BOOKING_CANCEL_OWN` | Cùng lý do — `@PreAuthorize` thật check `BOOKING_CANCEL_OWN`. |
| `REVIEW_CREATE`/`REVIEW_UPDATE`/`REVIEW_DELETE` | Không có | **Thêm cả 3** | Customer không viết/sửa/xoá được review của chính mình. Đã xác nhận `ReviewService.update`/`delete_review` tự kiểm tra đúng chủ sở hữu ở tầng service (không phụ thuộc permission để giới hạn phạm vi), nên cấp quyền này an toàn — khác hẳn tình huống `USER_UPDATE`. |
| `HOTEL_READ`, `ROOM_READ` | Có | Giữ nguyên | Không còn tác dụng thật (2 endpoint đã public ở mục 1) nhưng giữ lại không hại gì. |
| `WISHLIST_CREATE`/`READ`/`DELETE` | Có | Giữ nguyên | Đúng, không cần sửa. |
| `BOOKING_CREATE` | Có | Giữ nguyên | Không có `@PreAuthorize` nào check field này hiện tại (đã comment ở `BookingController.create`, xem mục 2), giữ để tương thích nếu bật lại sau. |

**Kết quả**: `GET /bookings/me` (200), `PATCH /bookings/{id}/cancel` tự huỷ (200), `POST/GET/DELETE /wishlist` (200), `POST /hotels/{id}/reviews` (200) — test đủ vòng bằng 1 tài khoản customer thật.

---

## 5. 🔴 Lỗ hổng bảo mật: `password` + `refreshToken` lộ qua response review

**Phát hiện khi nào**: ngay sau khi mở `GET /hotels/{id}/reviews` công khai (mục 1) — review vốn đã có bug này từ trước, nhưng trước đó cần đăng nhập mới gọi được nên ít nghiêm trọng hơn; giờ public nghĩa là **bất kỳ ai, kể cả chưa đăng nhập**, đọc được.

**Nguyên nhân**: `Review.user` (kiểu `User`) không có `@JsonIgnore` — mọi response review serialize **toàn bộ entity `User`** của người viết, bao gồm `password` (hash bcrypt) và `refreshToken` (**token còn hiệu lực, dùng lại được để mạo danh đăng nhập** — nguy hiểm hơn cả password vì không cần crack hash).

**File: `src/main/java/com/Mini_OTA/rebuild/domain/User.java`**
```diff
     private String userName;
+    @JsonIgnore
     private String password;
     private String phone;
     ...
     @Column(columnDefinition = "MEDIUMTEXT")
+    @JsonIgnore
     private String refreshToken;
```
Sửa ở entity gốc (không phải chỉ ở `Review`) để chặn luôn 1 bug **đã biết từ trước nhưng chưa vá**: `POST /users/{userId}/roles` (admin gán role) cũng trả `User` thô tương tự — cùng 1 lần sửa chặn cả 2 chỗ.

**File: `src/main/java/com/Mini_OTA/rebuild/domain/Review.java`** — vẫn còn lộ email/sđt/roles/quyền nội bộ (ít nghiêm trọng hơn nhưng vẫn là PII không nên public), thu hẹp thêm:
```diff
+    @JsonIgnoreProperties({"email", "phone", "role", "roles", "createdBy", "updatedBy", "discounts", "hotel", "wishlist"})
     @ManyToOne
     @JoinColumn(name = "user_id",nullable = false)
     private User user;
```
`@JsonIgnoreProperties` đặt trên field (không phải trên class `User`) — chỉ ẩn các property đó **khi serialize qua đường `Review.user`**, không ảnh hưởng chỗ khác đọc `User` trực tiếp (vd. trang quản lý user của admin vẫn thấy đủ email/phone/roles như cũ).

**Kết quả**: response `GET /hotels/{id}/reviews` từ chứa `password`/`refreshToken`/`email`/`phone`/`roles` đầy đủ của người viết → chỉ còn `{id, fullName, userName, createdAt, updatedAt}`.

---

## 6. Nới quyền tự đọc/sửa hồ sơ cá nhân (`GET /users/{id}`, `PUT /users`)

*(Thực hiện ở phiên trước khi build trang `/account`, nhắc lại ở đây vì cùng nhóm "backend đổi để phục vụ khách không cần đăng nhập vẫn dùng được các tính năng cá nhân".)*

**File: `UserController.java`**
```diff
     @GetMapping("/users/{id}")
-    @PreAuthorize("hasAuthority('USER_READ')")
+    @PreAuthorize("isAuthenticated()")
     public ResponseEntity<ResUser> users(@PathVariable Long id) throws ExceptMessage {
+        boolean isSelf = id.equals(JwtUtils.getIdUserLogin());
+        boolean hasReadAuthority = SecurityContextHolder.getContext().getAuthentication().getAuthorities()
+                .stream().anyMatch(a -> a.getAuthority().equals("USER_READ"));
+        if (!isSelf && !hasReadAuthority) throw new Forbidden("Bạn không có quyền xem hồ sơ người dùng này");
         return ResponseEntity.ok(this.userService.fetch_id(id));
     }
     @PutMapping("/users")
-    @PreAuthorize("hasAuthority('USER_UPDATE')")
+    @PreAuthorize("isAuthenticated()")
     public ResponseEntity<ResUser> update(...) { ... }
```

**Lý do đặt check ở `UserController` (GET) thay vì trong `UserService.fetch_id`**: `fetch_id` có `@Cacheable(value="users", key="#id")` — nếu check quyền nằm TRONG method đó, lần gọi thứ 2 trở đi cho cùng `id` sẽ ăn cache và **bỏ qua luôn việc kiểm tra quyền** (lỗ hổng: user A đọc được hồ sơ đã cache sẵn của user B). Đặt check ở controller, trước khi gọi vào service, tránh được lỗ hổng này.

**File: `UserService.java` — `update()`** — xem đầy đủ ở mục "Kết quả" bên dưới; tóm tắt: tự đối chiếu `JwtUtils.getIdUserLogin()` với id đang sửa (self) HOẶC có `USER_UPDATE` thật (admin sửa user khác), không tin `req.getId()` mù quáng.

**Kết quả**: khách tự đăng ký (không có `USER_UPDATE`) sửa hồ sơ chính mình → 200 (trước đó 403). Sửa hồ sơ người khác không có quyền → 403 đúng như thiết kế. Admin có `USER_UPDATE` vẫn sửa/đổi role user khác bình thường (backward-compat).

---

## 7. Bug phụ phát hiện + sửa dọc đường (không thuộc yêu cầu gốc nhưng chặn luôn)

| File | Trước → Sau | Lý do |
|---|---|---|
| `UserService.java` — `fetch_id()` | `@Cacheable(value="users", key="#id")` → **gỡ hẳn** | Redis không phải lúc nào cũng chạy sẵn ở máy dev — mọi request `GET /users/{id}` (endpoint trang `/account` gọi liên tục) **crash 500** "Unable to connect to Redis" thay vì chỉ chậm hơn vì mất cache. Tra theo id đã có index primary key, không cần cache thêm. |
| `UserService.java` — `update()` | `user.setPassword(req.getPassword())` → `if (blank/null) giữ nguyên; else passwordEncoder.encode(...)` | Bug cũ: ghi thẳng password không hash, để trống thì ghi đè bằng chuỗi rỗng → mất khả năng đăng nhập vĩnh viễn. |
| `ReqUpdateUserDTO.java` | `@NotBlank` trên `password` → bỏ | Hệ quả của sửa trên: để trống giờ hợp lệ (= giữ nguyên), không cần bắt buộc nữa. |

---

## 8. Province/Ward: bỏ id tự tăng, dùng thẳng mã hành chính VN thật

**Yêu cầu**: dùng chung `vn-provinces-wards.json` (đã có sẵn ở frontend, dùng cho trang Map) cho cả FE lẫn BE — không còn để `provinces`/`wards` tự sinh id (`AUTO_INCREMENT`) riêng ở database nữa.

**File: `Province.java`, `Ward.java`**
```diff
-    @Id
-    @GeneratedValue(strategy = GenerationType.IDENTITY)
-    private Long id;
+    // id = mã hành chính VN thật (Code từ vn-provinces-wards.json)
+    @Id
+    private String id;
```
Không còn `@GeneratedValue` — id là "assigned identifier", gán tay lúc tạo (seed hoặc tạo mới), không để Hibernate/MySQL tự sinh nữa.

**File: `ProvinceRepository.java`, `WardRepository.java`**
```diff
-public interface WardRepository extends JpaRepository<Ward, Long> {
-    List<Ward> findByProvinceId(Long provinceId);
+public interface WardRepository extends JpaRepository<Ward, String> {
+    List<Ward> findByProvinceId(String provinceId);
```
Tương tự cho `ProvinceRepository<Province, Long>` → `<Province, String>`.

**File: `WardController.java`**
```diff
-    public List<String> getWardsFromProvince(@PathVariable("id") Long id){
+    public List<String> getWardsFromProvince(@PathVariable("id") String id){
```

**File: `ReqCreateHotelDTO.java`, `ReqUpdateHotelDTO.java`** — `wardId: Long` → `wardId: String` (đổi luôn `@NotNull` → `@NotBlank` cho khớp kiểu String). `HotelService.create()`/`update_hotel()` không cần sửa gì thêm — `wardRepository.findById(hotelDto.getWardId())` tự khớp type theo 2 chỗ trên, không có logic nào hard-code `Long` ở giữa.

**File: `StartupRunner.java`** — DTO đọc seed JSON:
```diff
     private static class SeedProvince {
+        // code = mã hành chính VN thật, dùng THẲNG làm Province.id
+        public String code;
         public String name;
-        public List<String> wards;
+        public List<SeedWard> wards;
     }
+    private static class SeedWard {
+        public String code;
+        public String name;
+    }
```
Vòng lặp seed:
```diff
     for (SeedProvince p : data.provinces) {
         Province province = new Province();
+        province.setId(p.code);
         province.setName(p.name);
         province = provinceRepository.save(province);
-        for (String wardName : p.wards) {
+        for (SeedWard w : p.wards) {
             Ward ward = new Ward();
-            ward.setName(wardName);
+            ward.setId(w.code);
+            ward.setName(w.name);
             ward.setProvince(province);
```

**File: `src/main/resources/seed/hotels-rooms.json`** — không sửa tay, chạy 1 script Node (không commit, chạy 1 lần rồi bỏ) đọc file này + `vn-provinces-wards.json` (frontend), cross-reference theo TÊN đã bỏ tiền tố hành chính ("Thành phố "/"Tỉnh "/"Phường "/"Xã "/"Thị trấn "/"Đặc khu " — đúng hàm `stripPrefix` mà `locations.data.ts` bên FE đã dùng), rồi ghi thêm field `code` vào mỗi tỉnh/ward trong JSON. Kết quả: khớp đủ 34/34 tỉnh, 3321/3321 ward — không thiếu cái nào.

**Database — migrate tay bắt buộc** (`ddl-auto=update` không tự đổi type cột `BIGINT` → `VARCHAR` của cột đã tồn tại):
```sql
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS amenities_rooms, discount_details, reviews, room_images,
  room_views, wishlists, bookings, rooms, hotels, wards, provinces;
SET FOREIGN_KEY_CHECKS=1;
TRUNCATE TABLE amenities;  -- StartupRunner seed lại không kiểm tra tồn tại,
TRUNCATE TABLE views;      -- để sót dữ liệu cũ sẽ crash app lúc khởi động
TRUNCATE TABLE room_types; -- vì trùng unique key (đã tự vấp lỗi này lúc migrate)
DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'seed.owner%');
DELETE FROM users WHERE email LIKE 'seed.owner%';
```
Sau đó restart app — Hibernate tự tạo lại các bảng đã drop với đúng type cột mới (`wards.id`, `provinces.id`, `hotels.ward_id` đều thành `VARCHAR(255)`), `StartupRunner` seed lại toàn bộ từ đầu (34 tỉnh, 3321 ward, 100 khách sạn, 1300 phòng, các catalog amenities/views/room_types). Không đụng bảng `users` thật (chỉ xoá đúng `seed.owner*` — user tổng hợp seed tự sinh, không phải tài khoản thật).

**Kết quả** (curl + browser thật):
- `GET /provinces`, `GET /wards/provinces/01` (mã mới) → đúng dữ liệu.
- `GET /wards/provinces/1` (id số kiểu cũ) → rỗng, không lỗi (đúng — không còn code nào là "1").
- `POST /hotels` với `wardId: "00070"` → 201, `ward.id`/`ward.province.id` trả về đúng string.
- Filter `GET /hotels?filter=ward.id : '00070'` — phải bọc nháy đơn quanh giá trị (turkraft/spring-filter coi giá trị không nháy là số/enum) → đúng số lượng.
- QA qua trình duyệt thật: tạo khách sạn bằng dropdown Tỉnh→Phường ở `/admin/hotels/new` (giờ dùng thẳng `src/data/locations.data.ts`, bỏ hẳn snapshot DB riêng `admin-locations.json`) → thành công; mở lại form sửa → 2 dropdown tự chọn đúng tỉnh/phường; trang danh sách lọc theo tỉnh rồi theo phường → đúng số khách sạn.

**File frontend liên quan** (không phải backend nhưng đổi cùng lúc vì chung kiểu dữ liệu): `src/lib/admin/types.ts` (`Province.id`/`Ward.id`/`HotelInput.wardId`: `number`→`string`), `src/lib/admin/resources.ts` (filter query bọc nháy đơn), `src/components/admin/ProvinceWardSelect.tsx` (đổi nguồn từ `adminLocations.ts` snapshot DB sang thẳng `@/data/locations.data`), xoá hẳn `src/data/admin-locations.json` + `src/lib/admin/adminLocations.ts`.

---

## 9. Seed thêm 400 khách sạn ngẫu nhiên (chỉ để test `GET /hotels`)

**File: `StartupRunner.java`** — thêm `seedRandomTestHotels()`, gọi sau
`seedHotelsAndRooms()` trong `run()`. Theo đúng yêu cầu: **không owner**
(`hotel.setUser(null)` — đã xác nhận cột `hotels.user_id` nullable thật
trong DB trước khi làm), **không phòng** nào.

Toạ độ: port nguyên bộ `PROVINCE_CENTERS` (34 mã tỉnh, đã phủ đủ Bắc-Trung-
Nam) từ `src/data/locations.data.ts` bên frontend sang Java, mỗi hotel random
1 trong 34 tỉnh + random 1 ward thật trong đúng tỉnh đó + jitter toạ độ
±0.15° quanh tâm tỉnh (~15km) để không dồn hết 1 điểm.

**File: `HotelRepository.java`** — thêm `countByUserIsNull()`/
`findByUserIsNull()`, dùng làm khoá idempotent riêng cho nhóm hotel test này
(tách biệt hoàn toàn khỏi cơ chế đếm phòng/ward của `seedHotelsAndRooms()`)
— đúng 400 thì bỏ qua, khác thì xoá nhóm này rồi seed lại, không đụng hotel
thật (luôn có owner).

> ⚠️ **Đã lỗi thời hoàn toàn — xem mục 11**: toàn bộ cách tiếp cận ở mục này
> (400 hotel RANDOM sinh trong code, tên dạng "Test Hotel N - Ward",
> `PROVINCE_CENTERS`, `hotel.setUser(null)`, `countByUserIsNull`/
> `findByUserIsNull`) đã bị THAY THẾ hoàn toàn — không chỉ đổi tên hàm do
> mục 10 (Hotel.user), mà đổi cả cách sinh dữ liệu. Giữ lại đoạn này chỉ để
> làm lịch sử.

**Kết quả**: tổng 500 hotel (100 thật + 400 test). Test `GET /hotels`:
`meta.total = 500`, `totalPages = 50` (size=10); trang cuối trả đúng "Test
Hotel 391..400"; 1 hotel test bất kỳ có `rooms: []`, phân bố đều khắp 34
tỉnh (7-17 hotel/tỉnh), toạ độ đúng vùng địa lý thật (vd. Lạng Sơn ở Bắc,
Cà Mau ở Nam).

---

## 10. Bỏ hẳn `Hotel.user`, chuyển khoá ngoại sở hữu sang `User.hotel`

**Câu hỏi đúng của người dùng làm lộ ra thiết kế sai**: "1 hotel có nhiều
owner/staff, 1 owner chỉ thuộc 1 hotel — vậy khoá ngoại phải nằm ở bảng
`users` trỏ về `hotels`, sao lại để `user_id` ở bảng `hotels`?". Đúng: quan
hệ 1-hotel-nhiều-nhân-viên thì FK phải nằm ở phía "nhiều" (`User`), không
phải phía "1" (`Hotel`). Thiết kế cũ (`Hotel.user` `@OneToOne`) chỉ cho phép
đúng 1 user/hotel, sai với thực tế (Manager/Staff/Reception nhiều người
cùng thuộc 1 hotel), và có `UNIQUE KEY` trên `hotels.user_id` để ép điều đó.
Đã chọn phương án dứt khoát: **xoá hẳn `Hotel.user`**, mọi nơi (kể cả người
tạo hotel/owner) đều xác định qua `User.hotel`.

**`Hotel.java`**: xoá hẳn field `@OneToOne @JoinColumn(name="user_id")
private User user;`.

**`User.java`**: đổi field `hotel` từ phía phản chiếu
(`@OneToOne(mappedBy="user")`, không có cột thật) sang phía sở hữu thật:
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "hotel_id")
@JsonIgnore
private Hotel hotel;
```
(`@JsonIgnore` để không lộ toàn bộ hotel — kể cả `rooms[]` — qua mọi response
có `User`, ví dụ review/booking).

**Đảo chiều toàn bộ logic "user này có quản lý hotel X không"** — trước đây
`targetEntity.getHotel().getUser().getId().equals(callerId)`, giờ
`callerUser.getHotel() != null && callerUser.getHotel().getId().equals(targetEntity.getHotel().getId())`,
áp dụng đúng 1 khuôn mẫu cho tất cả các chỗ vốn dựa vào `Hotel.user`:

- **`HotelService.java`**: `create()` — check "user đã có hotel chưa" đổi từ
  `existsByUserId` sang `user.getHotel() != null`; sau khi `save(hotel)` xong
  thì `user.setHotel(created); userRepository.save(user)` (giữ đúng hành vi
  cũ: ai tạo hotel thì tự động gắn với hotel đó). `delete_hotel()`,
  `update_hotel()` — check quyền `_OWN` đổi sang so `caller.getHotel().getId()`.
- **`RoomService.java`**: thêm dependency `UserRepository`; `create_room()`,
  `delete_room()`, `update_room()` đổi theo cùng khuôn mẫu.
- **`DiscountService.java`**: `delete_arr_room()`, `add_discount_in_room()`
  đổi theo cùng khuôn mẫu (đã sẵn có `UserRepository`).
- **`BookingService.java`**: nhánh quyền `BOOKING_CANCEL_ROOM` trong
  `cancel()` đổi theo cùng khuôn mẫu.
- **`RoomRepository.java`**: `findDetail`, `findAllRoomByUser`,
  `findRoomByUser_Authorize` — JPQL đổi từ join `r.hotel.user` sang subquery
  `hotel.id = (select u.hotel.id from User u where u.id = :id)`.
- **`BookingRepository.java`**: 3 query tương tự, đổi cùng khuôn mẫu subquery
  qua `User.hotel`; `findBookingByUser_Authorize` bỏ `join fetch hotel.user`.
- **`HotelRepository.java`**: xoá `existsByUserId`/`countByUserIsNull`/
  `findByUserIsNull` (không còn `Hotel.user` để query); thêm
  `countByNameStartingWith`/`findByNameStartingWith` làm khoá idempotent mới
  cho seed 400 hotel test (xem ghi chú lỗi thời ở mục 9).
- **`StartupRunner.java`**: `seedHotelsAndRooms()` — gán owner đổi từ
  `hotel.setUser(owner)` sang `owner.setHotel(hotel); userRepository.save(owner)`
  (chạy SAU khi hotel đã có id, vì FK giờ nằm ở `users`).
  `seedRandomTestHotels()` — đổi khoá idempotent sang
  `countByNameStartingWith`/`findByNameStartingWith("Test Hotel ")`, bỏ dòng
  `hotel.setUser(null)` (không còn ý nghĩa, hotel test vốn dĩ không gán field
  nào liên quan user nữa).

**Migrate schema + dữ liệu thật trên MySQL** (`ddl-auto=update` chỉ tự thêm
cột `users.hotel_id` mới, KHÔNG tự xoá cột `hotels.user_id` cũ hay tự chuyển
dữ liệu — phải làm tay, theo đúng tiền lệ mục 8):
```sql
-- 1. Chuyển dữ liệu sở hữu cũ sang chiều mới trước khi xoá cột cũ
UPDATE users u JOIN hotels h ON h.user_id = u.id SET u.hotel_id = h.id;
-- 2. Xoá FK + unique key + cột user_id cũ khỏi hotels
ALTER TABLE hotels DROP FOREIGN KEY FKbmtnc1ekbiwke2dfj0p64h4d3;
ALTER TABLE hotels DROP KEY UKedof2un7abelc56v6tarsdx25;
ALTER TABLE hotels DROP COLUMN user_id;
```
Xác nhận: 100/100 owner thật (seed.owner1..100) migrate đúng
(`users.hotel_id` khớp `hotels.id` cũ), không mất dữ liệu nào — không cần
xoá/reseed lại toàn bộ bảng như mục 8 (chỉ là xoá 1 cột, không đổi kiểu dữ
liệu).

**Đã test thật, không chỉ compile**: `./gradlew compileJava` sạch; viết test
tạm (`HotelUserRefactorTest`, xoá ngay sau khi verify) gọi thẳng
`RoomService.create_room()` qua `@SpringBootTest` + `@Transactional` (tự
rollback) trên DB thật — xác nhận **owner tạo được room trong đúng hotel
mình quản lý** và **bị `Forbidden` khi cố tạo room ở hotel người khác quản
lý**; cả 2 case pass. Backend restart qua `bootRun` thật, curl
`GET /api/v1/hotels` xác nhận `meta.total = 500` (không mất dữ liệu), filter
`name~'Test Hotel *'` vẫn ra đúng 400 kết quả.

---

## 11. Đổi 400 hotel test từ RANDOM sinh trong code sang dữ liệu THẬT viết cứng trong seed JSON

Theo yêu cầu tiếp theo: không random hoá trong code Java nữa, mà tra cứu
thật (tên khách sạn, địa chỉ, toạ độ) rồi viết thẳng vào
`resources/seed/hotels-rooms.json`, tự gắn đúng ward cho từng cái — giữ
nguyên 100 hotel thật ban đầu, **thêm** 400 hotel thật (không phải random)
mới, vẫn không owner/không phòng như yêu cầu gốc ở mục 9.

**Nguồn dữ liệu 400 hotel**: tra cứu tay theo kiến thức thật về các chuỗi
khách sạn có thật ở Việt Nam (Mường Thanh Grand/Luxury/Holiday — có chi
nhánh ở gần như mọi tỉnh; Sài Gòn Tourist — nhượng quyền "Sài Gòn + tên
tỉnh" ở nhiều tỉnh nhỏ; Vinpearl, Novotel, Pullman, Sheraton, InterContinental,
JW Marriott... ở các đô thị lớn) + tên/địa chỉ thật của các khách sạn độc
lập tại từng thành phố, phân bổ theo mức độ du lịch/dân số (Hà Nội 30, TP.HCM
35, Đà Nẵng 25, Khánh Hoà 20, Lâm Đồng 20... tới các tỉnh nhỏ 5-6/tỉnh),
trải đủ **34/34 tỉnh** (post-sáp nhập 2025) — đã xác nhận qua DB thật.

**Cách gắn đúng ward**: vì tên phường/xã cũ (trước sáp nhập) phần lớn vẫn
tồn tại dưới dạng tên ward mới trong `vn-provinces-wards.json` (ví dụ "Nha
Trang" vẫn là 1 ward trong tỉnh "Khánh Hoà" dù Nha Trang không còn là thành
phố riêng), viết 1 script Node (`gen-test-hotels.js`, chạy 1 lần, không phải
code production) nhận vào danh sách khách sạn kèm "gợi ý ward" (tên thành
phố/khu vực, ví dụ `"Nha Trang"`, `"Hoàn Kiếm"`), rồi tự đối chiếu với đúng
danh sách ward thật của tỉnh đó (khớp chính xác trước, khớp chứa sau) —
script BÁO LỖI ngay nếu có gợi ý nào không khớp được, đã bắt và sửa đúng 2
trường hợp lệch tên do sáp nhập ("Ninh Bình" → ward thật là "Hoa Lư",
"Bắc Ninh" → ward thật là "Kinh Bắc") trước khi ghi ra JSON — không có
khách sạn nào bị gán nhầm tỉnh/ward.

**File: `resources/seed/hotels-rooms.json`** — thêm mảng top-level mới
`testHotels` (400 phần tử, field: `name, address, image, latitude,
longitude, provinceName, wardName`, KHÔNG có `rooms`) — tách hẳn khỏi mảng
`hotels` (100 hotel thật đầy đủ, có `rooms`) để `seedHotelsAndRooms()` không
vô tình tạo owner+phòng cho nhóm test này.

**File: `StartupRunner.java`**:
- Xoá hẳn `PROVINCE_CENTERS` (34 toạ độ tâm tỉnh dùng để random offset) và
  toàn bộ logic random (`Random`, `nextInt`, `nextDouble`) — không còn cần
  vì toạ độ giờ lấy thẳng từ JSON.
- Đổi `seedRandomTestHotels()` → `seedTestHotelsFromJson()`: đọc
  `data.testHotels`, tra `Ward` qua khoá `(provinceName, wardName)` (cùng
  cách `seedHotelsAndRooms()` đang dùng cho 100 hotel thật), tạo `Hotel`
  không gán owner/phòng.
- Thêm class `SeedTestHotel` (giống `SeedHotel` nhưng không có `rooms`) và
  field `testHotels` trên `SeedData`.

**File: `HotelRepository.java`** — đổi khoá idempotent: `name` giờ là tên
khách sạn THẬT nên không còn tiền tố chung để nhận diện nhóm test
(`countByNameStartingWith("Test Hotel ")` hết tác dụng) → đổi sang tiền tố
URL ảnh riêng biệt không hotel thật nào dùng chung:
`countByImageStartingWith`/`findByImageStartingWith("https://picsum.photos/seed/wengo-testhotel-")`.

**Dọn dữ liệu cũ trên DB thật**: 400 hotel test RANDOM cũ (tên "Test Hotel
N - Ward") không được khoá idempotent MỚI nhận diện (tiền tố ảnh khác), nên
phải xoá tay 1 lần trước khi seed lại:
`DELETE FROM hotels WHERE name LIKE 'Test Hotel %';` — xoá đúng 400 dòng,
không đụng 100 hotel thật.

**Đã test qua DB + API thật**: restart backend, xác nhận `GET
/api/v1/hotels` trả `meta.total = 500`; 1 hotel test tra theo tên chính xác
(`Công Đoàn Cầu Giấy`) trả đúng UTF-8, đúng ward "Cầu Giấy"/tỉnh "Hà Nội",
`rooms: []`; group-by tỉnh trên DB xác nhận đủ **34/34 tỉnh**, tổng đúng
400, không hotel test nào có `users.hotel_id` trỏ tới (không owner); tên
không trùng lặp (400 tên khác nhau); chạy lại `bootRun` lần 2 xác nhận
idempotent (không tạo thêm dòng nào).

---

## Tổng hợp file đã đổi

```
D:\Mini-OTA\src\main\java\com\Mini_OTA\rebuild\
├── component\StartupRunner.java                        (mục 8, 9, 10, 11)
├── config\SecurityConfig.java                          (mục 1, 2)
├── controller\
│   ├── Amenity\AmenityController.java                  (mục 1)
│   ├── Booking\BookingController.java                  (mục 2)
│   ├── Hotels\HotelController.java                     (mục 1)
│   ├── Review\ReviewController.java                    (mục 1)
│   ├── Rooms\RoomController.java                       (mục 1)
│   ├── Rooms\RoomTypeController.java                   (mục 1)
│   ├── Users\UserController.java                       (mục 6)
│   └── Views\ViewController.java                       (mục 1)
├── domain\
│   ├── Booking.java                                    (mục 2)
│   ├── Hotel.java                                       (mục 10)
│   ├── Review.java                                     (mục 5)
│   ├── User.java                                       (mục 5, 10)
│   └── request\
│       ├── Booking\ReqCreateBookingDTO.java             (mục 2)
│       └── Users\ReqUpdateUserDTO.java                  (mục 7)
├── repository\
│   ├── BookingRepository.java                          (mục 2, 10)
│   ├── HotelRepository.java                            (mục 9, 10, 11)
│   └── RoomRepository.java                              (mục 10)
└── service\
    ├── BookingService.java                              (mục 2, 10)
    ├── DiscountService.java                              (mục 10)
    ├── HotelService.java                                (mục 10)
    ├── RoomService.java                                  (mục 10)
    └── UserService.java                                 (mục 3, 6, 7)
```

Database (không phải code, chạy tay qua MySQL client):
- `ALTER TABLE bookings MODIFY userid BIGINT NULL;` (mục 2)
- `role_permissions` cho `roleid=12` ("CUSTOMER"): gỡ `USER_UPDATE`/`BOOKING_VIEW_OWN`/`BOOKING_CANCEL`, thêm `BOOKING_READ_OWN`/`BOOKING_CANCEL_OWN`/`REVIEW_CREATE`/`REVIEW_UPDATE`/`REVIEW_DELETE` (mục 4)
- `UPDATE users u JOIN hotels h ON h.user_id=u.id SET u.hotel_id=h.id;` rồi
  `ALTER TABLE hotels DROP FOREIGN KEY ...; DROP KEY ...; DROP COLUMN user_id;`
  (mục 10)
- `DELETE FROM hotels WHERE name LIKE 'Test Hotel %';` — xoá 400 hotel test
  RANDOM cũ (không còn được khoá idempotent mới nhận diện) trước khi seed
  lại 400 hotel test THẬT mới (mục 11)

Toàn bộ đã `./gradlew compileJava` sạch, restart backend thật, test qua curl (không phải chỉ đọc code), và dọn sạch dữ liệu test khỏi DB sau khi xong.
