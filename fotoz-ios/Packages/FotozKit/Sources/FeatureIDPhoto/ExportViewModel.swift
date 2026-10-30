import SwiftUI
import FotozCore
import FotozImaging

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

@MainActor
@Observable
public final class ExportViewModel {
    public let target: CaptureTarget
    let image: UIImage
    let store = StoreManager()

    public var hd = false
    public var isBusy = false
    public var statusNote: String?
    var shareItem: ShareItem?

    public init(target: CaptureTarget, image: UIImage) {
        self.target = target
        self.image = image
    }

    public var digitalInfoText: String {
        let size = PhotoExporter.digitalPixelSize(for: target)
        let budget = target.digitalMaxKB.map { "≤ \($0) KB" } ?? "chất lượng cao"
        return "\(Int(size.width))×\(Int(size.height)) px · \(budget)"
    }

    public func onAppear() async {
        await store.load()
    }

    func export(_ kind: ExportKind) {
        if hd && !store.isEntitled {
            Task { await buyHD() }
            return
        }
        isBusy = true
        defer { isBusy = false }
        guard let result = ExportRenderer.makeFile(kind: kind, image: image, target: target, hd: hd) else {
            statusNote = "Không tạo được file."
            return
        }
        statusNote = result.note
        shareItem = ShareItem(url: result.url)
    }

    func buyHD() async {
        guard store.isConfigured else {
            statusNote = "Gói HD đang là placeholder — cần cấu hình trên App Store Connect."
            hd = false
            return
        }
        let ok = await store.purchase()
        if !ok {
            statusNote = "Chưa mua được gói HD."
            hd = false
        }
    }
}
