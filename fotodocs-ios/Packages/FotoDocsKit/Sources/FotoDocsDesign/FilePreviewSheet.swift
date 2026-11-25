import SwiftUI
import QuickLook

/// What the user sees after "Tải file …": the exported file itself (PDF pages, the print sheet, the Excel table…)
/// so they can check it before sending, with Share / Save in the corner. Replaces opening the share sheet blind.
public struct FilePreviewSheet: View {
    private let url: URL
    @Environment(\.dismiss) private var dismiss

    public init(url: URL) { self.url = url }

    public var body: some View {
        NavigationStack {
            QuickLookView(url: url)
                .ignoresSafeArea(edges: .bottom)
                .navigationTitle(url.lastPathComponent)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dismiss() } }
                    ToolbarItem(placement: .primaryAction) {
                        ShareLink(item: url) { Label("Lưu / Gửi", systemImage: "square.and.arrow.up") }
                    }
                }
        }
    }
}

/// QLPreviewController for one local file (PDF, JPEG, XLSX…), rendered by the system viewer.
private struct QuickLookView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: QLPreviewController, context: Context) {
        context.coordinator.url = url
        controller.reloadData()
    }

    func makeCoordinator() -> Coordinator { Coordinator(url: url) }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        var url: URL
        init(url: URL) { self.url = url }
        func numberOfPreviewItems(in controller: QLPreviewController) -> Int { 1 }
        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem { url as NSURL }
    }
}
