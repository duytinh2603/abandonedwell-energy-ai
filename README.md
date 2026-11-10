# AbandonedWell Energy AI

**VI** · Web sàng lọc các giếng dầu khí đã hoặc sắp ngừng khai thác để tìm giếng có thể cải tạo thành giếng khai thác địa nhiệt (giếng trao đổi nhiệt đồng trục kín).
**EN** · A web tool that screens shut-in or end-of-life oil & gas wells for repurposing as closed-loop coaxial geothermal wells.

Giao diện song ngữ Việt / Anh (nút VI | EN, hoặc thêm `?lang=en` vào URL). Toàn bộ tính toán chạy trên trình duyệt, dữ liệu giếng không gửi đi đâu.

## Chức năng / Features

| Mô-đun | Nội dung |
|---|---|
| 1. Chuẩn hóa dữ liệu | Nhập bảng giếng trực tiếp hoặc tải CSV; hiệu chỉnh BHT bằng phương pháp Horner (2 lần đo) hoặc công thức thực nghiệm Harrison (1 lần đo); suy ra gradient địa nhiệt |
| 2. Mô hình nhiệt độ | Nhiệt độ đá theo chiều sâu; khoảng công suất P10–P90 bằng Monte Carlo (độ bất định G và k) |
| 3. Mô phỏng thu hồi nhiệt | Port nguyên mẫu Python v0.1: mô hình Ramey (1962), tích phân Euler dọc vành xuyến, tổn thất ống đi lên |
| 4. Kinh tế & rủi ro | CAPEX, O&M, điện bơm, NPV, LCOH, hoàn vốn; điểm tổng hợp theo công suất, toàn vẹn giếng, khoảng cách tới hộ tiêu thụ, NPV |

Đầu ra: bảng xếp hạng, gợi ý mục đích sử dụng theo nhiệt độ nước ra, báo cáo từng giếng (in / lưu PDF), xuất CSV, bản đồ độ nhạy chiều sâu × gradient, Bảng 4.1 tính trực tiếp.

Kết quả của mô hình JS trùng với hồ sơ: giếng 4.000 m, G = 3,3 °C/100 m, 5 kg/s, 10 năm → 51,0 °C, 440 kWth.

## Định dạng CSV

```
id,name,location,depth_m,gradient_c100m,bht_c,bht1_c,dt1_h,bht2_c,dt2_h,tc_h,integrity,distance_km
A-01,Giếng A-01,offshore,4200,3.4,,,,,,,good,0.5
D-01,Giếng D-01,onshore,3200,,,112,6,121,12,4,good,4
D-02,Giếng D-02,onshore,2800,,105,,,,,,fair,8
```

- `location`: `onshore` | `offshore` · `integrity`: `good` | `fair` | `poor`
- Gradient được lấy theo thứ tự ưu tiên: Horner (`bht1_c, dt1_h, bht2_c, dt2_h, tc_h`) → BHT đơn (`bht_c`) → `gradient_c100m`.

## Chạy cục bộ / Run locally

```bash
python -m http.server 8000
```

Mở http://localhost:8000. Không cần build; chỉ dùng HTML/CSS/JS thuần và Chart.js (CDN).

## Lưu ý

Mô hình v0.1 còn đơn giản (gradient tuyến tính, đá đồng nhất, tổn thất ống đi lên cố định) và chưa kiểm chứng với số đo thực. Dữ liệu minh họa là giếng giả lập. Chi phí cải tạo mặc định là giả định. Chỉ dùng để sàng lọc, không dùng để ra quyết định đầu tư.

---
Khoa Dầu khí – Trường Đại học Dầu khí Việt Nam · 2026
