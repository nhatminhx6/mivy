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
            ScrollView {
                VStack(spacing: 16) {
                    topBar
                    previewCard
                    segmented
                    controls
                    PillButton("Tiếp tục", systemImage: "arrow.right") { showExport = true }
                        .padding(.top, 4)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 28)
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
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
            Spacer()
            Text("Chỉnh ảnh").font(.title3.bold()).foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            Button { model.reset() } label: {
                Text("Đặt lại")
                    .font(.subheadline.weight(.semibold))
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
                    Text("\(model.passedCount)").font(.system(size: 30, weight: .bold)).foregroundStyle(Fotowork.Palette.success)
                    Text("/\(model.total) tiêu chí").font(.subheadline).foregroundStyle(Fotowork.Palette.textSecondary)
                }
                ProgressBar(value: Double(model.passedCount) / Double(max(model.total, 1)))
                if !model.hasPerson {
                    Text("Chưa thấy người trong ảnh")
                        .font(.caption)
                        .foregroundStyle(Fotowork.Palette.warning)
                }
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(model.checklist.prefix(4)) { item in
                        HStack(spacing: 6) {
                            Image(systemName: item.ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                                .font(.caption)
                                .foregroundStyle(item.ok ? Fotowork.Palette.success : Fotowork.Palette.warning)
                            Text(item.label).font(.caption).foregroundStyle(Fotowork.Palette.textPrimary).lineLimit(1)
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

    // MARK: Segmented

    private var segmented: some View {
        HStack(spacing: 4) {
            ForEach(EditTab.allCases) { item in
                Button { tab = item } label: {
                    Text(item.rawValue)
                        .font(.subheadline.weight(tab == item ? .bold : .semibold))
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
            Text("Màu nền").font(.subheadline.weight(.bold)).foregroundStyle(Fotowork.Palette.textPrimary)
            HStack(spacing: 16) {
                ForEach(BackgroundOption.allCases) { option in swatch(option) }
            }

            Text("Trang phục").font(.subheadline.weight(.bold)).foregroundStyle(Fotowork.Palette.textPrimary).padding(.top, 4)
            HStack(spacing: 10) {
                ForEach(OutfitOption.allCases) { option in outfitCell(option) }
            }
            if model.settings.outfit != .keep {
                Text("Bộ trang phục dùng template tạo sẵn — sẽ bổ sung sau.")
                    .font(.caption)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
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
                Text(option.label).font(.caption).fontWeight(.semibold).foregroundStyle(Fotowork.Palette.textPrimary)
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

    private func outfitCell(_ option: OutfitOption) -> some View {
        let selected = model.settings.outfit == option
        return Button { model.settings.outfit = option } label: {
            VStack(spacing: 6) {
                Image(systemName: "person.fill")
                    .font(.title2)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
                Text(option == .aodai ? "Áo dài" : option.label)
                    .font(.caption).fontWeight(.semibold)
                    .foregroundStyle(Fotowork.Palette.textPrimary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 84)
            .fotoCard(16)
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Fotowork.Palette.primary, lineWidth: selected ? 2 : 0))
            .overlay(alignment: .topTrailing) {
                if option == .aodai {
                    Text("PRO").font(.system(size: 10, weight: .bold)).foregroundStyle(.white)
                        .padding(.horizontal, 6).padding(.vertical, 1)
                        .background(Fotowork.Palette.pro, in: .rect(cornerRadius: 8))
                        .padding(6)
                }
            }
        }
        .buttonStyle(.plain)
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
            Text(title).font(.subheadline).foregroundStyle(Fotowork.Palette.textSecondary)
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
