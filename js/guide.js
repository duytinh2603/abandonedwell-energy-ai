/* User guide shown under Help → User Guide (Vietnamese / English) */
window.GUIDE = {
  vi: `
<h2>Hướng dẫn sử dụng AbandonedWell Energy AI</h2>
<p class="muted">Phiên bản web v0.6 · Công cụ sàng lọc giếng dầu khí ngừng khai thác để cải tạo thành giếng địa nhiệt.</p>
<nav class="toc"><b>Mục lục</b><ol>
<li><a href="#g1">Giao diện</a></li><li><a href="#g2">Tạo và quản lý dự án</a></li><li><a href="#g3">Nhập dữ liệu (LAS, CSV, nhập tay)</a></li>
<li><a href="#g4">Thuộc tính giếng và nguồn gradient</a></li><li><a href="#g4b">Học máy – mô hình nhiệt độ</a></li><li><a href="#g5">Biểu đồ log</a></li><li><a href="#g6">Sàng lọc và xếp hạng</a></li>
<li><a href="#g7">Báo cáo giếng</a></li><li><a href="#g8">Phương án sử dụng (ORC, nhiệt trực tiếp, vỉa chứa)</a></li><li><a href="#g9">Độ nhạy</a></li>
<li><a href="#g10">Thông số dự án</a></li><li><a href="#g11">Bảo mật dữ liệu</a></li><li><a href="#g12">Xử lý sự cố</a></li><li><a href="#g13">Giới hạn của mô hình</a></li><li><a href="#g14">Dự án mẫu mỏ Volve (dữ liệu thật)</a></li><li><a href="#g15">So sánh công nghệ địa nhiệt</a></li><li><a href="#g16">Cập nhật và đồng bộ tự động</a></li></ol></nav>

<h3 id="g1">1. Giao diện</h3>
<ul>
<li><b>Thanh ribbon</b> (trên cùng): 5 tab Trang chủ · Dữ liệu · Địa nhiệt · Biểu đồ · Trợ giúp. Nút mờ là nút chưa dùng được (chưa mở dự án hoặc chưa chọn giếng). Nút VI | EN đổi ngôn ngữ.</li>
<li><b>Trình duyệt dự án</b> (trái trên): cây Dự án → Giếng → Đường cong, có cột Họ (family) và Đơn vị. Nhấp để chọn, nhấp đúp vào giếng để mở biểu đồ log. Thanh công cụ nhỏ: nhập LAS, thêm giếng, thu gọn/mở rộng, xóa, lọc theo họ đường cong, tìm theo tên.</li>
<li><b>Thuộc tính</b> (trái giữa): xem và sửa thông số của mục đang chọn (dự án, giếng hoặc đường cong).</li>
<li><b>Cửa sổ thông báo</b> (trái dưới): nhật ký nhập dữ liệu, cảnh báo và kết quả chạy; có ô tìm theo nội dung.</li>
<li><b>Vùng làm việc</b> (giữa): các tab tài liệu (Xếp hạng, Log, Báo cáo, Phương án, Độ nhạy…). Kéo đường viền giữa các khung để đổi kích thước; đóng/mở khung ở Trang chủ → Hiển thị.</li>
</ul>

<h3 id="g2">2. Tạo và quản lý dự án</h3>
<ol>
<li><b>Trang chủ → Dự án mới</b>, đặt tên, bấm Tạo.</li>
<li><b>Mở dự án</b>: danh sách dự án đã lưu trên trình duyệt này; có nút Xóa (xóa vĩnh viễn).</li>
<li><b>Lưu tệp dự án</b>: xuất toàn bộ dự án (kể cả log) ra tệp <code>.awproj.json</code> để sao lưu hoặc chuyển máy. <b>Mở tệp dự án</b> để nạp lại.</li>
<li><b>Trợ giúp → Dự án mẫu</b>: 8 giếng giả lập để thử nhanh mọi chức năng.</li>
</ol>
<p class="note">Dự án tự lưu sau mỗi thay đổi. Dự án chỉ có trên trình duyệt và máy đang dùng; đổi máy/trình duyệt thì dùng tệp <code>.awproj.json</code>.</p>

<h3 id="g3">3. Nhập dữ liệu</h3>
<h4>Tệp LAS (Dữ liệu → Nhập LAS)</h4>
<ul>
<li>Đọc LAS 2.0 và 1.2, kể cả WRAP YES; chọn nhiều tệp cùng lúc.</li>
<li>Đường cong đầu tiên là độ sâu; đơn vị ft được đổi sang m. Giá trị NULL trong ~Well được coi là thiếu.</li>
<li>Tự nhận họ đường cong: GR, RHOB, NPHI, DT, RT/LLD, CALI, SP, PEF, TEMP/MTEM…</li>
<li>Tệp có tên giếng (WELL) trùng với giếng đã nhập tay sẽ <b>gắn vào giếng đó</b> (không phân biệt dấu, gạch nối, tiền tố lô: “04-3-AB-1X” ≈ “AB-1X”). Tệp cùng giếng, cùng dãy độ sâu sẽ được gộp đường cong.</li>
<li>Có log nhiệt độ → tính gradient bằng hồi quy. Nếu gradient &lt; 2,2 °C/100 m web cảnh báo vì thường là nhiệt độ dung dịch chưa cân bằng. Giếng đã có gradient từ thử vỉa thì <b>không bị ghi đè</b>.</li>
<li>Có BHT/MRT trong ~Parameter → điền vào ô BHT (°F đổi sang °C).</li>
<li>Chiều sâu giếng đã nhập (thường là TVD từ báo cáo) không bị thay bằng đáy log.</li>
</ul>
<h4>CSV danh sách giếng (Dữ liệu → Nhập CSV)</h4>
<p>Cột: <code>id,name,location,depth_m,gradient_c100m,bht_c,bht1_c,dt1_h,bht2_c,dt2_h,tc_h,integrity,distance_km</code> · location: onshore | offshore · integrity: good | fair | poor. Tải mẫu ở Trợ giúp → Định dạng dữ liệu.</p>
<h4>Khảo sát độ lệch giếng (Dữ liệu → Nhập độ lệch giếng)</h4>
<p>Chọn giếng trước, rồi chọn tệp văn bản 3 cột <b>MD, góc nghiêng, phương vị</b> (cách nhau bởi khoảng trắng, tab hoặc dấu phẩy). Web tính TVD bằng phương pháp độ cong tối thiểu, điền MD/TVD nếu còn trống; nếu đã có TVD từ báo cáo thì giữ nguyên và báo chênh lệch.</p>
<h4>Số liệu nhiệt độ thử vỉa (Dữ liệu → Nhập DST)</h4>
<p>CSV có cột <code>well,tvd_m,temp_c,label</code> (hoặc <code>md_m</code> thay cho <code>tvd_m</code> – web đổi sang TVD theo khảo sát độ lệch). Web tìm giếng theo tên, thêm điểm đo và tính lại gradient theo DST.</p>
<h4>Nhập tay</h4>
<p>Trang chủ → Giếng mới, rồi điền ở khung Thuộc tính. <b>Hoàn tác</b> (Trang chủ, hoặc Ctrl+Z) quay lại thay đổi gần nhất, tối đa 30 bước.</p>
<h4>Công cụ</h4>
<p><b>Đổi giá trị Null</b>: coi một giá trị (vd −999,25) là thiếu trên mọi đường cong của giếng. <b>Xuất LAS/CSV</b>: lưu lại dữ liệu đã chỉnh. <b>Xóa mục chọn</b>: xóa giếng hoặc đường cong.</p>

<h3 id="g4">4. Thuộc tính giếng và nguồn gradient</h3>
<table class="tbl"><tr><th>Nhóm</th><th>Ô</th><th>Ghi chú</th></tr>
<tr><td>Chung</td><td>Mã, tên, mỏ, vị trí, chiều sâu (m)</td><td>Nên nhập <b>chiều sâu thẳng đứng TVD</b> (nhiệt độ phụ thuộc TVD).</td></tr>
<tr><td>Dữ liệu nhiệt</td><td>Gradient, BHT, Horner (BHT1, Δt1, BHT2, Δt2, tc)</td><td>Ưu tiên: <b>Horner &gt; BHT &gt; Gradient</b>. Muốn dùng gradient (vd từ DST) thì để trống ô BHT và Horner.</td></tr>
<tr><td>Tình trạng</td><td>Toàn vẹn ống chống/xi măng; khoảng cách hộ tiêu thụ</td><td>Ảnh hưởng điểm xếp hạng.</td></tr>
<tr><td>Vỉa chứa – vòng hở</td><td>Diện tích, chiều dày hiệu dụng, độ rỗng, độ sâu vỉa, nhiệt độ vỉa, lưu lượng</td><td>Cần cho phương án khai thác chất lưu vỉa (mục 8).</td></tr></table>
<ul>
<li><b>Horner</b>: hai lần đo BHT ở cùng độ sâu, Δt = giờ từ lúc ngừng tuần hoàn đến lúc đo, tc = giờ tuần hoàn trước đó → nhiệt độ vỉa tĩnh. Thiếu một ô thì Horner bị bỏ qua.</li>
<li><b>BHT đơn</b>: hiệu chỉnh thực nghiệm Harrison (1983), sai số ±10–15 °C.</li>
<li>BHT/Horner nhỏ hơn T₀ + 5 °C (vd ô BHT = 0) bị bỏ qua kèm cảnh báo vàng ở bảng xếp hạng.</li>
<li>Nguồn gradient hiển thị ở cột “Nguồn G”: Thử vỉa (DST) · Horner · BHT hiệu chỉnh · Log nhiệt độ · Gradient chung của mỏ · Nhập tay.</li>
</ul>

<h3 id="g4b">4b. Học máy – mô hình nhiệt độ</h3>
<p><b>Chạy học máy (Trang chủ hoặc Địa nhiệt)</b>. Mô hình hồi quy ridge có ràng buộc vật lý dự đoán <b>gradient biểu kiến</b> từ chiều sâu và giá trị trung bình của log GR, DT, RHOB, NPHI phía trên mỗi điểm, nên nhiệt độ luôn tăng theo chiều sâu.</p>
<ul>
<li><b>Dữ liệu huấn luyện:</b> mọi nhiệt độ đo trong dự án – điểm DST, nhiệt độ vỉa tĩnh Horner, BHT đã hiệu chỉnh. Cần ít nhất 6 điểm ở 2 giếng.</li>
<li><b>Kiểm chứng:</b> bỏ ra từng giếng, huấn luyện trên các giếng còn lại rồi dự đoán giếng đó; so với cách dùng một gradient trung bình cho cả mỏ. Web nói rõ học máy tốt hơn hay chưa.</li>
<li><b>Khoảng tin cậy P10–P90</b> từ 60 mô hình huấn luyện trên mẫu lấy lại (bootstrap) cộng sai số còn lại.</li>
<li><b>Áp dụng cho giếng chưa có số đo</b>: chỉ điền gradient cho giếng đang dùng gradient chung của mỏ hoặc chưa có gradient; giếng có số đo hay gradient nhập tay được giữ nguyên. Nguồn G hiện “Học máy (ML)”.</li>
</ul>

<h3 id="g5">5. Biểu đồ log</h3>
<p>Nhấp đúp vào giếng (hoặc Biểu đồ → Biểu đồ log). Tích chọn đường cong hiển thị; nhập Đỉnh/Đáy hoặc <b>lăn chuột để phóng to</b> quanh con trỏ; “Toàn bộ” để trở về. Rê chuột để đọc giá trị mọi đường cong tại một độ sâu. Thang đo chuẩn: GR 0–150, RHOB 1,95–2,95, NPHI 0,45→−0,15, DT 140→40, điện trở logarit 0,2–2000.</p>

<h3 id="g6">6. Sàng lọc và xếp hạng</h3>
<p><b>Địa nhiệt → Chạy sàng lọc</b>. Bảng xếp hạng cho từng giếng: chiều sâu, gradient và nguồn, T đáy, T nước ra, công suất Q (kWth) và khoảng P10–P90, toàn vẹn, NPV, gợi ý sử dụng, điểm.</p>
<ul>
<li>Mô hình: giếng trao đổi nhiệt đồng trục kín, truyền nhiệt Ramey (1962); khoảng P10–P90 bằng Monte Carlo theo độ bất định gradient σ và độ dẫn nhiệt k ± 0,5.</li>
<li><b>Điểm</b> = trọng số × (công suất so với giếng tốt nhất, toàn vẹn, khoảng cách, NPV); giếng đạt ngưỡng có viền xanh. Trọng số và ngưỡng ở Thuộc tính dự án.</li>
<li>Nhấp chọn giếng; nhấp đúp để mở báo cáo. <b>Xuất xếp hạng</b> ra CSV.</li>
</ul>

<h3 id="g7">7. Báo cáo giếng</h3>
<p>Gồm: điểm, Q, T nước ra, NPV, khuyến nghị; bảng tóm tắt (nguồn gradient, T đáy, vốn, LCOH, hoàn vốn); biểu đồ nhiệt độ – chiều sâu (đá, nước, điểm DST/log đo), nhiệt độ ra & công suất theo lưu lượng, công suất theo năm & dòng tiền tích lũy. Nút <b>In / lưu PDF</b> chỉ in phần báo cáo.</p>

<h3 id="g8">8. Phương án sử dụng</h3>
<p><b>Địa nhiệt → Phương án tối ưu</b> (giếng đang chọn) hoặc <b>So sánh các giếng</b>. Web so sánh, với lưu lượng tối ưu theo NPV:</p>
<ul>
<li><b>Nhiệt trực tiếp – thay bơm nhiệt</b> (mọi mức nhiệt) và <b>sấy, công nghiệp</b> (cần nước ≥ T sấy, mặc định 60 °C).</li>
<li><b>Phát điện ORC/Kalina</b> theo từng chất công tác: R134a, R1233zd(E), R245fa, isobutane, isopentane, n-pentane, Kalina, ethanol. Hiệu suất = hệ số exergy × Carnot; bảng nêu lý do không khả thi (nguồn quá nguội, ngưng chân không…) và cảnh báo an toàn (dễ cháy, độc, GWP).</li>
<li><b>Bậc thang</b>: ORC trước, nước sau ORC dùng tiếp cho sấy/sưởi.</li>
<li>Ba nguồn: <b>vòng kín</b> (giếng đồng trục), <b>vòng hở</b> (khai thác chất lưu vỉa rồi bơm ép) và <b>nước khai thác kèm</b> ở giàn đang hoạt động (nhóm “Nước khai thác kèm” trong Thuộc tính giếng: lưu lượng và nhiệt độ; không tính vốn cải tạo giếng).</li>
<li>Giếng ngoài khơi tính điện theo <b>giá trị điện trên giàn</b> (thay điện tuabin khí/diesel), đặt riêng trong thông số dự án.</li>
</ul>
<h4>Vỉa chứa – khai thác vòng hở</h4>
<p>Nhập ở Thuộc tính giếng: diện tích (km²), chiều dày hiệu dụng (m), độ rỗng (%), độ sâu vỉa TVDss, nhiệt độ vỉa (để trống = theo gradient), lưu lượng (kg/s = m³/ngđ ÷ 86,4). Web tính nhiệt tại chỗ theo phương pháp thể tích, nhiệt thu hồi (Rf), <b>công suất vỉa duy trì được</b> trong vòng đời, so với công suất theo lưu lượng giếng → yếu tố giới hạn, <b>diện tích vỉa tối thiểu</b>, thời gian tới khi vỉa nguội; biểu đồ công suất theo diện tích.</p>
<p>Thêm cho vỉa: <b>chỉ số khai thác PI</b> (m³/ngđ/bar) × độ hạ áp cho phép giới hạn lưu lượng; <b>khoảng cách giếng khai thác – bơm ép</b> cho thời gian nước lạnh tới; <b>hàm lượng CO₂</b> trên 10% hiện cảnh báo ăn mòn, đóng cặn. Web luôn hiện bán kính vùng nước lạnh sau vòng đời và khoảng cách giếng đề xuất; bật “Rf theo vùng nước lạnh quét qua” để thay Rf cố định bằng tính toán này.</p>
<p class="note">Vòng kín chỉ làm nguội đá trong bán kính khoảng 50–60 m sau 25 năm, nên diện tích vỉa hầu như không ảnh hưởng. Với vòng hở, vùng nước lạnh quanh giếng bơm ép có bán kính r ≈ √(Q·t·ρc<sub>nước</sub> / (π·h·ρc<sub>đá+nước</sub>)); hai giếng nên cách nhau ≈ √3·r.</p>

<h3 id="g9">9. Độ nhạy</h3>
<p>Bản đồ công suất theo chiều sâu × gradient, Bảng 4.1 tính lại theo thông số hiện tại, và biểu đồ nhiệt độ ra/công suất theo lưu lượng.</p>

<h3 id="g10">10. Thông số dự án</h3>
<p>Chọn dòng dự án trong cây (hoặc Địa nhiệt → Thông số):</p>
<ul>
<li><b>Kỹ thuật</b>: lưu lượng tuần hoàn, nhiệt độ nước vào, thời gian vận hành, T₀ bề mặt, độ dẫn nhiệt đá, nhiệt trở thành giếng, tổn thất ống đi lên, độ bất định gradient.</li>
<li><b>Kinh tế</b>: giá trị nhiệt thay thế, vốn cải tạo đất liền/ngoài khơi, đường ống, vận hành – bảo dưỡng, công suất bơm, giờ vận hành, lãi suất, vòng đời.</li>
<li><b>Trọng số xếp hạng</b> và ngưỡng đạt.</li>
<li><b>Phương án sử dụng</b>: nhiệt độ làm mát, chênh nhiệt bình ngưng, T sấy, giá trị điện và nhiệt, vốn ORC (triệu đ/kWe), vốn trao đổi nhiệt, vốn vòng hở, tổn thất lên miệng giếng, T bơm ép, Rf, Rf theo vùng quét, giá trị điện trên giàn, pinch ORC, độ hạ áp cho phép.</li>
<li><b>Thủy lực</b>: bật “Tính bơm theo thủy lực” để công suất bơm tính theo ma sát trong vành xuyến và ống trong (đường kính ống chống, ống trong); tắt thì dùng công suất bơm cố định.</li>
<li><b>Kinh tế mở rộng</b>: chi phí hủy giếng P&amp;A và số năm hoãn (giá trị hoãn cộng vào NPV), hệ số phát thải nhiệt thay thế và giá tín chỉ CO₂. Báo cáo giếng hiện <b>NPV P10–P90</b> và xác suất NPV &gt; 0 khi vốn, giá nhiệt và công suất bất định.</li>
<li><b>So sánh các giếng</b> có thêm bảng tổng hợp theo mỏ (cụm giếng).</li>
</ul>
<p class="note">Các giá trị mặc định về chi phí là giả định để minh họa; hãy thay bằng số liệu thực của dự án.</p>

<h3 id="g11">11. Bảo mật dữ liệu</h3>
<ul>
<li>Mọi tính toán chạy trong trình duyệt; tệp LAS, CSV, dự án <b>không được tải lên máy chủ nào</b>.</li>
<li>Dự án lưu trong IndexedDB của trình duyệt. Xóa dữ liệu trình duyệt sẽ mất dự án → luôn giữ tệp <code>.awproj.json</code>.</li>
<li>Không đưa tệp dự án, LAS hay kết quả có số liệu mỏ lên kho mã công khai.</li>
<li><b>Dùng ngoại tuyến:</b> sau lần mở đầu tiên có mạng, web tự lưu bản chạy trên máy và mở được khi mất mạng.</li>
</ul>

<h3 id="g12">12. Xử lý sự cố</h3>
<table class="tbl"><tr><th>Hiện tượng</th><th>Cách xử lý</th></tr>
<tr><td>T đáy thấp bất thường (vd 19 °C), điểm hoặc Q âm</td><td>Kiểm tra ô BHT/Horner của giếng có số 0 hay số nhỏ; xóa trống. Xem cột “Nguồn G”.</td></tr>
<tr><td>Gradient từ log quá thấp (&lt; 2,2)</td><td>Log là nhiệt độ dung dịch; nhập gradient từ DST hoặc BHT đã hiệu chỉnh.</td></tr>
<tr><td>Tệp LAS báo lỗi</td><td>Xem Cửa sổ thông báo; kiểm tra có ~Curve và ~ASCII, dòng dữ liệu đủ số cột.</td></tr>
<tr><td>Giếng bị “bỏ qua”</td><td>Thiếu chiều sâu hoặc gradient/BHT hợp lệ.</td></tr>
<tr><td>Không thấy dự án cũ</td><td>Đang dùng trình duyệt/máy khác → Mở tệp dự án.</td></tr>
<tr><td>Web không cập nhật bản mới</td><td>Nhấn Ctrl+F5 (có thể hai lần vì bản ngoại tuyến).</td></tr>
<tr><td>Muốn kiểm tra phép tính</td><td>Mở <a href="tests.html" target="_blank">tests.html</a>: 26 kiểm thử tự động so với mô hình Python v0.1 và công thức chuẩn.</td></tr></table>

<h3 id="g13">13. Giới hạn của mô hình</h3>
<p>Gradient tuyến tính, đá đồng nhất, tổn thất ống đi lên cố định; ORC tính theo hệ số exergy; vỉa tính theo phương pháp thể tích. Kết quả dùng để <b>sàng lọc</b>, chưa thay cho thiết kế chi tiết, mô phỏng thủy động hay đánh giá toàn vẹn giếng thực tế. Mô hình học máy chỉ tốt như số điểm đo nhiệt độ có trong dự án. Chưa đọc DLIS/LIS, chưa có bản đồ tọa độ, toàn vẹn giếng vẫn chọn tay, và mô hình chưa được so với số đo sản lượng địa nhiệt thực tế.</p>

<h3 id="g14">14. Dự án mẫu mỏ Volve (dữ liệu thật)</h3>
<p>Volve (Biển Bắc Na Uy, lô 15/9) được Equinor công bố toàn bộ dữ liệu năm 2018 theo Giấy phép dữ liệu mở Equinor. Mỏ đã dừng khai thác năm 2016 nên phù hợp làm ví dụ chuyển giếng sang địa nhiệt. Web có sẵn bản trích gọn tại <code>data/volve.json</code>.</p>
<ol>
<li><b>Trợ giúp → Dữ liệu Volve</b>: xem nguồn và giấy phép, bảng 24 giếng (MD, TVD, KB, số điểm nhiệt độ, gradient, log), biểu đồ nhiệt độ – chiều sâu của toàn bộ điểm đo, bản đồ vùng khảo sát 3D ST10010/ST0202 và vị trí giàn, danh mục 34 khối địa chấn 3D (inline/crossline, miền thời gian/độ sâu, tình trạng) và 33 tuyến 2D ST0299. Có nút tải điểm nhiệt độ dạng CSV DST và danh sách giếng.</li>
<li><b>Trợ giúp → Dự án Volve</b> (hoặc nút trên trang Bắt đầu): tạo dự án gồm các giếng có TVD, kèm khảo sát độ lệch (suy từ cặp MD–TVD), điểm nhiệt độ LWD, log GR/DT/RHOB/NPHI/RT bước 5 m. Thông số được đặt cho Biển Bắc: T0 = 6 °C, nước vào 25 °C, nhiệt độ môi trường 10 °C, mục đích phát điện. Sau đó chạy sàng lọc, mở báo cáo, phương án sử dụng và học máy như dự án thường.</li>
<li>Giếng không có điểm đo nhận gradient chung của mỏ; có thể dùng <b>Chạy học máy (Trang chủ hoặc Địa nhiệt)</b> để dự đoán từ log.</li>
</ol>
<p class="warnbox">Nhiệt độ LWD đo khi dung dịch đang tuần hoàn nên thấp hơn nhiệt độ vỉa tĩnh; gradient Volve trong web (≈ 2,4–3,4 °C/100 m) là cận dưới. Tệp SEG-Y không được nạp vào trình duyệt. Mã trích dữ liệu: <code>tools/build_volve.py</code>.</p>

<h3 id="g15">15. So sánh công nghệ địa nhiệt</h3>
<p><b>Địa nhiệt → So sánh công nghệ</b> đánh giá mỗi giếng với 5 công nghệ. Mỗi công nghệ tự chọn cách dùng lợi nhất (phát điện, nhiệt trực tiếp hoặc đồng phát) và báo cáo lưu lượng, nhiệt độ nguồn, kWth, kWe, vốn, dòng tiền, NPV, LCOE, CO₂ lưu trữ:</p>
<table><tr><th>Công nghệ</th><th>TRL</th><th>Cách tính</th></tr>
<tr><td>CLGS – giếng đồng trục kín</td><td>7</td><td>Mô hình Ramey hiện có, lưu lượng tối ưu.</td></tr>
<tr><td>AGS – vòng kín nhiều nhánh ngang</td><td>6–7</td><td>Nhánh ngang ở nhiệt độ đáy giếng, dẫn nhiệt Ramey; vốn = cải tạo + khoan nhánh.</td></tr>
<tr><td>Hydrothermal – vòng hở</td><td>9</td><td>Lưu lượng DST giới hạn theo PI và trữ nhiệt vỉa (cần thông số vỉa).</td></tr>
<tr><td>EGS – kích thích, nước</td><td>5–7</td><td>Trữ nhiệt trong thể tích đá kích thích × hệ số thu hồi; bơm theo trở kháng; vốn gồm kích thích và giếng bơm ép mới.</td></tr>
<tr><td>CO₂-EGS / CPG</td><td>4–5</td><td>CO₂ siêu tới hạn trên vỉa cạn (hoặc đá kích thích): thu nhiệt gấp 1,5 lần nước, tự tuần hoàn, tuabin CO₂; CO₂ thất thoát vào vỉa tính là lưu trữ (tín chỉ theo “Giá CO₂”).</td></tr></table>
<p>Năng lượng bán được bị giới hạn bởi nhu cầu tại chỗ (mặc định ngoài khơi 1.000 kWth nhiệt, 5.000 kWe điện). Mọi giả định chỉnh trong Thuộc tính dự án → <b>So sánh công nghệ</b>. Nút “Xuất CSV” lưu bảng chi tiết.</p>

<h3 id="g16">16. Cập nhật và đồng bộ tự động</h3>
<ul>
<li><b>Phiên bản web:</b> khi mở trang, khi quay lại tab và mỗi 5 phút, web kiểm tra <code>version.json</code>; nếu có bản mới thì tự lưu dự án, xóa bộ nhớ đệm ngoại tuyến và tải lại. Phiên bản đang chạy hiện ở cuối trang Bắt đầu.</li>
<li><b>Dữ liệu dự án giữa các máy:</b> Trang chủ → <b>Đồng bộ tệp</b> → “Tạo tệp đồng bộ mới” (lưu vào thư mục OneDrive) hoặc “Liên kết với tệp có sẵn”. Mọi thay đổi tự ghi vào tệp; khi mở dự án hoặc quay lại tab, web tự đọc tệp nếu tệp mới hơn. Ở máy khác, mở web → <b>Mở tệp dự án</b> → chọn đúng tệp đó là đồng bộ hai chiều. Trên thanh tiêu đề hiện “⟳ đồng bộ tên-tệp”.</li>
<li>Cần Chrome hoặc Edge trên máy tính. Trình duyệt hỏi quyền ghi tệp mỗi phiên; chọn “Cho phép mỗi lần truy cập” để không phải hỏi lại. Trình duyệt khác: dùng Lưu/Mở tệp dự án.</li>
<li><b>Nhiều tab:</b> sửa ở một tab, các tab khác đang mở cùng dự án tự cập nhật.</li>
<li><b>Dự án Volve:</b> tự làm mới giếng khi dữ liệu Volve trên web được cập nhật, giữ nguyên thông số bạn đã chỉnh.</li>
</ul>
`,
  en: `
<h2>AbandonedWell Energy AI – User Guide</h2>
<p class="muted">Web version v0.6 · Screening tool for repurposing shut-in oil &amp; gas wells as geothermal wells.</p>
<nav class="toc"><b>Contents</b><ol>
<li><a href="#g1">Interface</a></li><li><a href="#g2">Creating and managing projects</a></li><li><a href="#g3">Importing data (LAS, CSV, manual)</a></li>
<li><a href="#g4">Well properties and gradient source</a></li><li><a href="#g4b">Machine learning – temperature model</a></li><li><a href="#g5">Log plot</a></li><li><a href="#g6">Screening and ranking</a></li>
<li><a href="#g7">Well report</a></li><li><a href="#g8">Utilisation options (ORC, direct heat, reservoir)</a></li><li><a href="#g9">Sensitivity</a></li>
<li><a href="#g10">Project parameters</a></li><li><a href="#g11">Data privacy</a></li><li><a href="#g12">Troubleshooting</a></li><li><a href="#g13">Model limitations</a></li><li><a href="#g14">Volve field case study (real data)</a></li><li><a href="#g15">Geothermal technology comparison</a></li><li><a href="#g16">Automatic updates and sync</a></li></ol></nav>

<h3 id="g1">1. Interface</h3>
<ul>
<li><b>Ribbon</b> (top): Home · Data · Geothermal · Plot · Help. Greyed buttons need an open project or a selected well. VI | EN switches language.</li>
<li><b>Project Browser</b> (top left): Project → Wells → Curves tree with Family and Unit. Click to select; double-click a well to open its log plot. Mini toolbar: import LAS, add well, collapse/expand, delete, filter by family, search.</li>
<li><b>Properties Editor</b> (middle left): view and edit the selected project, well or curve.</li>
<li><b>Output Window</b> (bottom left): import log, warnings and run results, with text search.</li>
<li><b>Workspace</b> (centre): document tabs (Ranking, Log, Report, Use options, Sensitivity…). Drag the splitters to resize; show/hide panes under Home → View.</li>
</ul>

<h3 id="g2">2. Creating and managing projects</h3>
<ol>
<li><b>Home → New Project</b>, enter a name, Create.</li>
<li><b>Open Project</b> lists projects saved in this browser; Delete removes one permanently.</li>
<li><b>Save Project File</b> exports everything (including logs) to <code>.awproj.json</code> for backup or another computer; <b>Open Project File</b> loads it back.</li>
<li><b>Help → Demo Project</b>: 8 synthetic wells to try every feature.</li>
</ol>
<p class="note">Projects save automatically, but only in this browser on this computer; use the <code>.awproj.json</code> file to move them.</p>

<h3 id="g3">3. Importing data</h3>
<h4>LAS files (Data → Import LAS)</h4>
<ul>
<li>Reads LAS 2.0 and 1.2 including WRAP YES; select several files at once.</li>
<li>The first curve is depth; ft is converted to m. The ~Well NULL value is treated as missing.</li>
<li>Curve families are recognised: GR, RHOB, NPHI, DT, RT/LLD, CALI, SP, PEF, TEMP/MTEM…</li>
<li>A file whose WELL name matches a hand-entered well is <b>attached to that well</b> (ignoring diacritics, dashes and block prefix: “04-3-AB-1X” ≈ “AB-1X”). Files with the same well and depth index are merged.</li>
<li>A temperature log gives a regression gradient; below 2.2 °C/100 m a warning is shown (likely unequilibrated mud temperature). A well-test gradient is <b>never overwritten</b>.</li>
<li>BHT/MRT in ~Parameter fills the BHT box (°F converted to °C).</li>
<li>A depth already entered (usually TVD from reports) is not replaced by the log bottom.</li>
</ul>
<h4>Well-list CSV (Data → Import CSV)</h4>
<p>Columns: <code>id,name,location,depth_m,gradient_c100m,bht_c,bht1_c,dt1_h,bht2_c,dt2_h,tc_h,integrity,distance_km</code> · location: onshore | offshore · integrity: good | fair | poor. Template under Help → Data Formats.</p>
<h4>Deviation survey (Data → Import Deviation)</h4>
<p>Select the well first, then a text file with three columns <b>MD, inclination, azimuth</b> (space, tab or comma separated). TVD is computed by minimum curvature and MD/TVD are filled when empty; a TVD already entered from reports is kept and the difference reported.</p>
<h4>Well-test temperatures (Data → Import DST)</h4>
<p>CSV with columns <code>well,tvd_m,temp_c,label</code> (or <code>md_m</code> instead of <code>tvd_m</code> – converted to TVD with the survey). Wells are matched by name, points are added and the gradient is refitted to DST.</p>
<h4>Manual entry</h4>
<p>Home → New Well, then fill in the Properties Editor. <b>Undo</b> (Home, or Ctrl+Z) reverts the last change, up to 30 steps.</p>
<h4>Tools</h4>
<p><b>Convert Null Value</b> treats a value (e.g. −999.25) as missing on all curves of the well. <b>Export LAS/CSV</b> saves edited data. <b>Delete Selected</b> removes a well or curve.</p>

<h3 id="g4">4. Well properties and gradient source</h3>
<table class="tbl"><tr><th>Group</th><th>Fields</th><th>Notes</th></tr>
<tr><td>General</td><td>ID, name, field, location, depth (m)</td><td>Enter <b>true vertical depth</b> (temperature depends on TVD).</td></tr>
<tr><td>Thermal data</td><td>Gradient, BHT, Horner (BHT1, Δt1, BHT2, Δt2, tc)</td><td>Priority: <b>Horner &gt; BHT &gt; Gradient</b>. To use a gradient (e.g. from DST) leave BHT and Horner empty.</td></tr>
<tr><td>Condition</td><td>Casing/cement integrity; distance to heat user</td><td>Affect the ranking score.</td></tr>
<tr><td>Reservoir – open loop</td><td>Area, net thickness, porosity, depth, temperature, flow rate</td><td>Needed to assess producing reservoir fluid (section 8).</td></tr></table>
<ul>
<li><b>Horner</b>: two BHT readings at the same depth, Δt = hours since circulation stopped, tc = circulation hours → static formation temperature. If any box is empty Horner is skipped.</li>
<li><b>Single BHT</b>: Harrison (1983) empirical correction, ±10–15 °C.</li>
<li>BHT/Horner values below T₀ + 5 °C (e.g. a BHT of 0) are ignored with a yellow warning on the ranking.</li>
<li>The “G source” column shows: Well test (DST) · Horner · Corrected BHT · Temperature log · Field gradient · Entered.</li>
</ul>

<h3 id="g4b">4b. Machine learning – temperature model</h3>
<p><b>Run ML (Home or Geothermal)</b>. A physics-constrained ridge regression predicts the <b>apparent gradient</b> from depth and the averages of GR, DT, RHOB and NPHI above each point, so temperature always rises with depth.</p>
<ul>
<li><b>Training data:</b> every measured temperature in the project – DST points, Horner static temperatures, corrected BHT. At least 6 points in 2 wells.</li>
<li><b>Validation:</b> leave one well out, train on the rest, predict it; compared with a single field-average gradient. The page states plainly whether ML is better yet.</li>
<li><b>P10–P90 range</b> from 60 bootstrap models plus the residual error.</li>
<li><b>Apply to wells without data</b> only fills wells on the field gradient or with no gradient; measured or entered gradients are kept. G source shows “Machine learning”.</li>
</ul>

<h3 id="g5">5. Log plot</h3>
<p>Double-click a well (or Plot → Log Plot). Tick curves to show; type Top/Bottom or <b>scroll to zoom</b> around the cursor; “Full range” resets. Hover to read all curves at one depth. Standard scales: GR 0–150, RHOB 1.95–2.95, NPHI 0.45→−0.15, DT 140→40, resistivity log 0.2–2000.</p>

<h3 id="g6">6. Screening and ranking</h3>
<p><b>Geothermal → Run Screening</b>. The ranking shows depth, gradient and source, bottom T, outlet T, heat Q (kWth) with P10–P90, integrity, NPV, suggested use and score.</p>
<ul>
<li>Model: closed-loop coaxial heat-exchanger well with Ramey (1962) heat transfer; P10–P90 by Monte Carlo over gradient σ and conductivity k ± 0.5.</li>
<li><b>Score</b> = weighted (output relative to the best well, integrity, distance, NPV); passing wells have a green edge. Weights and threshold are in the project Properties.</li>
<li>Click to select a well, double-click for its report. <b>Export Ranking</b> to CSV.</li>
</ul>

<h3 id="g7">7. Well report</h3>
<p>Score, Q, outlet T, NPV, recommendation; summary (gradient source, bottom T, capex, LCOH, payback); charts of temperature vs depth (rock, water, measured DST/log points), outlet T and output vs flow, output by year and cumulative cash. <b>Print / save PDF</b> prints the report only.</p>

<h3 id="g8">8. Utilisation options</h3>
<p><b>Geothermal → Best Use</b> (selected well) or <b>Compare Wells</b>. Options compared, each at the NPV-optimal flow rate:</p>
<ul>
<li><b>Direct heat – heat-pump substitute</b> (any temperature) and <b>drying / industry</b> (needs water ≥ drying T, default 60 °C).</li>
<li><b>ORC/Kalina power</b> per working fluid: R134a, R1233zd(E), R245fa, isobutane, isopentane, n-pentane, Kalina, ethanol. Efficiency = exergy factor × Carnot; the table gives reasons for infeasibility (source too cold, sub-atmospheric condensing…) and safety notes (flammable, toxic, GWP).</li>
<li><b>Cascade</b>: ORC first, then the ORC outlet water for drying/heating.</li>
<li>Three sources: <b>closed loop</b> (coaxial well), <b>open loop</b> (produce reservoir fluid and re-inject) and <b>co-produced water</b> on an operating platform (well Properties “Co-produced water”: rate and temperature; no well retrofit capex).</li>
<li>Offshore wells value power at the <b>platform electricity value</b> (displacing gas-turbine/diesel generation), set separately in the project parameters.</li>
</ul>
<h4>Reservoir – open-loop production</h4>
<p>Enter in the well Properties: area (km²), net thickness (m), porosity (%), reservoir TVDss, reservoir temperature (blank = from gradient), production rate (kg/s = m³/day ÷ 86.4). The tool computes volumetric heat in place, recoverable heat (Rf), the <b>power the reservoir can sustain</b> over the project life versus the well-flow power → limiting factor, <b>minimum reservoir area</b>, time to cooling, and a power-vs-area chart.</p>
<p>Reservoir extras: <b>productivity index PI</b> (m³/day/bar) × allowed drawdown caps the rate; <b>producer–injector spacing</b> gives the cold-water arrival time; <b>CO₂ content</b> above 10% raises a corrosion/scaling warning. The cold-zone radius after the project life and the recommended spacing are always shown; switch on “Rf from the swept cold zone” to replace the fixed Rf with this calculation.</p>
<p class="note">A closed loop only cools rock within about 50–60 m after 25 years, so reservoir area hardly matters. In an open loop the cold zone around the injector has radius r ≈ √(Q·t·ρc<sub>water</sub> / (π·h·ρc<sub>rock+water</sub>)); producer–injector spacing should be ≈ √3·r.</p>

<h3 id="g9">9. Sensitivity</h3>
<p>Heat-output map by depth × gradient, Table 4.1 recomputed with current parameters, and outlet T / output vs flow rate.</p>

<h3 id="g10">10. Project parameters</h3>
<p>Select the project row in the tree (or Geothermal → Parameters):</p>
<ul>
<li><b>Technical</b>: circulation rate, inlet temperature, operating time, surface T₀, rock conductivity, well-wall resistance, up-flow loss, gradient uncertainty.</li>
<li><b>Economics</b>: substituted heat value, onshore/offshore retrofit capex, pipeline, O&amp;M, pump power, hours, discount rate, life.</li>
<li><b>Ranking weights</b> and pass threshold.</li>
<li><b>Utilisation</b>: cooling ambient, condenser approach, drying T, electricity and heat values, ORC capex (M VND/kWe), heat-exchanger capex, open-loop capex, wellbore heat loss, reinjection T, Rf, swept-zone Rf, platform electricity value, ORC pinch, allowed drawdown.</li>
<li><b>Hydraulics</b>: “Hydraulic pump power” computes pump power from friction in the annulus and inner tube (casing and tube diameters); off = fixed pump power.</li>
<li><b>Extended economics</b>: P&amp;A cost and years deferred (deferral value added to NPV), emission factor of displaced heat and CO₂ credit price. Well reports show <b>NPV P10–P90</b> and the probability of NPV &gt; 0 under capex, price and output uncertainty.</li>
<li><b>Compare Wells</b> adds totals by field (well cluster).</li>
</ul>
<p class="note">Default cost figures are illustrative assumptions; replace them with your project's data.</p>

<h3 id="g11">11. Data privacy</h3>
<ul>
<li>All calculations run in your browser; LAS, CSV and project files are <b>never uploaded</b> to any server.</li>
<li>Projects live in the browser's IndexedDB; clearing browser data deletes them → always keep the <code>.awproj.json</code> file.</li>
<li>Do not put project files, LAS or results containing field data in a public repository.</li>
<li><b>Offline use:</b> after the first visit online, the app is stored on the computer and opens without a connection.</li>
</ul>

<h3 id="g12">12. Troubleshooting</h3>
<table class="tbl"><tr><th>Symptom</th><th>Fix</th></tr>
<tr><td>Unusually low bottom T (e.g. 19 °C), negative score or Q</td><td>Check the well's BHT/Horner boxes for 0 or tiny values; clear them. See the “G source” column.</td></tr>
<tr><td>Log gradient too low (&lt; 2.2)</td><td>The log is mud temperature; enter a DST or corrected-BHT gradient.</td></tr>
<tr><td>LAS file error</td><td>See the Output Window; check ~Curve and ~ASCII sections and the column count.</td></tr>
<tr><td>Well “skipped”</td><td>Missing depth or a valid gradient/BHT.</td></tr>
<tr><td>Old project missing</td><td>Different browser/computer → Open Project File.</td></tr>
<tr><td>Site not updating</td><td>Press Ctrl+F5 (possibly twice because of the offline copy).</td></tr>
<tr><td>Check the calculations</td><td>Open <a href="tests.html" target="_blank">tests.html</a>: 26 automated checks against the Python v0.1 model and standard formulas.</td></tr></table>

<h3 id="g13">13. Model limitations</h3>
<p>Linear gradient, homogeneous rock, fixed up-flow loss; ORC by exergy factor; reservoir by the volumetric method. Results are for <b>screening</b> and do not replace detailed design, reservoir simulation or real well-integrity assessment. The ML model is only as good as the measured temperatures in the project. DLIS/LIS files, a coordinate map and log-based integrity are not supported yet, and the model has not been compared with measured geothermal production.</p>

<h3 id="g14">14. Volve field case study (real data)</h3>
<p>Volve (Norwegian North Sea, block 15/9) was released in full by Equinor in 2018 under the Equinor Open Data Licence. The field stopped producing in 2016, which makes it a good repurposing example. The app ships a compact extract in <code>data/volve.json</code>.</p>
<ol>
<li><b>Help → Volve Data</b>: source and licence, a table of 24 wells (MD, TVD, KB, temperature points, gradient, logs), temperature vs depth for all measured points, a map of the ST10010/ST0202 3D survey outlines and the platform, the inventory of 34 3D cubes (inline/crossline, time/depth domain, status) and 33 ST0299 2D lines. Buttons download the temperature points as a DST-style CSV and the well list.</li>
<li><b>Help → Volve Project</b> (or the button on the start page): builds a project with every well whose TVD is known, including a deviation survey (derived from MD–TVD pairs), LWD temperature points and 5 m GR/DT/RHOB/NPHI/RT logs. Parameters are set for the North Sea: T0 = 6 °C, inlet 25 °C, ambient 10 °C, power generation. Then run screening, reports, utilisation options and ML as for any project.</li>
<li>Wells without measurements get the field gradient; use <b>Run ML (Home or Geothermal)</b> to predict from logs.</li>
</ol>
<p class="warnbox">LWD temperatures are recorded with mud circulating and read below static formation temperature; the Volve gradients here (≈ 2.4–3.4 °C/100 m) are lower bounds. SEG-Y volumes are not loaded in the browser. Extraction code: <code>tools/build_volve.py</code>.</p>

<h3 id="g15">15. Geothermal technology comparison</h3>
<p><b>Geothermal → Technology Comparison</b> evaluates every well with five technologies. Each picks its most valuable use (power, direct heat or cogeneration) and reports flow, source temperature, kWth, kWe, capital cost, cash flow, NPV, LCOE and CO₂ stored:</p>
<table><tr><th>Technology</th><th>TRL</th><th>Method</th></tr>
<tr><td>CLGS – coaxial closed loop</td><td>7</td><td>Existing Ramey model, optimised flow.</td></tr>
<tr><td>AGS – multilateral closed loop</td><td>6–7</td><td>Laterals at bottom-hole rock temperature, Ramey conduction; capex = retrofit + lateral drilling.</td></tr>
<tr><td>Hydrothermal – open loop</td><td>9</td><td>DST flow capped by PI and reservoir heat in place (needs reservoir data).</td></tr>
<tr><td>EGS – stimulated, water</td><td>5–7</td><td>Heat in the stimulated volume × recovery factor; pumping from impedance; capex includes stimulation and a new injector.</td></tr>
<tr><td>CO₂-EGS / CPG</td><td>4–5</td><td>Supercritical CO₂ in the depleted reservoir (or stimulated rock): 1.5× the heat extraction of water, thermosiphon, CO₂ turbine; CO₂ lost to the formation counts as stored (credit at the “CO₂ price”).</td></tr></table>
<p>Saleable energy is capped by local demand (default offshore 1,000 kWth heat, 5,000 kWe power). All assumptions are under Project properties → <b>Technology comparison</b>. “Export CSV” saves the detail table.</p>

<h3 id="g16">16. Automatic updates and sync</h3>
<ul>
<li><b>Web version:</b> on load, when you return to the tab and every 5 minutes the app checks <code>version.json</code>; when a new version exists it saves the project, clears the offline cache and reloads. The running version is shown at the bottom of the start page.</li>
<li><b>Project data across computers:</b> Home → <b>Sync File</b> → “Create new sync file” (save it in your OneDrive folder) or “Link to existing file”. Every change is written to the file; when you open the project or return to the tab, the app loads the file if it is newer. On another computer open the app → <b>Open Project File</b> → pick the same file to sync both ways. The title bar shows “⟳ synced file-name”.</li>
<li>Needs Chrome or Edge on a computer. The browser asks for file access once per session; choose “Allow on every visit” to stop the prompt. Other browsers: use Save/Open Project File.</li>
<li><b>Several tabs:</b> a change in one tab updates the other tabs showing the same project.</li>
<li><b>Volve project:</b> its wells refresh automatically when the Volve data on the web is updated; your parameter changes are kept.</li>
</ul>
`,
};
