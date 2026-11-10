/* User guide shown under Help → User Guide (Vietnamese / English) */
window.GUIDE = {
  vi: `
<h2>Hướng dẫn sử dụng AbandonedWell Energy AI</h2>
<p class="muted">Phiên bản web v0.3 · Công cụ sàng lọc giếng dầu khí ngừng khai thác để cải tạo thành giếng địa nhiệt.</p>
<nav class="toc"><b>Mục lục</b><ol>
<li><a href="#g1">Giao diện</a></li><li><a href="#g2">Tạo và quản lý dự án</a></li><li><a href="#g3">Nhập dữ liệu (LAS, CSV, nhập tay)</a></li>
<li><a href="#g4">Thuộc tính giếng và nguồn gradient</a></li><li><a href="#g5">Biểu đồ log</a></li><li><a href="#g6">Sàng lọc và xếp hạng</a></li>
<li><a href="#g7">Báo cáo giếng</a></li><li><a href="#g8">Phương án sử dụng (ORC, nhiệt trực tiếp, vỉa chứa)</a></li><li><a href="#g9">Độ nhạy</a></li>
<li><a href="#g10">Thông số dự án</a></li><li><a href="#g11">Bảo mật dữ liệu</a></li><li><a href="#g12">Xử lý sự cố</a></li><li><a href="#g13">Giới hạn của mô hình</a></li></ol></nav>

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
<h4>Nhập tay</h4>
<p>Trang chủ → Giếng mới, rồi điền ở khung Thuộc tính.</p>
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
<li>Hai nguồn: <b>vòng kín</b> (giếng đồng trục) và <b>vòng hở</b> (khai thác chất lưu vỉa rồi bơm ép).</li>
</ul>
<h4>Vỉa chứa – khai thác vòng hở</h4>
<p>Nhập ở Thuộc tính giếng: diện tích (km²), chiều dày hiệu dụng (m), độ rỗng (%), độ sâu vỉa TVDss, nhiệt độ vỉa (để trống = theo gradient), lưu lượng (kg/s = m³/ngđ ÷ 86,4). Web tính nhiệt tại chỗ theo phương pháp thể tích, nhiệt thu hồi (Rf), <b>công suất vỉa duy trì được</b> trong vòng đời, so với công suất theo lưu lượng giếng → yếu tố giới hạn, <b>diện tích vỉa tối thiểu</b>, thời gian tới khi vỉa nguội; biểu đồ công suất theo diện tích.</p>
<p class="note">Vòng kín chỉ làm nguội đá trong bán kính khoảng 50–60 m sau 25 năm, nên diện tích vỉa hầu như không ảnh hưởng. Với vòng hở, vùng nước lạnh quanh giếng bơm ép có bán kính r ≈ √(Q·t·ρc<sub>nước</sub> / (π·h·ρc<sub>đá+nước</sub>)); hai giếng nên cách nhau ≈ √3·r.</p>

<h3 id="g9">9. Độ nhạy</h3>
<p>Bản đồ công suất theo chiều sâu × gradient, Bảng 4.1 tính lại theo thông số hiện tại, và biểu đồ nhiệt độ ra/công suất theo lưu lượng.</p>

<h3 id="g10">10. Thông số dự án</h3>
<p>Chọn dòng dự án trong cây (hoặc Địa nhiệt → Thông số):</p>
<ul>
<li><b>Kỹ thuật</b>: lưu lượng tuần hoàn, nhiệt độ nước vào, thời gian vận hành, T₀ bề mặt, độ dẫn nhiệt đá, nhiệt trở thành giếng, tổn thất ống đi lên, độ bất định gradient.</li>
<li><b>Kinh tế</b>: giá trị nhiệt thay thế, vốn cải tạo đất liền/ngoài khơi, đường ống, vận hành – bảo dưỡng, công suất bơm, giờ vận hành, lãi suất, vòng đời.</li>
<li><b>Trọng số xếp hạng</b> và ngưỡng đạt.</li>
<li><b>Phương án sử dụng</b>: nhiệt độ làm mát, chênh nhiệt bình ngưng, T sấy, giá trị điện và nhiệt, vốn ORC (triệu đ/kWe), vốn trao đổi nhiệt, vốn vòng hở, tổn thất lên miệng giếng, T bơm ép, Rf.</li>
</ul>
<p class="note">Các giá trị mặc định về chi phí là giả định để minh họa; hãy thay bằng số liệu thực của dự án.</p>

<h3 id="g11">11. Bảo mật dữ liệu</h3>
<ul>
<li>Mọi tính toán chạy trong trình duyệt; tệp LAS, CSV, dự án <b>không được tải lên máy chủ nào</b>.</li>
<li>Dự án lưu trong IndexedDB của trình duyệt. Xóa dữ liệu trình duyệt sẽ mất dự án → luôn giữ tệp <code>.awproj.json</code>.</li>
<li>Không đưa tệp dự án, LAS hay kết quả có số liệu mỏ lên kho mã công khai.</li>
</ul>

<h3 id="g12">12. Xử lý sự cố</h3>
<table class="tbl"><tr><th>Hiện tượng</th><th>Cách xử lý</th></tr>
<tr><td>T đáy thấp bất thường (vd 19 °C), điểm hoặc Q âm</td><td>Kiểm tra ô BHT/Horner của giếng có số 0 hay số nhỏ; xóa trống. Xem cột “Nguồn G”.</td></tr>
<tr><td>Gradient từ log quá thấp (&lt; 2,2)</td><td>Log là nhiệt độ dung dịch; nhập gradient từ DST hoặc BHT đã hiệu chỉnh.</td></tr>
<tr><td>Tệp LAS báo lỗi</td><td>Xem Cửa sổ thông báo; kiểm tra có ~Curve và ~ASCII, dòng dữ liệu đủ số cột.</td></tr>
<tr><td>Giếng bị “bỏ qua”</td><td>Thiếu chiều sâu hoặc gradient/BHT hợp lệ.</td></tr>
<tr><td>Không thấy dự án cũ</td><td>Đang dùng trình duyệt/máy khác → Mở tệp dự án.</td></tr>
<tr><td>Web không cập nhật bản mới</td><td>Nhấn Ctrl+F5.</td></tr></table>

<h3 id="g13">13. Giới hạn của mô hình</h3>
<p>Gradient tuyến tính, đá đồng nhất, tổn thất ống đi lên cố định; ORC tính theo hệ số exergy; vỉa tính theo phương pháp thể tích. Kết quả dùng để <b>sàng lọc</b>, chưa thay cho thiết kế chi tiết, mô phỏng thủy động hay đánh giá toàn vẹn giếng thực tế.</p>
`,
  en: `
<h2>AbandonedWell Energy AI – User Guide</h2>
<p class="muted">Web version v0.3 · Screening tool for repurposing shut-in oil &amp; gas wells as geothermal wells.</p>
<nav class="toc"><b>Contents</b><ol>
<li><a href="#g1">Interface</a></li><li><a href="#g2">Creating and managing projects</a></li><li><a href="#g3">Importing data (LAS, CSV, manual)</a></li>
<li><a href="#g4">Well properties and gradient source</a></li><li><a href="#g5">Log plot</a></li><li><a href="#g6">Screening and ranking</a></li>
<li><a href="#g7">Well report</a></li><li><a href="#g8">Utilisation options (ORC, direct heat, reservoir)</a></li><li><a href="#g9">Sensitivity</a></li>
<li><a href="#g10">Project parameters</a></li><li><a href="#g11">Data privacy</a></li><li><a href="#g12">Troubleshooting</a></li><li><a href="#g13">Model limitations</a></li></ol></nav>

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
<h4>Manual entry</h4>
<p>Home → New Well, then fill in the Properties Editor.</p>
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
<li>Two sources: <b>closed loop</b> (coaxial well) and <b>open loop</b> (produce reservoir fluid and re-inject).</li>
</ul>
<h4>Reservoir – open-loop production</h4>
<p>Enter in the well Properties: area (km²), net thickness (m), porosity (%), reservoir TVDss, reservoir temperature (blank = from gradient), production rate (kg/s = m³/day ÷ 86.4). The tool computes volumetric heat in place, recoverable heat (Rf), the <b>power the reservoir can sustain</b> over the project life versus the well-flow power → limiting factor, <b>minimum reservoir area</b>, time to cooling, and a power-vs-area chart.</p>
<p class="note">A closed loop only cools rock within about 50–60 m after 25 years, so reservoir area hardly matters. In an open loop the cold zone around the injector has radius r ≈ √(Q·t·ρc<sub>water</sub> / (π·h·ρc<sub>rock+water</sub>)); producer–injector spacing should be ≈ √3·r.</p>

<h3 id="g9">9. Sensitivity</h3>
<p>Heat-output map by depth × gradient, Table 4.1 recomputed with current parameters, and outlet T / output vs flow rate.</p>

<h3 id="g10">10. Project parameters</h3>
<p>Select the project row in the tree (or Geothermal → Parameters):</p>
<ul>
<li><b>Technical</b>: circulation rate, inlet temperature, operating time, surface T₀, rock conductivity, well-wall resistance, up-flow loss, gradient uncertainty.</li>
<li><b>Economics</b>: substituted heat value, onshore/offshore retrofit capex, pipeline, O&amp;M, pump power, hours, discount rate, life.</li>
<li><b>Ranking weights</b> and pass threshold.</li>
<li><b>Utilisation</b>: cooling ambient, condenser approach, drying T, electricity and heat values, ORC capex (M VND/kWe), heat-exchanger capex, open-loop capex, wellbore heat loss, reinjection T, Rf.</li>
</ul>
<p class="note">Default cost figures are illustrative assumptions; replace them with your project's data.</p>

<h3 id="g11">11. Data privacy</h3>
<ul>
<li>All calculations run in your browser; LAS, CSV and project files are <b>never uploaded</b> to any server.</li>
<li>Projects live in the browser's IndexedDB; clearing browser data deletes them → always keep the <code>.awproj.json</code> file.</li>
<li>Do not put project files, LAS or results containing field data in a public repository.</li>
</ul>

<h3 id="g12">12. Troubleshooting</h3>
<table class="tbl"><tr><th>Symptom</th><th>Fix</th></tr>
<tr><td>Unusually low bottom T (e.g. 19 °C), negative score or Q</td><td>Check the well's BHT/Horner boxes for 0 or tiny values; clear them. See the “G source” column.</td></tr>
<tr><td>Log gradient too low (&lt; 2.2)</td><td>The log is mud temperature; enter a DST or corrected-BHT gradient.</td></tr>
<tr><td>LAS file error</td><td>See the Output Window; check ~Curve and ~ASCII sections and the column count.</td></tr>
<tr><td>Well “skipped”</td><td>Missing depth or a valid gradient/BHT.</td></tr>
<tr><td>Old project missing</td><td>Different browser/computer → Open Project File.</td></tr>
<tr><td>Site not updating</td><td>Press Ctrl+F5.</td></tr></table>

<h3 id="g13">13. Model limitations</h3>
<p>Linear gradient, homogeneous rock, fixed up-flow loss; ORC by exergy factor; reservoir by the volumetric method. Results are for <b>screening</b> and do not replace detailed design, reservoir simulation or real well-integrity assessment.</p>
`,
};
