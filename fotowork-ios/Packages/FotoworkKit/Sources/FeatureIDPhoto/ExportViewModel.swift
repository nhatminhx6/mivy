import SwiftUI
import FotoworkCore
import FotoworkImaging

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

enum ExportMode: String, CaseIterable, Identifiable {
    case print, digital, ship
    var id: String { rawValue }
}

@MainActor
@Observable
public final class ExportViewModel {
    public let target: CaptureTarget
    let image: UIImage
    let store = StoreManager()

    var mode: ExportMode = .print
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

    var previewCaption: String {
        switch mode {
        case .print: "Tờ in 10×15 cm · 8 ảnh"
        case .digital: "JPG · \(target.sizeText) · 300 dpi"
        case .ship: "In trên giấy ảnh · giao tận nơi"
        }
    }

    public func onAppear() async {
        await store.load()
    }

    /// Paid / HD path (StoreKit placeholder).
    func exportPaid() {
        if mode == .ship {
            statusNote = "Đặt in & giao cần đối tác in — sắp có."
            return
        }
        if store.isEntitled {
            makeFile(hd: true)
        } else {
            Task { await buyHD() }
        }
    }

    /// Free watermarked path.
    func exportFree() {
        guard mode != .ship else { return }
        makeFile(hd: false)
    }

    private func makeFile(hd: Bool) {
        let kind: ExportKind = (mode == .digital) ? .digital : .print10x15
        isBusy = true
        defer { isBusy = false }
        guard let result = ExportRenderer.makeFile(kind: kind, image: image, target: target, hd: hd) else {
            statusNote = "Không tạo được file."
            return
        }
        statusNote = result.note
        shareItem = ShareItem(url: result.url)
    }

    private func buyHD() async {
        guard store.isConfigured else {
            statusNote = "Gói HD đang là placeholder — cần cấu hình App Store Connect."
            return
        }
        let ok = await store.purchase()
        statusNote = ok ? nil : "Chưa mua được gói HD."
        if ok { makeFile(hd: true) }
    }
}
