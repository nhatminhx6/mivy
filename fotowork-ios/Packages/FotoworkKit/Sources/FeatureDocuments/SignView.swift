import SwiftUI
import PhotosUI
import PencilKit
import FotoworkDesign

struct SignView: View {
    @State private var item: PhotosPickerItem?
    @State private var document: UIImage?
    @State private var canvasView = PKCanvasView()
    @State private var share: SharePayload?

    var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 16) {
                    Text("Chọn tài liệu rồi ký trực tiếp lên đó bằng bút/ngón tay, xuất ra PDF.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    if let document {
                        documentCanvas(document)
                        HStack(spacing: 14) {
                            Button {
                                canvasView.drawing = PKDrawing()
                            } label: {
                                Text("Xoá chữ ký")
                                    .font(.bvp(.headline, .semibold))
                                    .foregroundStyle(Fotowork.Palette.primary)
                                    .padding(.horizontal, 20).frame(height: 52)
                                    .fotoCardCapsule()
                            }
                            .buttonStyle(.plain)

                            PillButton("Lưu PDF", systemImage: "square.and.arrow.down") {
                                exportSigned(document)
                            }
                        }
                    } else {
                        PhotosPicker(selection: $item, matching: .images) {
                            VStack(spacing: 10) {
                                Image(systemName: "doc.badge.plus").font(.bvp(size: 40))
                                Text("Chọn tài liệu").font(.bvp(.subheadline))
                            }
                            .foregroundStyle(Fotowork.Palette.textSecondary)
                            .frame(maxWidth: .infinity, minHeight: 220)
                            .fotoCard()
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Ký tên")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(Fotowork.Palette.background, for: .navigationBar)
        .onChange(of: item) { _, newItem in Task { await loadDocument(newItem) } }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private func documentCanvas(_ document: UIImage) -> some View {
        let aspect = document.size.width / max(document.size.height, 1)
        return ZStack {
            Image(uiImage: document)
                .resizable()
                .scaledToFit()
            SignatureCanvas(canvasView: $canvasView)
        }
        .aspectRatio(aspect, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(.white.opacity(0.18)))
    }

    private func loadDocument(_ item: PhotosPickerItem?) async {
        guard let item, let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) else { return }
        document = ui
        canvasView.drawing = PKDrawing()
    }

    private func exportSigned(_ document: UIImage) {
        let bounds = canvasView.bounds
        guard bounds.width > 0 else { return }
        let signature = canvasView.drawing.image(from: bounds, scale: 3)
        if let url = DocumentBuilder.signed(document: document, signature: signature) {
            share = SharePayload(url: url)
        }
    }
}

/// PencilKit canvas with a transparent background for drawing a signature.
struct SignatureCanvas: UIViewRepresentable {
    @Binding var canvasView: PKCanvasView

    func makeUIView(context: Context) -> PKCanvasView {
        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false
        canvasView.drawingPolicy = .anyInput
        canvasView.tool = PKInkingTool(.pen, color: .black, width: 4)
        return canvasView
    }

    func updateUIView(_ uiView: PKCanvasView, context: Context) {}
}
