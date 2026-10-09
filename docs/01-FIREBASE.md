# 01 — Firebase: Email, Google, Facebook, xác minh

Làm sau khi web chơi khách đã chạy. Firebase chỉ quản lý danh tính. SQLite ở backend quản lý điểm và skin. Web và Android phải dùng **cùng Firebase project** và **cùng backend**.

## 1. Tạo project và lấy cấu hình web

1. Mở https://console.firebase.google.com/ → **Add project / Create a project**.
2. Đặt tên, ví dụ `snake-arena`; có thể bỏ Google Analytics cho bản đồ án.
3. Vào **Project settings** (bánh răng) → **General** → **Your apps** → biểu tượng **Web `</>`**.
4. Đặt nickname `snake-web` → Register app. Không cần bật Firebase Hosting để chạy Docker.
5. Trong đoạn `firebaseConfig`, lấy `apiKey`, `authDomain`, `projectId`, `appId`.
6. Mở `.env` ở thư mục gốc và điền:

```dotenv
FIREBASE_PROJECT_ID=project-id-cua-ban
VITE_FIREBASE_API_KEY=apiKey-trong-firebaseConfig
VITE_FIREBASE_AUTH_DOMAIN=project-id-cua-ban.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=project-id-cua-ban
VITE_FIREBASE_APP_ID=appId-trong-firebaseConfig
REQUIRE_VERIFIED_EMAIL=true
```

`VITE_FIREBASE_APP_ID` là app ID của **Web app**, không phải package Android. Khi dùng Vite/Capacitor, copy bốn dòng `VITE_FIREBASE_*` vào `client/.env.local` nữa. Bốn giá trị này cấu hình client, không phải private key.

## 2. Cấp thông tin xác thực cho backend

1. Project settings → **Service accounts** → **Firebase Admin SDK**.
2. Chọn **Generate new private key**, tải JSON.
3. Đặt file vào `secrets/firebase-admin.json` trong thư mục dự án. Thư mục `secrets` đã có trong ZIP.
4. Thêm dòng sau vào `.env` gốc:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-admin.json
```

Docker đã mount `./secrets` vào `/run/secrets` chỉ đọc. Backend dùng Firebase Admin để xác minh ID token thật; không tin UID do client gửi.

Nếu chạy backend trực tiếp bằng npm trên Windows, đổi dòng đó thành đường dẫn tuyệt đối của máy bạn, ví dụ:

```dotenv
GOOGLE_APPLICATION_CREDENTIALS=D:/Projects/snake-arena/secrets/firebase-admin.json
```

Không đưa JSON này vào `client/public`, APK, GitHub hay chia sẻ cho người khác. Nếu cần đổi giữa Docker/npm, sửa đường dẫn tương ứng rồi khởi động lại backend.

## 3. Bật Email/Password và Google

1. Firebase → **Build → Authentication → Get started**.
2. **Sign-in method** → Email/Password → bật mục Email/Password → Save. Không cần bật passwordless email link.
3. Sign-in method → Google → Enable → chọn support email → Save.
4. Authentication → **Settings → Authorized domains** → thêm `localhost` nếu chưa có. Thêm domain web thật khi triển khai; domain không bao gồm `http://`, đường dẫn hoặc cổng.
5. Authentication → **Templates** → có thể sửa tên app trong thư xác minh/password reset.

Build lại:

```powershell
docker compose up -d --build
```

Thử đăng ký email thật. Mở thư → bấm liên kết xác minh. Trở lại game → Đăng nhập → **Đã xác minh — kiểm tra lại**. Backend từ chối tài khoản đăng nhập bằng mật khẩu nếu chưa xác minh. Nếu thư ở Spam, đánh dấu không phải spam.

Thử Google trong trình duyệt có popup được cho phép. Bạn không cần đăng ký mật khẩu trước khi dùng Google.

## 4. Bật Facebook trên web

1. Tạo app tại https://developers.facebook.com/apps/ với use case hỗ trợ **Facebook Login**. Tên menu có thể khác theo loại Meta app.
2. Lấy **App ID** và **App Secret** trong Settings của Meta app.
3. Firebase Authentication → Sign-in method → Facebook → bật, nhập App ID/App Secret → Save.
4. Firebase hiển thị OAuth redirect URI, dạng `https://PROJECT.firebaseapp.com/__/auth/handler`.
5. Dán URI đó vào **Valid OAuth Redirect URIs** của Facebook Login trong Meta app. Bật client/web OAuth login theo cấu hình Meta yêu cầu.
6. Ở chế độ Development của Meta, thử bằng tài khoản có vai trò Admin/Developer/Tester đã chấp nhận lời mời. Cho người dùng phổ thông đăng nhập có thể cần đưa app Live và hoàn tất các yêu cầu/review Meta hiển thị.
7. Thử nút Facebook trên web trước.

App Secret chỉ nằm ở Firebase/Meta, **không đưa vào biến `VITE_*`**. Android dùng **Client Token**, là giá trị khác App Secret, ở bước Android.

## 5. Liên kết tài khoản để giữ chung điểm

Vào **Hồ sơ → Liên kết Google / Liên kết Facebook** khi đang đăng nhập tài khoản muốn giữ. Email trùng không đồng nghĩa được tự ghép UID. Nếu báo `account-exists-with-different-credential`, đăng nhập bằng phương thức cũ rồi liên kết phương thức mới trong Hồ sơ.

Nếu hai tài khoản đã được tạo riêng với hai UID, bản này không tự gộp điểm giữa chúng. Chọn tài khoản chính và liên kết các phương thức chưa thuộc tài khoản khác.

## 6. Kiểm tra đồng bộ

1. Đăng nhập cùng tài khoản trên web, chơi rồi thoát phòng.
2. Đăng nhập cùng tài khoản trên app, kiểm tra điểm cao nhất và skin.
3. Khi muốn chơi web cùng app đồng thời, dùng hai tài khoản khác nhau.

## Lỗi thường gặp

| Lỗi | Cách xử lý |
|---|---|
| Backend chưa cấu hình Firebase | Điền `FIREBASE_PROJECT_ID` ở `.env` gốc, mount JSON, rebuild/restart backend |
| Could not load default credentials | Kiểm tra tên JSON và `GOOGLE_APPLICATION_CREDENTIALS` bên trong Docker |
| auth/unauthorized-domain | Thêm domain trong Authorized domains |
| auth/operation-not-allowed | Bật provider ở Sign-in method |
| auth/invalid-credential | Kiểm tra email/mật khẩu hoặc cấu hình provider |
| Facebook chỉ Admin đăng nhập được | App còn Development hoặc thiếu quyền/review cần thiết |
| Giao diện vẫn báo chưa cấu hình | `VITE_*` được đọc lúc build, cần `docker compose up -d --build` |

## Nguồn

https://firebase.google.com/docs/auth/web/start

https://firebase.google.com/docs/auth/web/manage-users

https://firebase.google.com/docs/auth/web/facebook-login

https://firebase.google.com/docs/auth/web/account-linking

https://firebase.google.com/docs/auth/admin/verify-id-tokens
