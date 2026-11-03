import SwiftUI
import PhotosUI
import FotoDocsCore
import FotoDocsImaging
import FotoDocsDesign

enum IDHomeRoute: Hashable {
    case online
}

/// "Ảnh nộp online": the exact photo file each portal accepts. Shoot a new one (normal capture →
/// edit → "File số" export at the portal's pixels / KB), or check a file you already have.
struct OnlinePhotoView: View {
    let start: (CaptureTarget) -> Void
    @State private var checking: OnlinePortal?
    @State private var showPicker = false
    @State private var item: PhotosPickerItem?
    @State private var result: CheckResult?

    struct CheckResult: Identifiable {
        let id = UUID()
        let portal: OnlinePortal
        let image: UIImage
        let items: [OnlinePhotoCheck.Item]
    }

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    Text("Mỗi cổng nộp hồ sơ đòi một kiểu file ảnh khác nhau. Chọn nơi nộp để chụp ảnh mới đúng chuẩn, hoặc kiểm tra ảnh bạn đang có.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    ForEach(CaptureTarget.online) { portal in card(portal) }
                    Text("Thông số theo hướng dẫn công bố của từng cổng. App không đảm bảo 100% được chấp nhận.")
                        .font(.bvp(.footnote))
                        .foregroundStyle(FotoDocs.Palette.textMuted)
                }
                .padding(20)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Ảnh nộp online")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .photosPicker(isPresented: $showPicker, selection: $item, matching: .images)
        .onChange(of: item) { _, picked in
            guard let picked, let portal = checking else { return }
            item = nil
            Task { await check(picked, for: portal) }
        }
        .sheet(item: $result) { r in OnlineCheckSheet(result: r) }
    }

    private func card(_ portal: OnlinePortal) -> some View {
        let t = portal.target
        let px = t.digitalPixels.map { "\(Int($0.width))×\(Int($0.height)) px" } ?? t.sizeText
        let kb = t.digitalMaxKB.map { $0 >= 1000 ? "≤ \($0 / 1000) MB" : "≤ \($0) KB" } ?? ""
        return VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 3) {
                Text(t.title).font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Text(t.subtitle).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
            }
            Text("\(px) · JPEG \(kb)")
                .font(.bvp(.caption, .bold))
                .foregroundStyle(FotoDocs.Palette.primary)
                .padding(.horizontal, 10)
                .frame(height: 26)
                .background(FotoDocs.Palette.primaryTint, in: .capsule)
            Text(portal.note).font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.textSecondary)
            HStack(spacing: 10) {
                Button { start(t) } label: {
                    Label("Chụp ảnh mới", systemImage: "camera.fill")
                        .font(.bvp(.subheadline, .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(FotoDocs.Palette.primary, in: .capsule)
                }
                Button { checking = portal; showPicker = true } label: {
                    Label("Kiểm tra ảnh", systemImage: "checkmark.seal")
                        .font(.bvp(.subheadline, .semibold))
                        .foregroundStyle(FotoDocs.Palette.primary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .fotoCardCapsule()
                }
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fotoCard()
    }

    private func check(_ picked: PhotosPickerItem, for portal: OnlinePortal) async {
        guard let data = try? await picked.loadTransferable(type: Data.self), let ui = UIImage(data: data) else { return }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let upright = UIGraphicsImageRenderer(size: ui.size, format: format).image { _ in ui.draw(at: .zero) }
        guard let cg = upright.cgImage else { return }
        let input = await Task.detached { PhotoProbe.input(data: data, image: cg) }.value
        result = CheckResult(portal: portal, image: upright, items: OnlinePhotoCheck.evaluate(input, for: portal.target))
    }
}

private struct OnlineCheckSheet: View {
    let result: OnlinePhotoView.CheckResult
    @Environment(\.dismiss) private var dismiss
    @State private var fixing = false

    private var allOK: Bool { !result.items.contains { !$0.ok } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top, spacing: 14) {
                        Image(uiImage: result.image).resizable().scaledToFit()
                            .frame(width: 96, height: 120)
                            .clipShape(.rect(cornerRadius: 10))
                        VStack(alignment: .leading, spacing: 4) {
                            Text(result.portal.target.title).font(.bvp(.headline, .semibold))
                            Label(allOK ? "Ảnh đạt các mục kiểm tra" : "Ảnh chưa đạt \(result.items.filter { !$0.ok }.count) mục",
                                  systemImage: allOK ? "checkmark.seal.fill" : "exclamationmark.triangle.fill")
                                .font(.bvp(.subheadline, .semibold))
                                .foregroundStyle(allOK ? FotoDocs.Palette.success : FotoDocs.Palette.warning)
                        }
                    }
                    VStack(spacing: 8) {
                        ForEach(result.items) { item in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: item.ok ? "checkmark.circle.fill" : "xmark.circle.fill")
                                    .foregroundStyle(item.ok ? FotoDocs.Palette.success : FotoDocs.Palette.red)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(item.label).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                                    Text(item.detail).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
                                }
                                Spacer(minLength: 0)
                            }
                            .padding(12)
                            .fotoCard(14)
                        }
                    }
                    PillButton(allOK ? "Xuất lại đúng chuẩn" : "Sửa cho đạt chuẩn", systemImage: "wand.and.stars") { fixing = true }
                    Text("App cắt lại khung, làm nền trắng, đổi cỡ và nén đúng dung lượng. Mặt không bị chỉnh sửa.")
                        .font(.bvp(.footnote))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                .padding(20)
            }
            .background(FotoDocs.Palette.background)
            .navigationTitle("Kết quả kiểm tra")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } } }
        }
        .fullScreenCover(isPresented: $fixing) {
            EditView(target: result.portal.target, image: result.image)
        }
    }
}
