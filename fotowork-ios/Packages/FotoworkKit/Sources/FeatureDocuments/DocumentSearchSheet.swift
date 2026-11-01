import SwiftUI
import SwiftData
import FotoworkDesign

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
            Entry(id: "cccd", title: "CCCD hai mặt", detail: "Ghép mặt trước + sau lên 1 trang A4", icon: "person.crop.rectangle",
                  route: .cccd, keywords: "cccd cmnd căn cước a4 hai mặt photo"),
            Entry(id: "compress", title: "Nén file", detail: "Giảm dung lượng ảnh / PDF để nộp online", icon: "arrow.down.right.and.arrow.up.left",
                  route: .compress, keywords: "nén giảm dung lượng kb mb nộp online"),
            Entry(id: "sign", title: "Ký tên", detail: "Ký tay lên file PDF", icon: "signature",
                  route: .sign, keywords: "ký chữ ký pdf"),
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
            FotoworkBackground()
            VStack(alignment: .leading, spacing: 14) {
                Capsule().fill(Fotowork.Palette.borderStrong).frame(width: 40, height: 5)
                    .frame(maxWidth: .infinity).padding(.top, 10)
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass").foregroundStyle(Fotowork.Palette.textSecondary)
                    TextField("Tìm công cụ, giấy tờ…", text: $query)
                        .font(.bvp(.body))
                        .focused($focused)
                        .submitLabel(.search)
                    if !query.isEmpty {
                        Button { query = "" } label: {
                            Image(systemName: "xmark.circle.fill").foregroundStyle(Fotowork.Palette.textMuted)
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
                                .foregroundStyle(Fotowork.Palette.textSecondary)
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
                .foregroundStyle(Fotowork.Palette.primary)
                .frame(width: 44, height: 44)
                .background(Fotowork.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            VStack(alignment: .leading, spacing: 3) {
                Text(entry.title).font(.bvp(.subheadline, .semibold)).foregroundStyle(Fotowork.Palette.textPrimary)
                Text(entry.detail).font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(Fotowork.Palette.textMuted)
        }
        .padding(14)
        .fotoCard()
    }
}
