import SwiftUI
import UIKit
import FotozCore
import FotozDesign

public struct ExportView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: ExportViewModel

    public init(target: CaptureTarget, image: UIImage) {
        _model = State(initialValue: ExportViewModel(target: target, image: image))
    }

    public var body: some View {
        ZStack {
            FotozBackground()
            ScrollView {
                VStack(spacing: 18) {
                    topBar
                    thumbnail
                    downloadMode
                    options
                    if let note = model.statusNote {
                        Text(note)
                            .font(.footnote)
                            .foregroundStyle(Fotoz.Palette.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    disclaimer
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
            if model.isBusy {
                ProgressView().tint(.white)
                    .padding(20)
                    .glassEffect(.regular, in: .rect(cornerRadius: 16))
            }
        }
        .task { await model.onAppear() }
        .sheet(item: Binding(get: { model.shareItem }, set: { model.shareItem = $0 })) { item in
            ActivityView(items: [item.url])
        }
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .buttonStyle(.plain)
            Spacer()
            VStack(spacing: 2) {
                Text("Xuất ảnh").font(.headline).foregroundStyle(.white)
                Text(model.target.title).font(.caption).foregroundStyle(Fotoz.Palette.textSecondary)
            }
            Spacer()
            Color.clear.frame(width: 42, height: 42)
        }
        .padding(.top, 8)
    }

    private var thumbnail: some View {
        Image(uiImage: model.image)
            .resizable()
            .scaledToFit()
            .frame(maxHeight: 180)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.18)))
    }

    private var downloadMode: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Bản tải").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
            HStack(spacing: 10) {
                modeChip(title: "Có logo", subtitle: "Miễn phí", selected: !model.hd) {
                    model.hd = false
                }
                modeChip(
                    title: "HD · gỡ logo",
                    subtitle: model.store.priceText ?? "Pro",
                    selected: model.hd
                ) {
                    model.hd = true
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func modeChip(title: String, subtitle: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                Text(subtitle).font(.caption).foregroundStyle(selected ? .white.opacity(0.85) : Fotoz.Palette.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .glassEffect(selected ? .regular.tint(Fotoz.Palette.heroMid).interactive() : .regular.interactive(),
                         in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
    }

    private var options: some View {
        VStack(spacing: 12) {
            optionCard(
                icon: "printer.fill",
                tint: Fotoz.Palette.green,
                title: "File in 10×15",
                subtitle: "Dàn nhiều ảnh trên tờ 10×15 cm để in"
            ) { model.export(.print10x15) }

            optionCard(
                icon: "square.and.arrow.up.on.square",
                tint: Fotoz.Palette.link,
                title: "File số nộp online",
                subtitle: model.digitalInfoText
            ) { model.export(.digital) }

            optionCard(
                icon: "shippingbox.fill",
                tint: Fotoz.Palette.orange,
                title: "In & giao tận nhà",
                subtitle: "Sắp có",
                disabled: true
            ) {}
        }
    }

    private func optionCard(
        icon: String,
        tint: Color,
        title: String,
        subtitle: String,
        disabled: Bool = false,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(tint)
                    .frame(width: 48, height: 48)
                    .background(tint.opacity(0.18), in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.headline).foregroundStyle(.white)
                    Text(subtitle).font(.footnote).foregroundStyle(Fotoz.Palette.textSecondary)
                }
                Spacer()
                if !disabled {
                    Image(systemName: "chevron.right").foregroundStyle(Fotoz.Palette.textSecondary)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 20))
            .opacity(disabled ? 0.5 : 1)
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }

    private var disclaimer: some View {
        Text("Kích thước theo hướng dẫn của cơ quan lãnh sự. Fotoz không đảm bảo 100% đạt chuẩn — hãy kiểm tra lại trước khi nộp.")
            .font(.caption2)
            .foregroundStyle(Fotoz.Palette.textSecondary)
            .multilineTextAlignment(.center)
            .padding(.top, 6)
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
