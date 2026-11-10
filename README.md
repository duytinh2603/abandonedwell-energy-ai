# AbandonedWell Energy AI

**VI** · Ứng dụng web xử lý dự án sàng lọc giếng dầu khí ngừng khai thác để cải tạo thành giếng địa nhiệt (giếng trao đổi nhiệt đồng trục kín).
**EN** · Web workstation for screening shut-in / end-of-life oil & gas wells for closed-loop geothermal repurposing.

🔗 https://duytinh2603.github.io/abandonedwell-energy-ai/ (thêm `?lang=en` cho tiếng Anh)

## Giao diện

- **Ribbon**: Trang chủ · Dữ liệu · Địa nhiệt · Biểu đồ · Trợ giúp
- **Trình duyệt dự án**: cây Dự án → Giếng → Đường cong (Tên / Họ / Đơn vị), lọc theo họ đường cong, tìm kiếm
- **Thuộc tính**: sửa thông số dự án (kỹ thuật, kinh tế, trọng số), thuộc tính giếng và đường cong
- **Cửa sổ thông báo**: nhật ký nhập dữ liệu, tính toán
- **Vùng làm việc** dạng tab: Xếp hạng giếng, Biểu đồ log, Báo cáo giếng (in/PDF), Độ nhạy

## Dữ liệu

- **Dự án** lưu trong trình duyệt (IndexedDB); có thể lưu/mở tệp `.awproj.json` để sao lưu.
- **LAS 2.0 / 1.2**: chọn nhiều tệp một lúc; đường cong đầu là độ sâu (ft → m tự động); nhận dạng họ đường cong (GR, RHOB, NPHI, DT, RT, TEMP…); đổi giá trị Null; xuất lại LAS.
  - Log nhiệt độ → gradient bằng hồi quy tuyến tính (°F → °C).
  - BHT trong `~Parameter` → hiệu chỉnh Harrison (1983).
- **CSV danh sách giếng**: `id,name,location,depth_m,gradient_c100m,bht_c,bht1_c,dt1_h,bht2_c,dt2_h,tc_h,integrity,distance_km`

## Tính năng v0.4

- **Học máy (Địa nhiệt → Mô hình học máy):** hồi quy ridge có ràng buộc vật lý dự đoán gradient từ chiều sâu và log (GR, DT, RHOB, NPHI); kiểm chứng bỏ từng giếng, so với gradient trung bình; P10–P90 bằng bootstrap; điền gradient cho giếng chưa có số đo.
- **Khảo sát độ lệch giếng** (độ cong tối thiểu) → tách TVD (nhiệt độ) và MD (chiều dài trao đổi nhiệt).
- **Nhập DST (CSV)**: `well,tvd_m,temp_c,label` (hoặc `md_m`), gradient tính lại theo số đo.
- **Kinh tế:** công suất bơm theo thủy lực, giá trị hoãn hủy giếng (P&A), tín chỉ CO₂, NPV P10–P90 và xác suất NPV > 0, giá trị điện trên giàn.
- **Phương án sử dụng:** nguồn nước khai thác kèm (không tốn vốn giếng), pinch ORC, chỉ số khai thác PI, khoảng cách giếng và thời gian nước lạnh tới, vùng nước lạnh quét qua, cảnh báo CO₂, tổng hợp theo mỏ.
- **Hoàn tác** (Ctrl+Z), **dùng ngoại tuyến** (service worker, Chart.js lưu trong repo), **kiểm thử tự động** tại `tests.html` (24 kiểm tra).

## Mô hình

Port nguyên mẫu Python v0.1: Ramey (1962), tích phân Euler dọc vành xuyến, tổn thất ống đi lên; Monte Carlo P10–P90; NPV, LCOH; điểm tổng hợp. Kết quả khớp hồ sơ (giếng 4.000 m, G = 3,3 °C/100 m, 5 kg/s, 10 năm → 51,0 °C, 440 kWth).

Mô hình chưa kiểm chứng với số đo thực; dữ liệu mẫu là giếng giả lập; chi phí cải tạo mặc định là giả định. Chỉ dùng để sàng lọc.

## Chạy cục bộ

```bash
python -m http.server 8000
```

---
Khoa Dầu khí – Trường Đại học Dầu khí Việt Nam · 2026
