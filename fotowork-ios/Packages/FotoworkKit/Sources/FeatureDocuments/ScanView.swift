import SwiftUI
import PhotosUI
import VisionKit
import FotoworkDesign

struct ScanView: View {
    @State private var pages: [UIImage] = []
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showScanner = false
    @State private var share: SharePayload?

    var body: some View {
        ZStack {
            FotoworkBackground()
            ScrollView {
                VStack(spacing: 18) {
                    Text("Quét tài liệu thành PDF nhiều trang. Trên máy thật dùng camera; ở đây anh chọn ảnh có sẵn.")
                        .font(.subheadline)
                        .foregroundStyle(Fotowork.Palette.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    HStack(spacing: 12) {
                        if VNDocumentCameraViewController.isSupported {
                            Button { showScanner = true } label: {
                                DocActionTile(title: "Quét camera", icon: "doc.viewfinder", tint: Fotowork.Palette.link)
                            }
                            .buttonStyle(.plain)
                        }
                        PhotosPicker(selection: $pickerItems, maxSelectionCount: 10, matching: .images) {
                            DocActionTile(title: "Chọn ảnh", icon: "photo.on.rectangle", tint: Fotowork.Palette.green)
                        }
                        .buttonStyle(.plain)
                    }

                    if !pages.isEmpty {
                        Text("\(pages.count) trang")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Fotowork.Palette.textPrimary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 10)], spacing: 10) {
                            ForEach(Array(pages.enumerated()), id: \.offset) { _, page in
                                Image(uiImage: page)
                                    .resizable().scaledToFill()
                                    .frame(width: 90, height: 120)
                                    .clipShape(.rect(cornerRadius: 10))
                            }
                        }
                        PillButton("Tạo PDF", systemImage: "doc.fill") { makePDF() }
                    }
                }
                .padding(20)
            }
        }
        .navigationTitle("Scan tài liệu")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(Fotowork.Palette.background, for: .navigationBar)
        .onChange(of: pickerItems) { _, items in Task { await loadPicked(items) } }
        .sheet(isPresented: $showScanner) {
            DocumentScanner { scanned in
                pages.append(contentsOf: scanned)
                showScanner = false
            } onCancel: {
                showScanner = false
            }
            .ignoresSafeArea()
        }
        .sheet(item: $share) { payload in ShareSheet(items: [payload.url]) }
    }

    private func loadPicked(_ items: [PhotosPickerItem]) async {
        var loaded: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) {
                loaded.append(ui)
            }
        }
        if !loaded.isEmpty { pages.append(contentsOf: loaded) }
        pickerItems = []
    }

    private func makePDF() {
        if let url = DocumentBuilder.imagesPDF(pages) {
            share = SharePayload(url: url)
        }
    }
}

private struct DocActionTile: View {
    let title: String
    let icon: String
    let tint: Color

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.title2).foregroundStyle(tint)
            Text(title).font(.subheadline.weight(.semibold)).foregroundStyle(Fotowork.Palette.textPrimary)
        }
        .frame(maxWidth: .infinity, minHeight: 92)
        .fotoCard(18)
    }
}

/// VisionKit document camera bridge (real device only).
struct DocumentScanner: UIViewControllerRepresentable {
    let onFinish: ([UIImage]) -> Void
    let onCancel: () -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let controller = VNDocumentCameraViewController()
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    final class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let parent: DocumentScanner
        init(_ parent: DocumentScanner) { self.parent = parent }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            var images: [UIImage] = []
            for index in 0..<scan.pageCount {
                images.append(scan.imageOfPage(at: index))
            }
            parent.onFinish(images)
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            parent.onCancel()
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            parent.onCancel()
        }
    }
}
