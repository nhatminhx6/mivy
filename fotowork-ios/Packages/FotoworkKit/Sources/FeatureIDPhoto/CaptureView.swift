import SwiftUI
import PhotosUI
import FotoworkCore
import FotoworkDesign

public struct CaptureView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: CaptureViewModel
    @State private var pickedItem: PhotosPickerItem?
    @State private var showEdit = false

    public init(target: CaptureTarget) {
        _model = State(initialValue: CaptureViewModel(target: target))
    }

    public var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if model.cameraAvailable {
                CameraPreview(session: model.session)
                    .ignoresSafeArea()
                FaceGuideOverlay()
                    .allowsHitTesting(false)
            } else {
                FotoworkBackground()
                    .ignoresSafeArea()
            }

            VStack(spacing: 0) {
                topBar
                Spacer(minLength: 0)
                if model.cameraAvailable {
                    checksPanel
                    controls
                } else {
                    fallbackCard
                    Spacer(minLength: 0)
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 18)

            if model.capturedImage != nil {
                reviewOverlay
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .toolbar(.hidden, for: .tabBar)
        .task { await model.onAppear() }
        .onDisappear { model.onDisappear() }
        .onChange(of: pickedItem) { _, item in
            Task { await model.analyzePicked(item) }
        }
        .fullScreenCover(isPresented: $showEdit) {
            if let image = model.capturedImage {
                EditView(target: model.target, image: image)
            }
        }
    }

    // MARK: Fallback (no camera)

    private var fallbackCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 40))
                .foregroundStyle(Fotowork.Palette.link)
                .frame(width: 78, height: 78)
                .glassEffect(.regular, in: .circle)

            VStack(spacing: 6) {
                Text(model.permissionDenied ? "Chưa cấp quyền camera" : "Camera không khả dụng ở đây")
                    .font(.title3.bold())
                    .foregroundStyle(.white)
                Text(model.permissionDenied
                     ? "Bật quyền camera trong Cài đặt để chụp trực tiếp, hoặc chọn một ảnh có sẵn."
                     : "Trên máy thật sẽ mở camera. Giờ anh chọn một ảnh có sẵn để thử các bước.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            PhotosPicker(selection: $pickedItem, matching: .images) {
                HStack(spacing: 8) {
                    Image(systemName: "photo.on.rectangle")
                    Text("Chọn ảnh có sẵn").fontWeight(.semibold)
                }
                .font(.headline)
                .foregroundStyle(.white)
                .padding(.horizontal, 24)
                .padding(.vertical, 15)
                .background(Fotowork.heroGradient, in: .capsule)
                .shadow(color: Fotowork.Palette.heroStart.opacity(0.5), radius: 14, y: 6)
            }
            .padding(.top, 4)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .glassEffect(.regular, in: .rect(cornerRadius: Fotowork.Radius.card))
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.left")
                    .font(.headline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(width: 42, height: 42)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .buttonStyle(.plain)

            Spacer()

            VStack(spacing: 2) {
                Text(model.target.title)
                    .font(.headline)
                    .foregroundStyle(.white)
                Text("\(model.target.sizeText) · nền \(model.target.background)")
                    .font(.caption)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }

            Spacer()

            Color.clear.frame(width: 42, height: 42)
        }
        .padding(.top, 8)
    }

    // MARK: Checks

    private var checksPanel: some View {
        VStack(spacing: 12) {
            HStack {
                Text("\(model.result.passedCount)/\(model.result.total) tiêu chí")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                Label("Tự chụp khi đạt", systemImage: "wand.and.stars")
                    .font(.caption)
                    .foregroundStyle(Fotowork.Palette.textSecondary)
            }
            .padding(.horizontal, 4)

            FlowRow(spacing: 8) {
                ForEach(model.result.checks, id: \.label) { check in
                    CheckChip(label: check.label, ok: check.ok)
                }
            }
        }
        .padding(14)
        .glassEffect(.regular, in: .rect(cornerRadius: 22))
        .padding(.bottom, 16)
    }

    // MARK: Bottom controls

    private var controls: some View {
        HStack {
            PhotosPicker(selection: $pickedItem, matching: .images) {
                VStack(spacing: 5) {
                    Image(systemName: "photo.on.rectangle")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .glassEffect(.regular.interactive(), in: .circle)
                    Text("Ảnh có sẵn").font(.caption2).foregroundStyle(Fotowork.Palette.textSecondary)
                }
            }

            Spacer()

            Button {
                model.shutter()
            } label: {
                ZStack {
                    Circle().stroke(.white.opacity(0.9), lineWidth: 4).frame(width: 78, height: 78)
                    Circle().fill(.white).frame(width: 64, height: 64)
                }
            }
            .buttonStyle(.plain)
            .disabled(!model.cameraAvailable)
            .opacity(model.cameraAvailable ? 1 : 0.4)

            Spacer()

            Button {
                model.switchCamera()
            } label: {
                VStack(spacing: 5) {
                    Image(systemName: "arrow.triangle.2.circlepath.camera")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .frame(width: 52, height: 52)
                        .glassEffect(.regular.interactive(), in: .circle)
                    Text("Đổi").font(.caption2).foregroundStyle(Fotowork.Palette.textSecondary)
                }
            }
            .buttonStyle(.plain)
            .disabled(!model.cameraAvailable)
            .opacity(model.cameraAvailable ? 1 : 0.4)
        }
    }

    // MARK: Review

    private var reviewOverlay: some View {
        ZStack {
            FotoworkBackground()
            VStack(spacing: 18) {
                Text("Xem lại ảnh")
                    .font(.title3.bold())
                    .foregroundStyle(.white)

                if let image = model.capturedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 240, height: 240 / model.target.aspect)
                        .clipShape(.rect(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.2)))
                }

                HStack(spacing: 10) {
                    ForEach(model.result.checks, id: \.label) { check in
                        CheckChip(label: check.label, ok: check.ok)
                    }
                }
                .font(.caption2)

                HStack(spacing: 14) {
                    Button {
                        pickedItem = nil
                        model.retake()
                    } label: {
                        Text("Chụp lại")
                            .font(.headline)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24).padding(.vertical, 14)
                            .glassEffect(.regular.interactive(), in: .capsule)
                    }
                    .buttonStyle(.plain)

                    PillButton("Dùng ảnh này", systemImage: "arrow.right") {
                        showEdit = true
                    }
                }
                .padding(.top, 6)
            }
            .padding(28)
        }
        .ignoresSafeArea()
        .transition(.opacity)
    }
}

