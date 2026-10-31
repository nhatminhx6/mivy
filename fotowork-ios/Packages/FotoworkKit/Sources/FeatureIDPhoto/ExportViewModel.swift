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
        case .print: "Tờ in 10×15 cm"
        case .digital: "JPG · \(target.sizeText) · 300 dpi"
        case .ship: "In trên giấy ảnh · giao tận nơi"
        }
    }

    /// Everything is free while testing — export the full-quality file (no watermark, no payment).
    func exportFile() {
        if mode == .ship {
            statusNote = "Đặt in & giao cần đối tác in — sắp có."
            return
        }
        isBusy = true
        defer { isBusy = false }
        let kind: ExportKind = (mode == .digital) ? .digital : .print10x15
        guard let result = ExportRenderer.makeFile(kind: kind, image: image, target: target, hd: true) else {
            statusNote = "Không tạo được file."
            return
        }
        statusNote = result.note
        shareItem = ShareItem(url: result.url)
    }
}
