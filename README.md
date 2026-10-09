# Snake Arena — Web + backend + Android Capacitor

Bản dự án đầu tiên để chạy trên Windows bằng Docker Desktop, VS Code và Android Studio. Một backend phục vụ cả web lẫn Android; cùng mã phòng là cùng một trận đấu.

## Đã có trong mã nguồn

- React + TypeScript + Phaser 3; game rắn di chuyển tự do, theo chuột, WASD/mũi tên hoặc cảm ứng.
- Joystick đa chạm / chế độ theo ngón tay; giữ chuột trái, Space hoặc nút ϟ để boost.
- Thức ăn, thân rắn, mắt hướng theo đường đi, bảng điểm phòng, hiệu ứng bảo vệ 3 giây.
- Server Node.js + Socket.IO: 30 bước mô phỏng/giây, 15 bản trạng thái/giây; quyết định va chạm và điểm.
- Phòng nhanh, tạo phòng riêng, nhập mã 6 ký tự; tối đa 10 rắn gồm người + bot. Người mới thay bot.
- AI tìm thức ăn, tránh biên/thân đối thủ, đôi khi boost; bot chết tự xuất hiện lại.
- Giữ chỗ 15 giây khi mất kết nối, tự nối lại cùng rắn nếu vẫn trong thời gian đó.
- Firebase email/mật khẩu, gửi xác minh, quên mật khẩu, Google/Facebook và liên kết phương thức.
- SQLite lưu tên, điểm cao nhất, 8 skin theo mốc điểm, số trận, số rắn hạ, 10 trận gần đây trong UI.
- Nhạc menu `nhac_nen.mp3`, nhạc trận `nhac_trong_tran.mp3`, loop, bật/tắt/âm lượng.
- Docker web Nginx + backend + volume dữ liệu; cấu hình Capacitor và script chuẩn bị Android.

## Đọc trước khi chạy

Game khách chạy ngay, không cần Firebase. Đăng nhập thực cần Firebase project của bạn; Facebook cần Meta app của bạn. Mã nguồn không chứa tài khoản hay khóa riêng giả. Điểm khách gắn với phiên trình duyệt/app riêng, không tự chuyển vào tài khoản Google/Facebook khi đăng nhập.

APK chưa được build trên máy Android trong môi trường tạo dự án này. Hướng dẫn ở dưới tạo project Android rồi build bằng Android Studio của bạn. OAuth thực, email thực và độ mượt trên điện thoại thật cần kiểm tra bằng project/thiết bị của bạn.

Game ưu tiên màn hình ngang trên điện thoại. Menu co giãn ở cả dọc/ngang. Giới hạn chiều dài đồ họa là 1.600 đơn vị thế giới để kiểm soát tải; điểm vẫn tiếp tục tăng. Không có quảng cáo, thanh toán, boss hay sự kiện như game thương mại.

## Bước 1 — Chuẩn bị

Bạn đã có Docker Desktop, VS Code và Android Studio. Cài thêm **Node.js 24 LTS** từ https://nodejs.org/ để dùng npm và Capacitor trên Windows. Chạy backend bằng Docker không yêu cầu Node trên máy, nhưng bước Android có yêu cầu.

Android Studio dùng bản **Otter 2025.2.1 hoặc mới hơn** cho Capacitor 8. Trong SDK Manager cài Android SDK Platform 36 và các SDK Build-Tools mà Gradle yêu cầu. Dùng JDK 21 (Embedded JDK của Android Studio nếu phù hợp); không cần tự cài MySQL/Redis/Java backend.

Kiểm tra trong PowerShell:

```powershell
node -v
npm -v
docker version
docker compose version
```

Nếu PowerShell chặn `npm.ps1`, mở Command Prompt hoặc dùng `npm.cmd` thay `npm`; không cần đổi chính sách PowerShell toàn máy.

## Bước 2 — Mở đúng thư mục

