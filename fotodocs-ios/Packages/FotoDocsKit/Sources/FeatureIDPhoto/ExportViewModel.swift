import SwiftUI
import FotoDocsCore
import FotoDocsImaging

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

    var mode: ExportMode = .print {
        // the note describes the last file made; it is wrong once another option is picked
        didSet { if mode != oldValue { statusNote = nil } }
    }
    public var isBusy = false
    public var statusNote: String?
    var shareItem: ShareItem?

    /// The photo wears the composited suit (priced higher).
    let hasOutfit: Bool
    /// Paid for: the clean HD files (no watermark), all export options of THIS photo.
    private(set) var unlocked: Bool
    private let fingerprint: String
    var buying = false

    var product: PhotoProduct { hasOutfit ? .vest : .photo }
    var priceText: String { StoreManager.shared.price(product) }

    public init(target: CaptureTarget, image: UIImage, hasOutfit: Bool = false) {
        self.target = target
        self.image = image
        self.hasOutfit = hasOutfit
        fingerprint = PhotoUnlocks.fingerprint(image)
        unlocked = PhotoUnlocks.isUnlocked(fingerprint)
    }

    func loadStore() async { await StoreManager.shared.load() }

    /// Buy this photo, then hand over the clean file of the selected option straight away.
    func buyAndExport() async {
        buying = true
        defer { buying = false }
        switch await StoreManager.shared.purchase(product) {
        case .purchased:
            PhotoUnlocks.unlock(fingerprint)
            unlocked = true
            exportFile()
        case .cancelled: break
        case .unavailable: statusNote = "Chưa kết nối được App Store. Bạn thử lại sau nhé."
        }
    }

    public var digitalInfoText: String {
        let size = PhotoExporter.digitalPixelSize(for: target)
        let budget = target.digitalMaxKB.map { "≤ \($0) KB" } ?? "chất lượng cao"
        return "\(Int(size.width))×\(Int(size.height)) px · \(budget)"
    }

    /// "9 ảnh 3×4 trên một tờ…" — counts how many copies really fit on the 10×15 sheet.
    var printInfoText: String {
        let gap = 2.0
        let cols = max(1, Int((100 + gap) / (target.widthMm + gap)))
        let rows = max(1, Int((150 + gap) / (target.heightMm + gap)))
        func f(_ v: Double) -> String { v == v.rounded() ? String(Int(v / 10)) : String(v / 10) }
        return "\(cols * rows) ảnh \(f(target.widthMm))×\(f(target.heightMm)) trên một tờ, in ở tiệm khoảng 3.000đ"
    }

    /// The 10×15 sheet as it will print, shown for "File in" / "In ngay" (the caption says "Tờ in 10×15 cm").
    @ObservationIgnored private(set) lazy var sheetPreview: UIImage? = image.cgImage
        .flatMap { PhotoExporter.printSheet(photo: $0, photoWidthMm: target.widthMm, photoHeightMm: target.heightMm) }
        .map { UIImage(cgImage: $0.image) }
    @ObservationIgnored private lazy var markedPhoto = ExportRenderer.watermarked(image)
    @ObservationIgnored private lazy var markedSheet: UIImage? = markedPhoto.cgImage
        .flatMap { PhotoExporter.printSheet(photo: $0, photoWidthMm: target.widthMm, photoHeightMm: target.heightMm) }
        .map { UIImage(cgImage: $0.image) }

    /// What the file will look like: watermarked until paid for.
    var previewImage: UIImage {
        if unlocked { return mode == .digital ? image : (sheetPreview ?? image) }
        return mode == .digital ? markedPhoto : (markedSheet ?? markedPhoto)
    }

    var previewCaption: String {
        switch mode {
        case .print: "Tờ in 10×15 cm"
        case .digital: "JPG · \(target.sizeText) · 300 dpi"
        case .ship: "Tờ 10×15 cm · in qua AirPrint"
        }
    }

    /// The file of the selected option: clean when the photo is paid for, watermarked otherwise (free try-out).
    func exportFile() {
        isBusy = true
        defer { isBusy = false }
        let kind: ExportKind = (mode == .digital) ? .digital : .print10x15
        guard let result = ExportRenderer.makeFile(kind: kind, image: image, target: target, hd: unlocked) else {
            statusNote = "Không tạo được file."
            return
        }
        statusNote = result.note
        if mode == .ship {
            printSheet(result.url)
        } else {
            shareItem = ShareItem(url: result.url)
        }
    }

    /// Prints the 10×15 sheet with AirPrint (photo paper 4×6 in, or any paper the printer has).
    private func printSheet(_ url: URL) {
        guard UIPrintInteractionController.isPrintingAvailable else {
            statusNote = "Chưa thấy máy in AirPrint. Hãy chọn “File in khổ 10×15” rồi mang ra tiệm in."
            return
        }
        let info = UIPrintInfo(dictionary: nil)
        info.outputType = .photo
        info.jobName = "FotoDocs \(target.title)"
        let controller = UIPrintInteractionController.shared
        controller.printInfo = info
        controller.printingItem = url
        controller.present(animated: true) { [weak self] _, completed, error in
            Task { @MainActor in
                if let error { self?.statusNote = "In lỗi: \(error.localizedDescription)" }
                else if completed { self?.statusNote = "Đã gửi lệnh in." }
            }
        }
    }
}
