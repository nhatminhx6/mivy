import SwiftUI
import FotoworkCore
import FotoworkDesign

public struct SettingsHomeView: View {
    @Environment(\.presetStore) private var store
    @State private var data: PresetData?
    @State private var showSizes = false
    @State private var showPrivacy = false
    @State private var confirmClear = false
    @State private var clearedNote: String?
    private let onClearDossier: () -> Int

    /// `onClearDossier`: deletes the saved dossier checklist, returns how many items were removed.
    public init(onClearDossier: @escaping () -> Int = { 0 }) {
        self.onClearDossier = onClearDossier
    }

    private var researched: String { data?.researched ?? "—" }

    private var version: String {
        let info = Bundle.main.infoDictionary
        let v = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = info?["CFBundleVersion"] as? String
        return b.map { "\(v) (\($0))" } ?? v
    }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 16) {
                    header
                    card {
                        button(icon: "ruler.fill", tint: Fotowork.Palette.primary, title: "Bảng cỡ ảnh",
                               value: "\((data?.visaDestinations.count ?? 0) + (data?.originPassports.count ?? 0)) quy chuẩn") { showSizes = true }
                        divider
                        row(icon: "checkmark.seal.fill", tint: Fotowork.Palette.success, title: "Bản quy chuẩn ảnh", value: researched)
                    }
                    card {
                        button(icon: "lock.shield.fill", tint: Fotowork.Palette.primary, title: "Quyền riêng tư",
                               value: "Ảnh không rời máy") { showPrivacy = true }
                        divider
                        button(icon: "trash.fill", tint: Fotowork.Palette.warning, title: "Xoá dữ liệu Bộ hồ sơ",
                               value: clearedNote ?? "") { confirmClear = true }
                    }
                    card {
                        ShareLink(item: "Fotowork – chụp ảnh thẻ, ảnh visa, giấy tờ ngay trên điện thoại. Ảnh xử lý trên máy, không gửi lên mạng.") {
                            rowContent(icon: "square.and.arrow.up.fill", tint: Fotowork.Palette.primary, title: "Chia sẻ Fotowork", value: "", chevron: true)
                        }
                        .buttonStyle(.plain)
                        divider
                        row(icon: "info.circle.fill", tint: Fotowork.Palette.textSecondary, title: "Phiên bản", value: version)
                    }
                    Text("Kích thước ảnh theo hướng dẫn của cơ quan lãnh sự, cập nhật \(researched). Fotowork không đảm bảo 100% đạt chuẩn.")
                        .font(.bvp(.footnote))
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 8)
                }
                .padding(20)
                .padding(.bottom, 96)
            }
        }
        .task { data = try? store.load() }
        .sheet(isPresented: $showSizes) { SizesSheet(data: data) }
        .sheet(isPresented: $showPrivacy) { PrivacySheet() }
        .confirmationDialog("Xoá toàn bộ checklist Bộ hồ sơ?", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("Xoá", role: .destructive) {
                let n = onClearDossier()
                clearedNote = n > 0 ? "Đã xoá \(n) mục" : "Không có gì để xoá"
            }
            Button("Huỷ", role: .cancel) {}
        } message: {
            Text("Không thể hoàn tác. Ảnh và file đã lưu ra ngoài không bị ảnh hưởng.")
        }
    }

    private var header: some View {
        HStack {
            Text("Cài đặt")
                .font(.bvp(.largeTitle, .bold))
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
        }
        .frame(height: 48)
    }

    private func card<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(spacing: 0) { content() }
            .padding(6)
            .fotoCard(Fotowork.Radius.tile)
    }

    private func row(icon: String, tint: Color, title: String, value: String) -> some View {
        rowContent(icon: icon, tint: tint, title: title, value: value, chevron: false)
    }

    private func button(icon: String, tint: Color, title: String, value: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { rowContent(icon: icon, tint: tint, title: title, value: value, chevron: true) }
            .buttonStyle(.plain)
    }

    private func rowContent(icon: String, tint: Color, title: String, value: String, chevron: Bool) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .frame(width: 38, height: 38)
                .background(tint.opacity(0.12), in: .circle)
            Text(title)
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            Text(value)
                .font(.bvp(.subheadline))
                .foregroundStyle(Fotowork.Palette.textSecondary)
                .lineLimit(1)
            if chevron {
                Image(systemName: "chevron.right").font(.bvp(.footnote, .semibold)).foregroundStyle(Fotowork.Palette.textMuted)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private var divider: some View {
        Rectangle()
            .fill(Fotowork.Palette.border)
            .frame(height: 1)
            .padding(.leading, 64)
    }
}

