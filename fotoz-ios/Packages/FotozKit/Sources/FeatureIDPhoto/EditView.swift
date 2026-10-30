import SwiftUI
import FotozCore
import FotozImaging
import FotozDesign

public struct EditView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: EditViewModel
    @State private var tab: Tab = .background
    @State private var showChecklist = false
    @State private var showExport = false

    enum Tab: String, CaseIterable, Identifiable {
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
            FotozBackground()
            VStack(spacing: 16) {
                topBar
                previewArea
                scoreCard
                Picker("", selection: $tab) {
                    ForEach(Tab.allCases) { Text($0.rawValue).tag($0) }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, 20)

                controls
                    .padding(.horizontal, 20)

                Spacer(minLength: 0)

                PillButton("Xuất ảnh", systemImage: "arrow.right") {
                    showExport = true
                }
                .padding(.bottom, 10)
            }
            .padding(.top, 8)
        }
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
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()
            VStack(spacing: 2) {
                Text("Chỉnh ảnh").font(.headline).foregroundStyle(.white)
                Text("\(model.target.sizeText) · nền \(model.target.background)")
                    .font(.caption).foregroundStyle(Fotoz.Palette.textSecondary)
            }
            Spacer()
            Color.clear.frame(width: 42, height: 42)
        }
        .padding(.horizontal, 20)
    }

    // MARK: Preview

    private var previewArea: some View {
        ZStack {
            if let image = model.preview {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 300)
                    .clipShape(.rect(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(.white.opacity(0.18)))
            } else {
                RoundedRectangle(cornerRadius: 16)
                    .fill(.white.opacity(0.05))
                    .frame(width: 210, height: 210 / model.target.aspect)
            }
            if model.isProcessing {
                ProgressView().tint(.white)
            }
        }
        .frame(maxHeight: 300)
        .padding(.horizontal, 20)
    }

    // MARK: Score

    private var scoreCard: some View {
        VStack(spacing: 0) {
            Button { withAnimation(.snappy) { showChecklist.toggle() } } label: {
                HStack {
                    Text("\(model.passedCount)/\(model.total) tiêu chí")
                        .font(.headline).foregroundStyle(.white)
                    if !model.hasPerson {
                        Text("· chưa thấy người")
                            .font(.caption).foregroundStyle(Fotoz.Palette.orange)
                    }
                    Spacer()
                    Image(systemName: showChecklist ? "chevron.up" : "chevron.down")
                        .foregroundStyle(Fotoz.Palette.textSecondary)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .buttonStyle(.plain)

            if showChecklist {
                VStack(spacing: 8) {
                    ForEach(model.checklist) { item in
                        HStack(spacing: 10) {
                            Image(systemName: item.ok ? (item.advisory ? "checkmark.circle" : "checkmark.circle.fill") : "exclamationmark.circle")
                                .foregroundStyle(item.ok ? Fotoz.Palette.green : Fotoz.Palette.orange)
                            Text(item.label).font(.subheadline).foregroundStyle(.white)
                            Spacer()
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 14)
            }
        }
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
        .padding(.horizontal, 20)
    }

    // MARK: Controls per tab

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
            Text("Màu nền").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
            HStack(spacing: 12) {
                ForEach(BackgroundOption.allCases) { option in
                    backgroundSwatch(option)
                }
            }

            Text("Trang phục").font(.subheadline.weight(.semibold)).foregroundStyle(.white)
                .padding(.top, 4)
            FlowChips {
                ForEach(OutfitOption.allCases) { option in
                    OutfitChip(
                        label: option == .aodai ? "Áo dài · Pro" : option.label,
                        selected: model.settings.outfit == option
                    ) {
                        model.settings.outfit = option
                    }
                }
            }
            if model.settings.outfit != .keep {
                Label("Bộ trang phục dùng template tạo sẵn — sẽ bổ sung sau khi anh duyệt gu.",
                      systemImage: "sparkles")
                    .font(.caption)
                    .foregroundStyle(Fotoz.Palette.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func backgroundSwatch(_ option: BackgroundOption) -> some View {
        let selected = model.settings.background == option
        return Button {
            model.settings.background = option
        } label: {
            VStack(spacing: 6) {
                ZStack {
                    if let rgb = swatchRGB(option) {
                        Circle().fill(Color(.sRGB, red: rgb.0, green: rgb.1, blue: rgb.2))
                    } else {
                        Image(systemName: "photo")
                            .foregroundStyle(.white)
                            .frame(width: 48, height: 48)
                            .background(.white.opacity(0.1), in: .circle)
                    }
                }
                .frame(width: 48, height: 48)
                .overlay(Circle().stroke(selected ? Fotoz.Palette.link : .white.opacity(0.25), lineWidth: selected ? 3 : 1))
                Text(option.label).font(.caption).foregroundStyle(Fotoz.Palette.textSecondary)
            }
        }
        .buttonStyle(.plain)
    }

    private func swatchRGB(_ option: BackgroundOption) -> (Double, Double, Double)? {
        switch option {
        case .white: (1, 1, 1)
        case .blue: (0.227, 0.431, 0.647)
        case .gray: (0.788, 0.804, 0.839)
        case .original: nil
        }
    }

    private var lightControls: some View {
        VStack(alignment: .leading, spacing: 18) {
            sliderRow(title: "Độ sáng", value: Binding(
                get: { model.settings.brightness },
                set: { model.settings.brightness = $0 }
            ), range: -0.3...0.3)
            sliderRow(title: "Tương phản", value: Binding(
                get: { model.settings.contrast },
                set: { model.settings.contrast = $0 }
            ), range: 0.8...1.2)
        }
    }

    private var cropControls: some View {
        VStack(alignment: .leading, spacing: 18) {
            sliderRow(title: "Thu phóng", value: Binding(
                get: { model.settings.zoom },
                set: { model.settings.zoom = $0 }
            ), range: 1.0...1.6)
            sliderRow(title: "Dời dọc", value: Binding(
                get: { model.settings.offsetY },
                set: { model.settings.offsetY = $0 }
            ), range: -0.2...0.2)
        }
    }

    private func sliderRow(title: String, value: Binding<Double>, range: ClosedRange<Double>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.subheadline).foregroundStyle(Fotoz.Palette.textSecondary)
            Slider(value: value, in: range).tint(Fotoz.Palette.link)
        }
    }
}

// MARK: - Small components

private struct OutfitChip: View {
    let label: String
    let selected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(selected ? .white : Fotoz.Palette.textSecondary)
                .padding(.horizontal, 16)
                .padding(.vertical, 9)
                .glassEffect(selected ? .regular.tint(Fotoz.Palette.heroMid).interactive() : .regular.interactive(), in: .capsule)
        }
        .buttonStyle(.plain)
    }
}

/// Simple wrapping row for the outfit chips.
private struct FlowChips<Content: View>: View {
    @ViewBuilder let content: Content
    var body: some View {
        HStack(spacing: 8) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
