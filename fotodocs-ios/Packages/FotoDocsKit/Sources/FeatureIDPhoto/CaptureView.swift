import SwiftUI
import PhotosUI
import FotoDocsCore
import FotoDocsDesign

public struct CaptureView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var model: CaptureViewModel
    @State private var pickedItem: PhotosPickerItem?
    @State private var showEdit = false

    public init(target: CaptureTarget) {
        _model = State(initialValue: CaptureViewModel(target: target))
    }

    private let ctrlFill = Color.white.opacity(0.16)
    private let ctrlStroke = Color.white.opacity(0.32)

    public var body: some View {
        ZStack {
            FotoDocs.Palette.cameraBg.ignoresSafeArea()

            if model.cameraAvailable {
                CameraPreview(session: model.session).ignoresSafeArea()
                FaceGuideOverlay().allowsHitTesting(false)
            }

            VStack(spacing: 0) {
                topBar
                Spacer(minLength: 0)
                if model.cameraAvailable {
                    checksRow
                    Text(model.target.infant ? "Đặt bé nằm ngửa trên ga trắng, chụp thẳng từ trên xuống" : "Giữ yên, tự chụp khi đạt")
                        .font(.bvp(.subheadline, .semibold))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.6), radius: 6)
                        .padding(.top, 10)
                        .padding(.bottom, 14)
                    controlBar
                } else {
                    fallbackCard
                    Spacer(minLength: 0)
                    controlBar
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 20)

            if model.capturedImage != nil {
                reviewOverlay
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .fotoHidesTabBar()
        .task { await model.onAppear() }
        .onDisappear { model.onDisappear() }
        .onChange(of: pickedItem) { _, item in Task { await model.analyzePicked(item) } }
        .fullScreenCover(isPresented: $showEdit) {
            if let image = model.capturedImage {
                EditView(target: model.target, image: image)
            }
        }
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack(spacing: 10) {
            closeButton

            Spacer()
            VStack(spacing: 1) {
                Text(model.target.title).font(.bvp(.subheadline, .bold)).foregroundStyle(.white)
                Text("\(model.target.sizeText) · nền \(model.target.background)")
                    .font(.bvp(.caption2)).foregroundStyle(.white.opacity(0.85))
            }
            .padding(.horizontal, 18)
            .frame(height: 48)
            .background(ctrlFill, in: .capsule)
            .overlay(Capsule().stroke(ctrlStroke))
            Spacer()

            Button {} label: {
                Image(systemName: "bolt.fill")
                    .font(.bvp(.headline, .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(ctrlFill, in: .circle)
                    .overlay(Circle().stroke(ctrlStroke))
            }
            .buttonStyle(.plain)
        }
        .padding(.top, 8)
    }

    // MARK: Checks

    private var checksRow: some View {
        HStack(spacing: 8) {
            ForEach(model.result.checks, id: \.label) { check in
                HStack(spacing: 6) {
                    Image(systemName: check.ok ? "checkmark" : "exclamationmark.triangle.fill")
                        .font(.bvp(.caption, .bold))
                        .foregroundStyle(check.ok ? FotoDocs.Palette.successBright : FotoDocs.Palette.warningSoft)
                    Text(check.label).font(.bvp(.caption, .semibold)).foregroundStyle(.white)
                }
                .padding(.horizontal, 12)
                .frame(height: 34)
                .background(ctrlFill, in: .capsule)
                .overlay(Capsule().stroke(ctrlStroke))
            }
        }
    }

    // MARK: Control bar

    private var controlBar: some View {
        HStack {
            PhotosPicker(selection: $pickedItem, matching: .images) {
                Image(systemName: "photo.on.rectangle")
                    .font(.bvp(.title3))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(ctrlFill, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(ctrlStroke))
            }

            Spacer()

            Button { model.shutter() } label: {
                ZStack {
                    Circle().stroke(.white.opacity(0.95), lineWidth: 4).frame(width: 80, height: 80)
                    Circle().fill(.white).frame(width: 62, height: 62)
                }
            }
            .buttonStyle(.plain)
            .disabled(!model.cameraAvailable)
            .opacity(model.cameraAvailable ? 1 : 0.4)

            Spacer()

            Button { model.switchCamera() } label: {
                Image(systemName: "arrow.triangle.2.circlepath.camera")
                    .font(.bvp(.title3))
                    .foregroundStyle(.white)
                    .frame(width: 52, height: 52)
                    .background(ctrlFill, in: .circle)
                    .overlay(Circle().stroke(ctrlStroke))
            }
            .buttonStyle(.plain)
            .disabled(!model.cameraAvailable)
            .opacity(model.cameraAvailable ? 1 : 0.4)
        }
        .padding(.horizontal, 22)
        .frame(height: 104)
        .background(ctrlFill, in: RoundedRectangle(cornerRadius: 40, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 40, style: .continuous).stroke(ctrlStroke))
    }

    // MARK: Fallback (no camera)

    private var fallbackCard: some View {
        VStack(spacing: 16) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.bvp(size: 40))
                .foregroundStyle(.white)
                .frame(width: 78, height: 78)
                .background(ctrlFill, in: .circle)
                .overlay(Circle().stroke(ctrlStroke))
            Text(model.permissionDenied ? "Chưa cấp quyền camera" : "Camera không khả dụng ở đây")
                .font(.bvp(.title3, .bold))
                .foregroundStyle(.white)
            Text(model.permissionDenied
                 ? "Bật quyền camera trong Cài đặt, hoặc chọn một ảnh có sẵn."
                 : model.target.infant
                    ? "Chọn ảnh bé nằm ngửa trên ga trắng. App tự xoay ảnh cho mặt bé thẳng."
                    : "Không mở được camera. Bạn có thể chọn một ảnh có sẵn.")
                .font(.bvp(.subheadline))
                .multilineTextAlignment(.center)
                .foregroundStyle(.white.opacity(0.8))
                .fixedSize(horizontal: false, vertical: true)

            PhotosPicker(selection: $pickedItem, matching: .images) {
                HStack(spacing: 8) {
                    Image(systemName: "photo.on.rectangle")
                    Text("Chọn ảnh có sẵn").fontWeight(.bold)
                }
                .font(.bvp(.headline, .semibold))
                .foregroundStyle(FotoDocs.Palette.primary)
                .padding(.horizontal, 24)
                .frame(height: 52)
                .background(.white, in: .capsule)
            }
            .padding(.top, 4)
        }
        .padding(28)
        .frame(maxWidth: .infinity)
        .background(ctrlFill, in: RoundedRectangle(cornerRadius: FotoDocs.Radius.hero, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: FotoDocs.Radius.hero, style: .continuous).stroke(ctrlStroke))
    }

    private var closeButton: some View {
        Button { dismiss() } label: {
            Image(systemName: "xmark")
                .font(.bvp(.headline, .semibold))
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(ctrlFill, in: .circle)
                .overlay(Circle().stroke(ctrlStroke))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Đóng")
    }

    // MARK: Review

    private var reviewOverlay: some View {
        ZStack {
            FotoDocs.Palette.cameraBg.ignoresSafeArea()
            VStack(spacing: 18) {
                Text("Xem lại ảnh").font(.bvp(.title3, .bold)).foregroundStyle(.white)
                if let image = model.capturedImage {
                    Image(uiImage: image)
                        .resizable().scaledToFill()
                        .frame(width: 240, height: 240 / model.target.aspect)
                        .clipShape(.rect(cornerRadius: 18))
                        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.white.opacity(0.2)))
                }
                HStack(spacing: 14) {
                    Button {
                        pickedItem = nil
                        model.retake()
                    } label: {
                        Text("Chụp lại")
                            .font(.bvp(.headline, .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 24).frame(height: 52)
                            .background(ctrlFill, in: .capsule)
                            .overlay(Capsule().stroke(ctrlStroke))
                    }
                    .buttonStyle(.plain)

                    Button { showEdit = true } label: {
                        HStack(spacing: 8) { Text("Dùng ảnh này").fontWeight(.bold); Image(systemName: "arrow.right") }
                            .font(.bvp(.headline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.primary)
                            .padding(.horizontal, 24).frame(height: 52)
                            .background(.white, in: .capsule)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 6)
            }
            .padding(28)
        }
        .overlay(alignment: .topLeading) {
            closeButton.padding(.horizontal, 16).padding(.top, 8)
        }
    }
}

/// Oval head guide with crown and chin markers (over the live camera).
private struct FaceGuideOverlay: View {
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            let ovalW = min(w * 0.58, h * 0.40)
            let ovalH = ovalW * 1.3
            let cx = w / 2
            let cy = h * 0.42
            let lineW = ovalW * 1.3

            ZStack {
                Ellipse()
                    .stroke(.white.opacity(0.9), style: StrokeStyle(lineWidth: 2.5, dash: [9, 7]))
                    .frame(width: ovalW, height: ovalH)
                    .position(x: cx, y: cy)

                marker(y: cy - ovalH / 2, label: "Đỉnh đầu", width: lineW, cx: cx)
                marker(y: cy + ovalH / 2, label: "Cằm", width: lineW, cx: cx)
            }
        }
    }

    private func marker(y: CGFloat, label: String, width: CGFloat, cx: CGFloat) -> some View {
        ZStack {
            Rectangle().fill(.white.opacity(0.45)).frame(width: width, height: 1.5)
            Text(label)
                .font(.bvp(.caption2, .semibold))
                .foregroundStyle(.white)
                .padding(.horizontal, 10).padding(.vertical, 4)
                .background(.white.opacity(0.16), in: .capsule)
                .position(x: cx + width / 2 - 34, y: y - 16)
        }
        .frame(width: width, height: 1)
        .position(x: cx, y: y)
    }
}
