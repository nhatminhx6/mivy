import SwiftUI
import SwiftData
import FotoDocsDesign

/// Search across the document tools and the saved dossier checklist.
struct DocumentSearchSheet: View {
    let onPick: (DocRoute) -> Void
    @Query(sort: \DossierItem.createdAt) private var items: [DossierItem]
    @State private var query = ""
    @FocusState private var focused: Bool

    private struct Entry: Identifiable {
        let id: String
        let title: String
        let detail: String
        let icon: String
        let route: DocRoute
        let keywords: String
    }

    private var tools: [Entry] {
        [
            Entry(id: "scan", title: "Scan tài liệu", detail: "Chụp giấy tờ thành PDF nhiều trang", icon: "doc.viewfinder",
                  route: .scan, keywords: "scan quét chụp pdf giấy tờ hợp đồng"),
            Entry(id: "cccd", title: "Thẻ hai mặt", detail: "CCCD, bằng lái, BHYT, thẻ SV, thẻ ngân hàng lên 1 trang A4", icon: "person.crop.rectangle",
                  route: .cccd, keywords: "cccd cmnd căn cước a4 hai mặt photo bằng lái gplx bhyt bảo hiểm thẻ sinh viên ngân hàng atm"),
            Entry(id: "compress", title: "Nén file", detail: "Giảm dung lượng ảnh / PDF để nộp online", icon: "arrow.down.right.and.arrow.up.left",
                  route: .compress, keywords: "nén giảm dung lượng kb mb nộp online"),
            Entry(id: "sign", title: "Ký tên", detail: "Ký tay lên file PDF", icon: "signature",
                  route: .sign, keywords: "ký chữ ký pdf"),
            Entry(id: "visa", title: "Điền form visa", detail: "Quét CCCD, hộ chiếu, điền sẵn form visa", icon: "airplane",
                  route: .visa, keywords: "visa thị thực form tờ khai hộ chiếu cccd hàn nhật mỹ đài loan trung quốc úc anh schengen"),
            Entry(id: "itinerary", title: "Lịch trình chuyến đi", detail: "Lịch trình từng ngày tiếng Anh cho hồ sơ visa", icon: "calendar",
                  route: .visa, keywords: "lịch trình itinerary chuyến đi du lịch visa khách sạn"),
            Entry(id: "translation", title: "Bản dịch giấy tờ", detail: "Khai sinh, xác nhận cư trú, xác nhận công tác sang tiếng Anh", icon: "character.book.closed",
                  route: .visa, keywords: "dịch bản dịch tiếng anh khai sinh cư trú ct07 xác nhận công tác nghỉ phép"),
            Entry(id: "expense", title: "Công tác phí", detail: "Chụp hoá đơn, tự cộng tổng, xuất Excel / PDF", icon: "receipt",
                  route: .expense, keywords: "hoá đơn hóa đơn bill công tác phí chi phí thanh toán kế toán excel bảng kê"),
            Entry(id: "dossier", title: "Bộ hồ sơ", detail: "Checklist giấy tờ cần chuẩn bị", icon: "checklist",
                  route: .dossier, keywords: "hồ sơ checklist giấy tờ chuẩn bị"),
        ]
    }

    private var results: [Entry] {
        let q = Self.fold(query)
        let dossier = items.map {
            Entry(id: "item-\($0.persistentModelID.hashValue)", title: $0.title,
                  detail: $0.isDone ? "Đã có · trong Bộ hồ sơ" : "Chưa có · trong Bộ hồ sơ",
                  icon: $0.isDone ? "checkmark.circle.fill" : "circle", route: .dossier, keywords: $0.title)
        }
        guard !q.isEmpty else { return tools }
        return (tools + dossier).filter { Self.fold($0.title + " " + $0.keywords).contains(q) }
    }

    /// Lowercased, accents stripped, so "ky ten" finds "Ký tên".
    static func fold(_ s: String) -> String {
        s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: Locale(identifier: "vi"))
            .replacingOccurrences(of: "đ", with: "d")
            .trimmingCharacters(in: .whitespaces)
    }

    var body: some View {
        ZStack(alignment: .top) {
            FotoDocsBackground()
            VStack(alignment: .leading, spacing: 14) {
                Capsule().fill(FotoDocs.Palette.borderStrong).frame(width: 40, height: 5)
                    .frame(maxWidth: .infinity).padding(.top, 10)
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(FotoDocs.Palette.textSecondary)
                    TextField("Tìm công cụ, giấy tờ…", text: $query)
                        .font(.bvp(.body))
                        .focused($focused)
                        .submitLabel(.search)
                    if !query.isEmpty {
                        Button { query = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(FotoDocs.Palette.textMuted)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)
                .frame(height: 50)
                .fotoCard(16)

                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(results) { entry in
                            Button { onPick(entry.route) } label: { row(entry) }
                                .buttonStyle(.plain)
                        }
                        if results.isEmpty {
                            Text("Không thấy kết quả cho “\(query)”.")
                                .font(.bvp(.subheadline))
                                .foregroundStyle(FotoDocs.Palette.textSecondary)
                                .padding(.top, 24)
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
        }
        .presentationDetents([.large])
        .onAppear { focused = true }
    }

    private func row(_ entry: Entry) -> some View {
        HStack(spacing: 14) {
            Image(systemName: entry.icon)
                .font(.bvp(.title3))
                .foregroundStyle(FotoDocs.Palette.primary)
                .frame(width: 44, height: 44)
                .background(FotoDocs.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Text(entry.detail).font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
        }
        .padding(14)
        .fotoCard()
    }
}
