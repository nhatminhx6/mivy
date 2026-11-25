import SwiftUI
import PhotosUI
import VisionKit
import FotoDocsDesign

struct ScanView: View {
    @State private var pages: [UIImage] = []
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showScanner = false
    @State private var share: SharePayload?

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(spacing: 18) {
                    Text("Quét tài liệu thành PDF nhiều trang. Nếu không mở được camera, bạn có thể chọn ảnh có sẵn.")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    HStack(spacing: 12) {
                        if DocumentScanner.isAvailable {
                            Button {
                                if let fake = DocumentScanner.simulated(["cccd-fake", "passport-fake"]) { pages += fake } else { showScanner = true }
                            } label: {
                                DocActionTile(title: "Quét camera", icon: "doc.viewfinder", tint: FotoDocs.Palette.link)
                            }
                            .buttonStyle(.plain)
                        }
                        PhotosPicker(selection: $pickerItems, maxSelectionCount: 10, matching: .images) {
                            DocActionTile(title: "Chọn ảnh", icon: "photo.on.rectangle", tint: FotoDocs.Palette.green)
                        }
                        .buttonStyle(.plain)
                    }

                    if !pages.isEmpty {
                        Text("\(pages.count) trang")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.textPrimary)
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
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
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
        .sheet(item: $share) { payload in FilePreviewSheet(url: payload.url) }
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

struct DocActionTile: View {
    let title: String
    let icon: String
    let tint: Color

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon).font(.bvp(.title2)).foregroundStyle(tint)
            Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
        }
        .frame(maxWidth: .infinity, minHeight: 92)
        .fotoCard(18)
    }
}

/// VisionKit document camera bridge (real device only).
struct DocumentScanner: UIViewControllerRepresentable {
    /// The camera button is shown on a device that has the document camera, and always on the simulator
    /// (where the "camera" hands back sample pictures instead, see `simulated`).
    static var isAvailable: Bool {
        #if targetEnvironment(simulator)
        true
        #else
        VNDocumentCameraViewController.isSupported
        #endif
    }

    /// Simulator only: what the camera "scans" — fake documents from the repo's `Tests/Fixtures` (the simulator
    /// reads the Mac's disk), so the whole flow runs without a phone. Nil on a device: open the real camera.
    static func simulated(_ fixtures: [String]) -> [UIImage]? {
        #if targetEnvironment(simulator)
        let dir = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Tests/Fixtures")
        let pages = fixtures.compactMap { UIImage(contentsOfFile: dir.appendingPathComponent($0 + ".jpg").path) }
        return pages.isEmpty ? nil : pages
        #else
        nil
        #endif
    }

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
