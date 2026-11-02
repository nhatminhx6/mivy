import SwiftUI
import FotoworkCore
import FotoworkImaging
import FotoworkDesign

public struct EditView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: EditViewModel
    @State private var tab: EditTab = .background
    @State private var showExport = false

    enum EditTab: String, CaseIterable, Identifiable {
        case background = "Nền & áo"
        case light = "Ánh sáng"
        case crop = "Cắt khung"
        var id: String { rawValue }
    }

    public init(target: CaptureTarget, image: UIImage) {
        _model = State(initialValue: EditViewModel(target: target, image: image))
    }

    public var body: some View {
        ZStack {
            FotoworkBackground()
            // the preview stays pinned so every slider change is visible
            VStack(spacing: 12) {
                VStack(spacing: 12) {
                    topBar
                    previewCard
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                ScrollView {
                    VStack(spacing: 16) {
                        segmented
                        controls
                        PillButton("Tiếp tục", systemImage: "arrow.right") { showExport = true }
                            .padding(.top, 4)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 4)
                    .padding(.bottom, 28)
                }
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .task { await model.onAppear() }
        .fullScreenCover(isPresented: $showExport) {
            if let image = model.preview {
                ExportView(target: model.target, image: image)
            }
        }
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.bvp(.headline, .semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
            Spacer()
            Text("Chỉnh ảnh").font(.bvp(.title3, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            Button { model.reset() } label: {
                Text("Đặt lại")
                    .font(.bvp(.subheadline, .semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .padding(.horizontal, 16)
                    .frame(height: 48)
                    .fotoCardCapsule()
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: Preview + score

    private var previewCard: some View {
        HStack(spacing: 16) {
            ZStack {
                if let image = model.preview {
                    Image(uiImage: image).resizable().scaledToFill()
                } else {
                    Fotowork.Palette.track
                }
                if model.isProcessing { ProgressView().tint(Fotowork.Palette.primary) }
            }
            .frame(width: 128, height: 128 / model.target.aspect)
            .clipShape(.rect(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Fotowork.Palette.border))

            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(model.passedCount)").font(.bvp(size: 30, .bold)).foregroundStyle(Fotowork.Palette.success)
                    Text("/\(model.total) tiêu chí").font(.bvp(.subheadline)).foregroundStyle(Fotowork.Palette.textSecondary)
                }
                ProgressBar(value: Double(model.passedCount) / Double(max(model.total, 1)))
                if let note = statusNote {
                    Text(note)
                        .font(.bvp(.caption))
                        .foregroundStyle(Fotowork.Palette.warning)
                        .fixedSize(horizontal: false, vertical: true)
                }
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(model.checklist.prefix(4)) { item in
                        HStack(spacing: 6) {
                            Image(systemName: item.ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                .font(.bvp(.caption))
                                .foregroundStyle(item.ok ? Fotowork.Palette.success : Fotowork.Palette.warning)
                            Text(item.label).font(.bvp(.caption)).foregroundStyle(Fotowork.Palette.textPrimary).lineLimit(1)
                        }
                    }
                }
                .padding(.top, 2)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .fotoCard()
    }

    /// Shown only when the picture does not match what the checklist would suggest.
    private var statusNote: String? {
        guard !model.isProcessing || model.preview != nil else { return nil }
        if !model.faceFound { return "Chưa thấy khuôn mặt trong ảnh" }
        if !model.backgroundApplied { return "Chưa thay được nền cho ảnh này" }
        return nil
    }

    // MARK: Segmented

    private var segmented: some View {
        HStack(spacing: 4) {
            ForEach(EditTab.allCases) { item in
                Button { tab = item } label: {
                    Text(item.rawValue)
                        .font(tab == item ? .bvp(.subheadline, .bold) : .bvp(.subheadline, .semibold))
                        .foregroundStyle(tab == item ? Fotowork.Palette.primary : Fotowork.Palette.textSecondary)
                        .frame(maxWidth: .infinity)
                        .frame(height: 38)
                        .background(tab == item ? Fotowork.Palette.primaryTint : .clear, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(5)
        .fotoCard(16)
    }

    // MARK: Controls

    @ViewBuilder
    private var controls: some View {
        switch tab {
        case .background: backgroundControls
        case .light: lightControls
        case .crop: cropControls
        }
    }

    private var backgroundControls: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Màu nền").font(.bvp(.subheadline, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
            HStack(spacing: 16) {
                ForEach(BackgroundOption.allCases) { option in swatch(option) }
            }

            Text("Trang phục").font(.bvp(.subheadline, .bold)).foregroundStyle(Fotowork.Palette.textPrimary).padding(.top, 4)
            HStack(spacing: 10) {
                ForEach(OutfitOption.allCases) { outfitCell($0) }
            }
            if model.settings.outfit != .keep && model.outfitMissing {
                Text("Chưa ghép được áo — cần ảnh chính diện, thấy rõ cằm.")
                    .font(.bvp(.caption))
                    .foregroundStyle(Fotowork.Palette.warning)
            }
            if model.settings.outfit != .keep && !model.outfitMissing {
                outfitTuningCard.padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// Manual touch-up of the automatic outfit fit: head size / height, neck colour.
    private var outfitTuningCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Tinh chỉnh ghép áo").font(.bvp(.subheadline, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
                Spacer()
                if !model.settings.outfitTuning.isDefault {
                    Button("Mặc định") { model.settings.outfitTuning = OutfitTuning() }
                        .font(.bvp(.footnote, .semibold))
                        .foregroundStyle(Fotowork.Palette.primary)
                }
            }
            tuningRow("Cỡ đầu", "Nhỏ", "To", \.headScale, 0.85...1.15)
            tuningRow("Vị trí đầu", "Thấp", "Cao", \.headLift, -0.1...0.1)
            tuningRow("Độ sáng cổ", "Tối", "Sáng", \.neckBrightness, -0.2...0.2)
            tuningRow("Màu da cổ", "Lạnh", "Ấm", \.neckWarmth, -1...1)
        }
        .padding(16)
        .fotoCard()
    }

    private func tuningRow(_ title: String, _ low: String, _ high: String,
                           _ key: WritableKeyPath<OutfitTuning, Double>, _ range: ClosedRange<Double>) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.bvp(.subheadline)).foregroundStyle(Fotowork.Palette.textSecondary)
            HStack(spacing: 10) {
                Text(low).font(.bvp(.caption)).foregroundStyle(Fotowork.Palette.textMuted).frame(width: 34, alignment: .leading)
                Slider(value: Binding(get: { model.settings.outfitTuning[keyPath: key] },
                                      set: { model.settings.outfitTuning[keyPath: key] = $0 }), in: range)
                    .tint(Fotowork.Palette.primary)
                Text(high).font(.bvp(.caption)).foregroundStyle(Fotowork.Palette.textMuted).frame(width: 34, alignment: .trailing)
            }
        }
    }

    private func outfitCell(_ option: OutfitOption) -> some View {
        let selected = model.settings.outfit == option
        return Button { model.settings.outfit = option } label: {
            VStack(spacing: 6) {
                Group {
                    if option == .keep {
                        Image(systemName: "person.fill")
                            .font(.bvp(.title2))
                            .foregroundStyle(Fotowork.Palette.textSecondary)
                    } else if let thumb = OutfitThumbnails.image(for: option) {
                        Image(uiImage: thumb).resizable().scaledToFit()
                    } else {
                        Image(systemName: "tshirt").font(.bvp(.title2)).foregroundStyle(Fotowork.Palette.textSecondary)
                    }
                }
                .frame(height: 50)
                Text(option.label)
                    .font(.bvp(.caption, .semibold))
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            .padding(.horizontal, 4)
            .frame(maxWidth: .infinity)
            .frame(height: 92)
            .fotoCard(16)
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Fotowork.Palette.primary, lineWidth: selected ? 2 : 0))
        }
        .buttonStyle(.plain)
    }

    private func swatch(_ option: BackgroundOption) -> some View {
        let selected = model.settings.background == option
        return Button { model.settings.background = option } label: {
            VStack(spacing: 6) {
                Group {
                    if let rgb = swatchRGB(option) {
                        Circle().fill(Color(.sRGB, red: rgb.0, green: rgb.1, blue: rgb.2))
                    } else {
                        Image(systemName: "photo").foregroundStyle(Fotowork.Palette.textSecondary)
                            .frame(width: 46, height: 46).background(Fotowork.Palette.track, in: .circle)
                    }
                }
                .frame(width: 46, height: 46)
                .overlay(Circle().stroke(selected ? Fotowork.Palette.primary : Fotowork.Palette.borderStrong, lineWidth: selected ? 3 : 1))
                Text(option.label).font(.bvp(.caption)).fontWeight(.semibold).foregroundStyle(Fotowork.Palette.textPrimary)
            }
        }
        .buttonStyle(.plain)
    }

    private func swatchRGB(_ option: BackgroundOption) -> (Double, Double, Double)? {
        switch option {
        case .white: (1, 1, 1)
        case .blue: (0.29, 0.525, 0.851)
        case .gray: (0.788, 0.804, 0.831)
        case .original: nil
        }
    }

    private var lightControls: some View {
        VStack(alignment: .leading, spacing: 18) {
            sliderRow(title: "Độ sáng", value: Binding(get: { model.settings.brightness }, set: { model.settings.brightness = $0 }), range: -0.3...0.3)
            sliderRow(title: "Tương phản", value: Binding(get: { model.settings.contrast }, set: { model.settings.contrast = $0 }), range: 0.8...1.2)
        }
        .padding(16)
        .fotoCard()
    }

    private var cropControls: some View {
        VStack(alignment: .leading, spacing: 18) {
            sliderRow(title: "Thu phóng", value: Binding(get: { model.settings.zoom }, set: { model.settings.zoom = $0 }), range: 1.0...1.6)
            sliderRow(title: "Dời dọc", value: Binding(get: { model.settings.offsetY }, set: { model.settings.offsetY = $0 }), range: -0.2...0.2)
        }
        .padding(16)
        .fotoCard()
    }

    private func sliderRow(title: String, value: Binding<Double>, range: ClosedRange<Double>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.bvp(.subheadline)).foregroundStyle(Fotowork.Palette.textSecondary)
            Slider(value: value, in: range).tint(Fotowork.Palette.primary)
        }
    }
}

struct ProgressBar: View {
    let value: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(Fotowork.Palette.track)
                Capsule().fill(Fotowork.Palette.success)
                    .frame(width: max(0, min(1, value)) * geo.size.width)
            }
        }
        .frame(height: 6)
    }
}

/// Small previews of the bundled garment templates for the outfit picker.
@MainActor
enum OutfitThumbnails {
    private static var cache: [OutfitOption: UIImage] = [:]

    static func image(for option: OutfitOption) -> UIImage? {
        if let hit = cache[option] { return hit }
        guard let name = option.templateAsset,
              let url = BodyTemplate.bundleURL(name),
              let full = UIImage(contentsOfFile: url.path)?.cgImage else { return nil }
        // the suit only (the model's head is never shown): bottom 40% of the body image
        let h = full.height * 2 / 5
        guard let suit = full.cropping(to: CGRect(x: full.width / 8, y: full.height - h, width: full.width * 3 / 4, height: h)) else { return nil }
        let size = CGSize(width: 120, height: 120 * Double(suit.height) / Double(max(suit.width, 1)))
        let thumb = UIGraphicsImageRenderer(size: size).image { _ in UIImage(cgImage: suit).draw(in: CGRect(origin: .zero, size: size)) }
        cache[option] = thumb
        return thumb
    }
}
