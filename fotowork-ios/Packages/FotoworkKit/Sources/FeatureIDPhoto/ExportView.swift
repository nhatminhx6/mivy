import SwiftUI
import UIKit
import FotoworkCore
import FotoworkDesign

public struct ExportView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: ExportViewModel

    public init(target: CaptureTarget, image: UIImage) {
        _model = State(initialValue: ExportViewModel(target: target, image: image))
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
                  desc: "8 ảnh 4×6 trên một tờ, in ở tiệm khoảng 3.000đ"),
            .init(mode: .digital, icon: "arrow.down.doc.fill", title: "File số nộp online",
                  desc: model.digitalInfoText),
            .init(mode: .ship, icon: "printer.dotmatrix.fill", title: "In ngay bằng máy in",
                  desc: "AirPrint · giấy ảnh 10×15 hoặc A4"),
        ]
    }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 16) {
                    topBar
                    previewCard
                    VStack(spacing: 10) {
                        ForEach(options, id: \.mode) { optionCard($0) }
                    }
                    privacyNote
                    PillButton(ctaLabel, systemImage: "square.and.arrow.down") { model.exportFile() }
                    if let note = model.statusNote {
                        Text(note).font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
            if model.isBusy {
                ProgressView().tint(Fotowork.Palette.primary).padding(20).fotoCard()
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: Binding(get: { model.shareItem }, set: { model.shareItem = $0 })) { item in
            ShareSheet(items: [item.url])
        }
    }

    private var topBar: some View {
        HStack(spacing: 14) {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.bvp(.headline, .semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
            Text("Xuất ảnh").font(.bvp(.title3, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
        }
    }

    private var previewCard: some View {
        VStack(spacing: 12) {
            Image(uiImage: model.image)
                .resizable().scaledToFit()
                .frame(maxHeight: 180)
                .clipShape(.rect(cornerRadius: 8))
                .shadow(color: Fotowork.cardShadow, radius: 8, y: 4)
            Text(model.previewCaption).font(.bvp(.footnote, .semibold)).foregroundStyle(Fotowork.Palette.textSecondary)
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
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 42, height: 42)
                    .background(Fotowork.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(option.title).font(.bvp(.subheadline, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
                    Text(option.desc).font(.bvp(.caption)).foregroundStyle(Fotowork.Palette.textSecondary)
                }
                Spacer(minLength: 6)
                Text("Miễn phí").font(.bvp(.caption, .bold)).foregroundStyle(Fotowork.Palette.success)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard(18)
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Fotowork.Palette.primary, lineWidth: selected ? 2 : 0))
        }
        .buttonStyle(.plain)
    }

    private var privacyNote: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.shield.fill").font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.success)
            Text("Ảnh xử lý trên máy, không tải lên máy chủ. Đang miễn phí để thử.")
                .font(.bvp(.caption)).foregroundStyle(Fotowork.Palette.textSecondary)
            Spacer()
        }
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