1. Giải nén ZIP, đặt thư mục `snake-arena` vào `D:\Projects\snake-arena` (ví dụ).
2. Mở VS Code → **File → Open Folder…** → chọn `D:\Projects\snake-arena`.
3. Thư mục đang mở phải thấy `compose.yaml`, `package.json`, `client`, `server`.
4. VS Code → **Terminal → New Terminal**. Các lệnh tiếp theo chạy ở thư mục gốc này.
5. Mở Docker Desktop, chờ Docker Engine đang chạy.

## Bước 3 — Chạy web + backend lần đầu bằng Docker

Trong terminal PowerShell của VS Code:

```powershell
Copy-Item .env.example .env
```

Mở `.env`, thay `GUEST_SECRET` bằng một chuỗi ngẫu nhiên ít nhất 32 ký tự. Có thể tạo chuỗi bằng:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Dán chuỗi sinh ra vào `GUEST_SECRET=...`; giữ nguyên các dòng Firebase trống ở lần thử đầu.

```powershell
docker compose up -d --build
docker compose ps
```

Mở:

- Web: **http://localhost:8080**
- Kiểm tra backend: **http://localhost:3001/api/health**

Kết quả backend phải có `"ok": true`. `"firebase": false` là bình thường khi chưa cấu hình.

Trên web: nhập tên → **Chơi khách để thử ngay** → **CHƠI NGAY**. Một phòng gồm bạn và 9 AI sẽ xuất hiện. Rắn tự tiến, lái bằng chuột, ăn hạt màu. Ăn đủ rồi giữ chuột trái hoặc Space để boost.

## Bước 4 — Kiểm tra multiplayer trên web

1. Cửa sổ thứ nhất chọn **＋ Tạo phòng riêng**. Ghi mã phòng trên góc trái.
2. Mở cửa sổ **ẩn danh** (để có phiên khách khác), truy cập `http://localhost:8080`.
3. Nhập tên khác → Chơi khách → nhập mã → **Vào phòng**.
4. Cả hai cửa sổ phải thấy cùng tên người chơi và cùng mã; số lượng là 2 người + 8 AI.
5. Tối đa 10 người thật; người thứ 11 bị từ chối. Bạn vẫn có thể vào phòng khác.

Một tài khoản chỉ điều khiển một rắn tại một thời điểm. Nếu đăng nhập cùng UID trên web và app, phải thoát phòng ở thiết bị cũ trước khi chơi trên thiết bị mới. Dùng hai tài khoản khác nhau để kiểm thử chơi chung.

## Bước 5 — Chạy lại sau khi tắt máy

Mở Docker Desktop → mở VS Code ở thư mục dự án → Terminal:

```powershell
docker compose up -d
```

Sau khi sửa mã nguồn hoặc biến `VITE_*`:

```powershell
docker compose up -d --build
```

Xem lỗi:

```powershell
docker compose logs -f backend
docker compose logs -f web
```

Dừng dự án:

```powershell
docker compose down
```

Điểm vẫn được giữ trong Docker volume. **Không dùng `docker compose down -v` nếu muốn giữ dữ liệu**, vì `-v` xóa volume.

## Bước 6 — Bật tài khoản Firebase thật

Làm theo [docs/01-FIREBASE.md](docs/01-FIREBASE.md). Sau khi điền cấu hình, build lại web/backend. Kiểm tra tuần tự email → xác minh email → Google → Facebook, rồi mới sang Android.

## Bước 7 — Đóng gói Android và chơi cùng web

Làm theo [docs/02-ANDROID.md](docs/02-ANDROID.md). Với emulator dùng `http://10.0.2.2:3001`; với điện thoại thật cùng Wi-Fi dùng IP LAN máy chạy Docker. App chứa web build trong APK và kết nối backend chung, không trỏ WebView tới trang web từ xa.

## Bước 8 — Nếu muốn sửa code và thấy thay đổi ngay

