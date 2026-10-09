# 02 — Đóng gói Android bằng Capacitor

Làm sau khi web và backend Docker chạy ổn. Capacitor đóng gói build web nằm trong APK, backend tiếp tục chạy ở máy/VPS riêng. Không chạy backend Node bên trong APK.

## 1. Cài dependency trên Windows

VS Code terminal ở thư mục gốc:

```powershell
npm ci
Copy-Item client/.env.example client/.env.local
```

Lệnh copy chỉ chạy lần đầu; đừng ghi đè `.env.local` đã cấu hình Firebase. Dùng `npm.cmd` nếu PowerShell chặn `npm.ps1`.

## 2. Chọn địa chỉ backend đúng

Mở `client/.env.local`.

### Android Emulator của Android Studio

```dotenv
VITE_API_URL=http://10.0.2.2:3001
CAP_ANDROID_ALLOW_HTTP=true
```

`10.0.2.2` là địa chỉ emulator dùng để truy cập máy host. Không dùng `localhost:3001` trong app, vì đó là chính điện thoại/emulator.

### Điện thoại thật cùng Wi-Fi

Trên Windows chạy:

```powershell
ipconfig
```

Lấy IPv4 của Wi-Fi/Ethernet đang kết nối, ví dụ `192.168.1.10`, rồi điền:

```dotenv
VITE_API_URL=http://192.168.1.10:3001
CAP_ANDROID_ALLOW_HTTP=true
```

Trước khi build APK, trên trình duyệt điện thoại mở `http://192.168.1.10:3001/api/health`. Phải thấy `ok: true`. Nếu không:

1. Máy và điện thoại phải cùng Wi-Fi, không phải Guest Wi-Fi có cô lập thiết bị.
2. Windows Defender Firewall → Allow an app through firewall → cho Docker Desktop trên mạng Private; hoặc tạo inbound rule cổng TCP 3001 và 8080, chỉ cho mạng Private.
3. `docker compose ps` phải có cổng `0.0.0.0:3001->3001` và `8080`.

Để mở web trên điện thoại tại `http://192.168.1.10:8080`, thêm origin đó vào `.env` gốc:

```dotenv
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost,https://localhost,capacitor://localhost,http://192.168.1.10:8080
```

Origin app là `https://localhost` mặc định trên Android Capacitor; đã có trong danh sách. `VITE_API_URL` trong `.env` gốc của Docker web giữ trống để dùng proxy cùng origin. Chỉ `.env.local` của app cần địa chỉ backend trực tiếp.

Sau khi sửa `.env` gốc:

```powershell
docker compose up -d --force-recreate backend
```

HTTP chỉ để thử LAN. Khi phát hành dùng `https://game.tenmiencuaban.com`, `CAP_ANDROID_ALLOW_HTTP=false`, rồi build/sync lại.

## 3. Build web và tạo project Android

```powershell
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

- `android:add` chỉ chạy một lần khi chưa có `client/android`.
- `android:sync` build web, copy assets, cập nhật plugin và cấu hình Android.
- `android:open` mở Android Studio đúng project `client/android`.
- Nếu đã có project Android, bỏ `android:add` và chỉ chạy sync/open.

Chưa điền Firebase: script chỉ bật App và Screen Orientation plugins, để APK khách chạy mà không cần `google-services.json`. Sau khi điền Firebase và sync, plugin Firebase được thêm.

## 4. Chạy trên emulator hoặc điện thoại

Trong Android Studio:

1. Chờ Gradle Sync xong. Cho phép tải SDK/dependency nếu IDE yêu cầu.
2. **Tools → SDK Manager**: cài Android SDK Platform 36 và SDK Build-Tools cần thiết.
3. **Settings → Build, Execution, Deployment → Build Tools → Gradle**: Gradle JDK dùng JDK 21 / Embedded JDK tương thích.
4. **Tools → Device Manager → Create Virtual Device** → chọn một máy Pixel → image có Google Play nếu muốn test Google login → Finish.
5. Chọn thiết bị ở toolbar → bấm **Run ▶**.
6. Điện thoại thật: bật Developer options → USB debugging, cắm USB và chấp nhận hộp thoại cho phép debug; chọn thiết bị rồi Run.

App menu có thể ở dọc. Vào trận tự khóa ngang, rời trận bỏ khóa. Chơi cảm ứng joystick trái + boost phải cùng lúc.

## 5. Web và app cùng phòng

1. Giữ Docker chạy trên PC.
2. Web ở `http://localhost:8080` → chọn Chơi khách → tạo phòng riêng.
3. App trên emulator/điện thoại → Chơi khách → nhập mã phòng web.
4. Cả hai phải thấy **2 người + 8 AI**, cùng tên đối thủ và cùng bảng điểm.
5. Nếu đã dùng Firebase, dùng hai tài khoản khác nhau để điều khiển hai rắn.

Chơi khách web và app có hai phiên riêng. Dữ liệu dùng chung nhiều thiết bị chỉ khi đăng nhập cùng Firebase UID và kết nối cùng server.

## 6. Bật Google login Android