// MARK: - Sheets

private struct SizesSheet: View {
    let data: PresetData?

    var body: some View {
        SettingsSheet(title: "Bảng cỡ ảnh", subtitle: "Theo hướng dẫn của cơ quan lãnh sự · cập nhật \(data?.researched ?? "—")") {
            section("Ảnh thẻ Việt Nam")
            line("Ảnh 3×4 (hồ sơ)", "30×40 mm · nền trắng")
            line("Ảnh 4×6 (hộ chiếu)", "40×60 mm · nền trắng")
            section("Visa")
            ForEach(data?.visaDestinations ?? []) { d in
                line(d.nameVi, [d.sizeLabel, d.background.map { "nền \($0)" }].compactMap { $0 }.joined(separator: " · "))
            }
            section("Hộ chiếu theo nước")
            ForEach(data?.originPassports ?? []) { o in
                line(o.nameVi, o.print?.summary ?? "Chụp tại cơ quan / chưa có quy chuẩn")
            }
        }
    }

    private func section(_ t: String) -> some View {
        Text(t).font(.bvp(.footnote, .bold)).foregroundStyle(Fotowork.Palette.textSecondary).padding(.top, 12)
    }

    private func line(_ title: String, _ detail: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer(minLength: 12)
            Text(detail).font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary).multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 10)
        .padding(.horizontal, 14)
        .fotoCard(14)
    }
}

private struct PrivacySheet: View {
    var body: some View {
        SettingsSheet(title: "Quyền riêng tư", subtitle: "Fotowork xử lý ảnh ngay trên điện thoại.") {
            point("cpu", "Xử lý trên máy", "Tách nền, chỉnh sáng, ghép trang phục, scan và nén đều chạy trên thiết bị (Apple Vision, Core Image). Không có ảnh nào được gửi lên máy chủ.")
            point("person.crop.circle.badge.checkmark", "Không chỉnh khuôn mặt", "Ảnh giấy tờ chỉ được xử lý nền, ánh sáng, cắt khung và trang phục — khuôn mặt giữ nguyên.")
            point("externaldrive", "Dữ liệu lưu trên máy", "Checklist Bộ hồ sơ lưu trong máy, xoá được ở Cài đặt. File xuất ra chỉ đi đến nơi bạn chọn chia sẻ.")
            point("hand.raised", "Avatar", "Chỉ dùng ảnh của chính bạn hoặc ảnh bạn được phép dùng.")
        }
    }

    private func point(_ icon: String, _ title: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 14) {
            Image(systemName: icon)
                .foregroundStyle(Fotowork.Palette.primary)
                .frame(width: 38, height: 38)
                .background(Fotowork.Palette.primaryTint, in: .circle)
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(Fotowork.Palette.textPrimary)
                Text(text).font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fotoCard(14)
    }
}

private struct SettingsSheet<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content

    var body: some View {
        ZStack(alignment: .top) {
            FotoworkBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    Capsule().fill(Fotowork.Palette.borderStrong).frame(width: 40, height: 5)
                        .frame(maxWidth: .infinity).padding(.top, 10)
                    Text(title).font(.bvp(.title2, .bold)).foregroundStyle(Fotowork.Palette.textPrimary).padding(.top, 8)
                    Text(subtitle).font(.bvp(.subheadline)).foregroundStyle(Fotowork.Palette.textSecondary).padding(.bottom, 6)
                    content
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 30)
            }
        }
    }
}

#Preview {
    SettingsHomeView()
}