// MARK: - Small components

private struct CheckChip: View {
    let label: String
    let ok: Bool

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: ok ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(ok ? Fotowork.Palette.green : Fotowork.Palette.textSecondary)
            Text(label)
                .foregroundStyle(.white)
        }
        .font(.footnote.weight(.medium))
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .glassEffect(.regular, in: .capsule)
    }
}

/// Oval head guide with crown and chin markers, sized relative to the oval.
private struct FaceGuideOverlay: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let ovalW = min(w * 0.58, h * 0.40)
            let ovalH = ovalW * 1.3
            let cx = w / 2
            let cy = h * 0.42
            let lineW = ovalW * 1.22

            ZStack {
                Ellipse()
                    .stroke(.white.opacity(0.9), style: StrokeStyle(lineWidth: 2.5, dash: [9, 7]))
                    .frame(width: ovalW, height: ovalH)
                    .position(x: cx, y: cy)

                marker(y: cy - ovalH / 2, label: "đỉnh đầu", width: lineW, cx: cx)
                marker(y: cy + ovalH / 2, label: "cằm", width: lineW, cx: cx)
            }
        }
    }

    private func marker(y: CGFloat, label: String, width: CGFloat, cx: CGFloat) -> some View {
        ZStack(alignment: .topLeading) {
            Rectangle()
                .fill(.white.opacity(0.4))
                .frame(width: width, height: 1)
            Text(label)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.8))
                .offset(y: -15)
        }
        .frame(width: width, alignment: .leading)
        .position(x: cx, y: y)
    }
}

/// Minimal wrapping HStack so the four chips wrap to a second line on narrow widths.
private struct FlowRow: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var rowWidth: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if rowWidth + size.width > maxWidth, rowWidth > 0 {
                totalHeight += rowHeight + spacing
                rowWidth = 0
                rowHeight = 0
            }
            rowWidth += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        totalHeight += rowHeight
        return CGSize(width: maxWidth == .infinity ? rowWidth : maxWidth, height: totalHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX
        var y = bounds.minY
        var rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {
                x = bounds.minX
                y += rowHeight + spacing
                rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}