1. Copy bốn giá trị `VITE_FIREBASE_*` của Web app vào `client/.env.local`.
2. Firebase Project settings → Your apps → **Add app → Android**.
3. Android package name nhập đúng `com.snakearena.game`.
4. Tạo APK debug/Run một lần để có debug keystore. Lấy fingerprint bằng terminal ở `client/android`:

```powershell
.\gradlew.bat signingReport
```

Lấy SHA-1 và SHA-256 phần `Variant: debug` / `Config: debug`, thêm vào Android app trong Firebase settings.

5. Bật Google provider trong Firebase Authentication.
6. Tải lại **google-services.json** sau khi thêm fingerprint. Đặt tại `client/android/app/google-services.json`.
7. Tại thư mục gốc:

```powershell
npm run android:sync
npm run android:open
```

8. Android Studio → Sync Project with Gradle Files → Run lại. Dùng emulator có Google Play/Google account hoặc điện thoại thật có Google Play services.

Script đã thêm `rgcfaIncludeGoogle=true` và cấu hình Credential Manager tương ứng. Luồng native lấy credential Google rồi đăng nhập Firebase JS SDK, nên token gửi backend là Firebase token cùng UID với web.

Khi ký release/đăng Google Play, thêm fingerprint của khóa release và **Play App Signing certificate** nếu phân phối qua Play, tải lại JSON. Fingerprint debug không thay thế fingerprint release.

## 7. Bật Facebook login Android

Làm Facebook web trước theo 01-FIREBASE.md.

1. Meta App Dashboard → thêm nền tảng Android, package `com.snakearena.game`, class launcher `com.snakearena.game.MainActivity`.
2. Điền key hash của chứng chỉ debug/release theo Quickstart Android của Meta; SHA-1 của Firebase và Meta key hash là hai định dạng khác nhau.
3. Lấy App ID và **Client Token**, thêm vào `client/.env.local`:

```dotenv
FACEBOOK_APP_ID=app-id-cua-ban
FACEBOOK_CLIENT_TOKEN=client-token-cua-ban
VITE_NATIVE_FACEBOOK_ENABLED=true
```

4. Chạy `npm run android:sync`, rồi Sync Gradle trong Android Studio. Script thêm Facebook dependency, strings và manifest cần thiết.
5. Thử bằng Meta Admin/Developer/Tester khi app còn Development; người dùng phổ thông cần điều kiện Live/review của Meta.

Không dán Facebook **App Secret** vào `.env.local`. App Secret chỉ dùng để cấu hình provider bên Firebase/Meta.

## 8. Xác minh email và quên mật khẩu trên app

Đăng ký email dùng Firebase JS SDK, gửi thư xác minh chuẩn. Mở liên kết thư trong trình duyệt, quay lại app → **Đã xác minh — kiểm tra lại**. Bản này dùng trang xử lý email mặc định của Firebase, không phụ thuộc Firebase Dynamic Links. Chưa cấu hình App Links để liên kết thư tự mở trực tiếp vào app.

## 9. Tạo APK

Android Studio → **Build → Generate App Bundles or APKs → Generate APKs** (tên menu có thể là Build APK(s) ở phiên bản khác).

APK debug thường tại:

```text
client/android/app/build/outputs/apk/debug/app-debug.apk
```

Release: **Build → Generate Signed App Bundle or APK → APK**, tạo/chọn keystore và build Release. Lưu keystore để dùng cho các bản cập nhật tiếp theo.

## 10. Mỗi lần sửa web

```powershell
npm run android:sync
```

Run/build APK lại. Mỗi lần đổi IP/domain API cũng phải sync/build lại. Build Docker web không tự cập nhật APK.

## Lỗi thường gặp

| Triệu chứng | Xử lý |
|---|---|
| ERR_CLEARTEXT_NOT_PERMITTED | `CAP_ANDROID_ALLOW_HTTP=true` cho LAN rồi sync; release chuyển HTTPS |
| Không kết nối backend | Kiểm tra `10.0.2.2`/IP LAN, port 3001, firewall, backend health |
| Android Firebase crash lúc khởi động | Đặt JSON đúng project/package vào `client/android/app`, sync/run lại |
| Google error 10 / developer error | SHA-1 sai/thiếu, package mismatch, JSON cũ, Google provider chưa bật |
| Facebook provider not initialized | Điền hai biến Facebook và `VITE_NATIVE_FACEBOOK_ENABLED`, sync/Gradle sync |
| Unsupported class file / Gradle JDK | Dùng JDK 21 và Android Studio tương thích Capacitor 8 |
| Thay code mà app vẫn cũ | Chạy `android:sync` rồi cài lại APK |
| Cùng tài khoản vào phòng ở máy thứ hai bị chặn | Thoát phòng máy thứ nhất hoặc dùng UID khác để thử multiplayer |

## Nguồn để đối chiếu cấu hình native

https://capacitorjs.com/docs/updating/8-0

https://capawesome.io/docs/sdks/capacitor/firebase/authentication/

https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-google.md

https://github.com/capawesome-team/capacitor-firebase/blob/main/packages/authentication/docs/setup-facebook.md