Docker ở bước 3 là bản build cố định; sửa code cần `--build`. Khi lập trình có thể chạy Vite ở Windows với backend Docker:

```powershell
npm ci
Copy-Item client/.env.example client/.env.local
docker compose up -d backend
npm run dev:web
```

Mở `http://localhost:5173`. `.env.local` mặc định trỏ backend `http://localhost:3001`.

Hoặc chạy toàn bộ không Docker để debug:

```powershell
npm ci
npm run dev:server
```

Mở **terminal thứ hai** ở cùng thư mục gốc:

```powershell
npm run dev:web
```

Không chạy backend Docker và backend npm đồng thời cùng cổng 3001. Backend npm lưu SQLite trong `server/data`; backend Docker lưu trong volume — đây là hai nơi lưu riêng.

## Kiểm tra mã nguồn

```powershell
npm ci
npm test
npm run build
```

Các bài test kiểm tra giới hạn phòng, thay bot, ăn thức ăn, boost, va chạm, bảo vệ lúc spawn, socket multiplayer, reconnect, lưu điểm/skin, chống tự gửi điểm từ client.

## Cấu trúc

```text
snake-arena/
  client/                    Web React + Phaser, Capacitor
    src/App.tsx              Menu, tài khoản, skin, cài đặt
    src/GameView.tsx          HUD, joystick, boost, reconnect
    src/game.ts              Vẽ game, điều khiển, smoothing
    src/auth.ts              Firebase web + OAuth native
    public/audio/            Hai bản nhạc bạn cung cấp
  server/
    engine.mjs               Gameplay và AI trên server
    index.mjs                API và phòng Socket.IO
    auth.mjs                 Firebase token và phiên khách
    store.mjs                SQLite
    test/                    Kiểm thử gameplay/multiplayer
  scripts/android-config.mjs Chuẩn bị cấu hình Android
  docs/                      Firebase, Android, triển khai, kiểm thử
  compose.yaml               Chạy web/backend cục bộ
```

## Quy tắc game của dự án

- Điểm hiện tại = khối lượng ăn được còn lại; boost giảm điểm hiện tại. Điểm cao nhất trận và kỷ lục không giảm.
- Tốc độ thường 145, boost 245 đơn vị/giây; quay tối đa 3,5 radian/giây.
- Bản đồ 2.400 × 2.400. Chạm biên chết; đi xuyên thân mình được; đầu–đầu chết cả hai.
- Spawn có bảo vệ 3 giây. Người chết bấm chơi lại, bot tự chơi lại sau 2,5 giây.
- Chỗ của người đã chết được giữ để họ chơi lại; 10 slot tính cả người chờ chơi lại.
- Mất kết nối không dừng trận; rắn tiếp tục đi hướng cũ. Giữ chỗ 15 giây rồi thay bot.
- Cài đặt âm lượng/điều khiển lưu cục bộ. Điểm, skin và hồ sơ lưu server theo UID.
- Skin không tăng sức mạnh; mở theo kỷ lục 0, 100, 300, 600, 1.000, 2.000, 4.000.

Đây là thiết kế lấy cảm hứng từ ảnh và luật công khai của Snake.io; các con số ở trên là thông số dự án, không phải thông số nội bộ game gốc.

## Tài liệu tham khảo đã đối chiếu

- https://snake.io/tutorials.php
- https://www.snake.io/
- https://snake.io/blog/how-to-play-snake-io-with-friends-on-the-same-server/
- https://firebase.google.com/docs/auth/web/start
- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/auth/web/account-linking
- https://capacitorjs.com/docs/updating/8-0
- https://capawesome.io/docs/sdks/capacitor/firebase/authentication/

Đồ họa rắn/nền được vẽ bằng code. Hai file nhạc giữ nguyên bản bạn gửi; kiểm tra quyền sử dụng nếu phát hành công khai.
