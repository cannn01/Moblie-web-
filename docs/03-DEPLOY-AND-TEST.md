# 03 — Chơi qua Internet và kiểm tra trước khi nộp

## Cùng Wi-Fi và qua Internet là hai trường hợp khác nhau

IP `192.168.x.x` chỉ dùng trong LAN. Muốn bạn bè chơi bằng 4G/Wi-Fi khác, backend cần máy chủ có địa chỉ truy cập công khai. Chỉ đóng gói APK không làm backend tự xuất hiện trên Internet.

Dự án hiện dùng một tiến trình server với các phòng trong RAM. SQLite bền vững giữ tài khoản/điểm; trận đang chơi không khôi phục sau restart server. Chưa hỗ trợ nhiều replica backend hay tự di chuyển phòng giữa server.

## Ví dụ triển khai một VPS bằng Docker + Caddy

1. Chuẩn bị một VPS Linux có Docker Compose, domain trỏ A/AAAA record đúng IP VPS.
2. Copy source và `.env` thật lên máy chủ qua kênh quản trị của bạn; giữ JSON Firebase Admin trong thư mục secrets.
3. Mở firewall 80/443 và cổng quản trị cần dùng; backend 3001 không cần mở công khai.
4. Trong `.env` trên VPS:

```dotenv
APP_DOMAIN=game.tenmiencuaban.com
VITE_API_URL=
ALLOWED_ORIGINS=https://game.tenmiencuaban.com,http://localhost,https://localhost,capacitor://localhost
FIREBASE_PROJECT_ID=project-id-cua-ban
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-admin.json
REQUIRE_VERIFIED_EMAIL=true
ALLOW_GUEST=true
```

Thêm cả cấu hình `VITE_FIREBASE_*` và `GUEST_SECRET` thật.

5. Chạy ở thư mục dự án:

```bash
docker compose -f compose.release.yaml up -d --build
```

Caddy cấp HTTPS nếu DNS/cổng 80/443 đáp ứng yêu cầu ACME. Web Nginx chuyển `/api` và `/socket.io` tới backend, nên web và app đều dùng domain này. Chưa triển khai VPS thực trong phiên tạo source.

6. Firebase Authorized domains thêm `game.tenmiencuaban.com`.
7. Trong `.env.local` trên PC dùng để build APK:

```dotenv
VITE_API_URL=https://game.tenmiencuaban.com
CAP_ANDROID_ALLOW_HTTP=false
```

Giữ cấu hình Firebase giống web, chạy `npm run android:sync` rồi build APK. Cả web và app gọi backend qua HTTPS/WSS.

Dữ liệu volume release nằm trong volume `snake_data` của compose project. Backup trước khi thay máy chủ. Muốn tắt dùng `docker compose -f compose.release.yaml down`; không thêm `-v` nếu giữ dữ liệu.

## Kịch bản kiểm tra chức năng

| Kiểm tra | Kết quả cần đạt |
|---|---|
| Một người chơi nhanh | 1 người + 9 AI, rắn di chuyển/ăn/đổi điểm |
| Hai cửa sổ ẩn danh chung phòng | Nhìn thấy nhau; mã phòng trùng; 2 người + 8 AI |
| Web + APK chung phòng | Cùng bản đồ, người chơi, thức ăn và bảng điểm |
| 10 người thật | Không còn bot; người 11 bị từ chối |
| Người rời phòng | Tăng bot, tổng slot không vượt 10 |
| Đầu đâm thân / đầu–đầu / chạm biên | Chết đúng luật; chỉ lưu một kết quả mỗi lần chết |
| Giữ boost sau khi ăn | Nhanh hơn, giảm khối lượng; kỷ lục không giảm |
| Người mới xuất hiện | Bảo vệ 3 giây, sau đó va chạm bình thường |
| Mất mạng ngắn | Nối lại trong 15 giây vẫn cùng slot/rắn; có thể đã chết trên server |
| Mất mạng dài | Chỗ cũ được bot thay; client quay lại phải vào trận mới |
| Đăng ký email | Nhận thư; backend không cho chơi bằng mật khẩu chưa xác minh |
| Google web + Google APK cùng tài khoản | Điểm và skin giống sau khi thoát phòng/cập nhật hồ sơ |
| Facebook và liên kết phương thức | Sau liên kết, cùng UID và cùng điểm |
| Đổi skin chưa mở | Backend từ chối, sửa DOM không vượt được kiểm tra |
| Nhạc | Menu/trận chuyển đúng; tắt/âm lượng; app nền không tiếp tục nhạc |
| Layout | Menu 360px không tràn ngang; game ngang nút không che HUD |
| Cảm ứng | Joystick và boost đồng thời; nhả ngón/pointercancel không kẹt boost |
| Restart Docker | Điểm/skin giữ; phòng cũ mất vì trạng thái trận ở RAM |

## Đo độ mượt thực tế

FPS ở HUD là FPS renderer của thiết bị. Ping là thời gian round-trip ứng dụng, không phải FPS. Mục tiêu 60 FPS cần đo khi có 10 rắn dài và nhiều thức ăn, không chỉ lúc mới vào trận.

Thử trên điện thoại thật 10–15 phút, chất lượng Cao/Tiết kiệm. Theo dõi FPS, pin/nhiệt, độ trễ lái. Client cache texture, tái sử dụng sprite và làm mượt trạng thái; không thể đảm bảo 60 FPS trên mọi máy hoặc mạng.

Bản đầu gửi tọa độ thân lấy mẫu và full snapshot thức ăn khi thay đổi. Chưa có binary delta protocol hay client-side replay/reconciliation đầy đủ; mạng yếu hoặc nhiều phòng có thể cần tối ưu thêm sau số liệu thử nghiệm. Không mô tả bản này là production scale.

## Các API chính

- `GET /api/health`
- `POST /api/guest`
- `GET /api/catalog`
- `GET /api/leaderboard`
- `GET /api/profile` / `PATCH /api/profile` — Bearer Firebase ID token hoặc token khách server ký
- `GET /api/rooms` — chỉ liệt kê phòng public

Socket: `join`, `input`, `sync`, `respawn`, `leave`, `ping-check`; server gửi `state`, `food`, `died`.

Không có endpoint nhận điểm số tùy ý từ client. Score và unlock skin được lấy từ simulation server. Các dòng `score` ở payload client không được dùng.
