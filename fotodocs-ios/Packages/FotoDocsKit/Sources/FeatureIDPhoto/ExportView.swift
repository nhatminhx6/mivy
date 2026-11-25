import SwiftUI
import UIKit
import FotoDocsCore
import FotoDocsDesign

public struct ExportView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: ExportViewModel

    public init(target: CaptureTarget, image: UIImage, hasOutfit: Bool = false) {
        _model = State(initialValue: ExportViewModel(target: target, image: image, hasOutfit: hasOutfit))
    }

    private struct Option {
        let mode: ExportMode
        let icon: String
        let title: String
        let desc: String
    }

    private var options: [Option] {
        [
            .init(mode: .print, icon: "printer.fill", title: "File in khổ 10×15",
                  desc: model.printInfoText),
            .init(mode: .digital, icon: "arrow.down.doc.fill", title: "File số nộp online",
                  desc: model.digitalInfoText),
            .init(mode: .ship, icon: "printer.dotmatrix.fill", title: "In ngay bằng máy in",
                  desc: "AirPrint · giấy ảnh 10×15 hoặc A4"),
        ]
    }

    public var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(spacing: 16) {
                    topBar
                    previewCard
                    VStack(spacing: 10) {
                        ForEach(options, id: \.mode) { optionCard($0) }
                    }
                    privacyNote
                    if model.unlocked {
                        PillButton(ctaLabel, systemImage: "square.and.arrow.down") { model.exportFile() }
                    } else {
                        paywall
                    }
                    if let note = model.statusNote {
                        Text(note).font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
            if model.isBusy {
                ProgressView().tint(FotoDocs.Palette.primary).padding(20).fotoCard()
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task { await model.loadStore() }
        .sheet(item: Binding(get: { model.shareItem }, set: { model.shareItem = $0 })) { item in
            FilePreviewSheet(url: item.url)
        }
    }

    private var topBar: some View {
        HStack(spacing: 14) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.bvp(.headline, .semibold))
                    .foregroundStyle(FotoDocs.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
            Text("Xuất ảnh").font(.bvp(.title3, .bold)).foregroundStyle(FotoDocs.Palette.textPrimary)
            Spacer()
        }
    }

    private var previewCard: some View {
        VStack(spacing: 12) {
            Image(uiImage: model.previewImage)
                .resizable().scaledToFit()
                .frame(maxHeight: 180)
                .clipShape(.rect(cornerRadius: 8))
                .shadow(color: FotoDocs.cardShadow, radius: 8, y: 4)
            Text(model.previewCaption).font(.bvp(.footnote, .semibold)).foregroundStyle(FotoDocs.Palette.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(18)
        .fotoCard()
    }

    private func optionCard(_ option: Option) -> some View {
        let selected = model.mode == option.mode
        return Button { model.mode = option.mode } label: {
            HStack(spacing: 14) {
                Image(systemName: option.icon)
                    .font(.bvp(size: 18))
                    .foregroundStyle(FotoDocs.Palette.primary)
                    .frame(width: 42, height: 42)
                    .background(FotoDocs.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(option.title).font(.bvp(.subheadline, .bold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                    Text(option.desc).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                Spacer(minLength: 6)
                if model.unlocked {
                    Image(systemName: "checkmark.seal.fill").font(.bvp(.subheadline)).foregroundStyle(FotoDocs.Palette.success)
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard(18)
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(FotoDocs.Palette.primary, lineWidth: selected ? 2 : 0))
        }
        .buttonStyle(.plain)
    }

    private var privacyNote: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.shield.fill").font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.success)
            Text("Ảnh xử lý trên máy, không tải lên máy chủ.")
                .font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
            Spacer()
        }
    }

    /// Not paid yet: buy this photo (clean HD files, every option), or take the watermarked file to try.
    private var paywall: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 8) {
                Text(model.product.title).font(.bvp(.headline, .bold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                ForEach(paywallPoints, id: \.self) { point in
                    Label {
                        Text(point).foregroundStyle(FotoDocs.Palette.textSecondary)
                    } icon: {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(FotoDocs.Palette.success)
                    }
                    .font(.bvp(.footnote))
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .fotoCard(18)
            PillButton("Mở khoá ảnh này · \(model.priceText)", systemImage: "lock.open.fill") {
                Task { await model.buyAndExport() }
            }
            .disabled(model.buying)
            Button("Tải bản xem thử (có watermark)") { model.exportFile() }
                .font(.bvp(.subheadline, .semibold))
                .foregroundStyle(FotoDocs.Palette.primary)
            Text("Trả 1 lần cho ảnh này, không đăng ký định kỳ.")
                .font(.bvp(.caption))
                .foregroundStyle(FotoDocs.Palette.textMuted)
        }
    }

    private var paywallPoints: [String] {
        var out = ["File in 10×15 và file số nộp online, không watermark", "Độ nét 300 dpi, đúng cỡ \(model.target.sizeText)"]
        if model.hasOutfit { out.insert("Ảnh mặc vest, không cần có vest thật", at: 0) }
        out.append("Tải lại bao nhiêu lần cũng được")
        return out
    }

    private var ctaLabel: String {
        switch model.mode {
        case .print: "Tải file in"
        case .digital: "Tải file số"
        case .ship: "In ngay"
        }
    }
}

/// UIActivityViewController bridge for sharing / saving the exported file.
struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
