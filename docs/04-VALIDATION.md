# Kiểm tra bản v1

Kiểm tra ngày 08/10/2026.

- `npm run build`: TypeScript và Vite production build thành công.
- `npm test`: 5 bài test thành công, gồm gameplay và integration với socket thật. Integration có 10 client, từ chối client 11, thay bot, reconnect và SQLite persistence.
- Trình duyệt headless: menu desktop 1440×900; game desktop và cảm ứng 844×390 cùng phòng 2 người + 8 AI; joystick hiện; menu 360×800 không tràn ngang; đổi skin, đổi bàn phím, vào/rời phòng; không có lỗi JavaScript ghi nhận. Cảm ứng mô phỏng không thay thế thử APK trên thiết bị thật.
- `npm run android:add` và `npm run android:sync`: tạo project và sync assets/plugins thành công ở chế độ khách.
- Hai MP3 giải mã được bằng ffprobe: nhạc menu khoảng 27,45 giây; nhạc trận khoảng 5,04 giây; cả hai đặt loop.
- Cú pháp YAML của hai compose files đọc được. Chưa build/run container Docker vì môi trường tạo source không có Docker daemon.
- Chưa build APK/Gradle, chưa thử Google/Facebook/email thật vì chưa có Firebase/Meta project và Android SDK/thiết bị của bạn. Không cam kết 60 FPS trên điện thoại từ kết quả headless.
- Chưa triển khai VPS/domain/HTTPS thực.

Ảnh preview nằm trong thư mục docs.
