import CoreGraphics

/// A concrete photo spec the capture screen aims for: physical size, background,
/// and an optional head-height ratio used to place the on-screen guide.
public struct CaptureTarget: Hashable, Sendable, Identifiable {
    public let id: String
    public let title: String
    public let subtitle: String
    public let widthMm: Double
    public let heightMm: Double
    public let background: String
    public let headRatio: ClosedRange<Double>?
    /// Target pixels for the online/digital file, if the authority specifies one.
    public let digitalPixels: CGSize?
    /// Max file size (KB) for the online/digital file, if specified.
    public let digitalMaxKB: Int?
    /// A baby or toddler: the photo is levelled automatically and the expression / ears checks are advice only.
    public let infant: Bool

    public init(
        id: String,
        title: String,
        subtitle: String,
        widthMm: Double,
        heightMm: Double,
        background: String = "trắng",
        headRatio: ClosedRange<Double>? = nil,
        digitalPixels: CGSize? = nil,
        digitalMaxKB: Int? = nil,
        infant: Bool = false
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.widthMm = widthMm
        self.heightMm = heightMm
        self.background = background
        self.headRatio = headRatio
        self.digitalPixels = digitalPixels
        self.digitalMaxKB = digitalMaxKB
        self.infant = infant
    }

    /// width / height, for sizing the preview crop frame.
    public var aspect: CGFloat {
        guard heightMm > 0 else { return 1 }
        return CGFloat(widthMm / heightMm)
    }

    public var sizeText: String {
        func f(_ v: Double) -> String { v == v.rounded() ? String(Int(v)) : String(v) }
        return "\(f(widthMm))×\(f(heightMm)) mm"
    }

    // MARK: Built-in Vietnamese sizes (not in presets.json, which is visa/passport only)

    public static let idCard3x4 = CaptureTarget(
        id: "id-3x4", title: "Ảnh 3×4", subtitle: "Hồ sơ",
        widthMm: 30, heightMm: 40, headRatio: 0.64...0.75
    )

    public static let idCard4x6 = CaptureTarget(
        id: "id-4x6", title: "Ảnh 4×6", subtitle: "Hộ chiếu",
        widthMm: 40, heightMm: 60, headRatio: 0.64...0.75
    )

    public static let jobApplication = CaptureTarget(
        id: "job", title: "Ảnh xin việc", subtitle: "Ghép vest",
        widthMm: 30, heightMm: 40, headRatio: 0.64...0.75
    )

    /// Vietnamese passport photo for a baby or young child (4×6, white), shot lying on a white sheet.
    public static let baby = CaptureTarget(
        id: "baby-4x6", title: "Ảnh cho bé", subtitle: "Hộ chiếu trẻ em",
        widthMm: 40, heightMm: 60, headRatio: 0.64...0.75, infant: true
    )

    // MARK: Online upload portals

    /// Photo files for online applications: exact pixels and a size budget per portal. Specs as published
    /// by each portal (VN portals publish no hard KB limit; budgets kept under every figure quoted).
    public static let online: [OnlinePortal] = [
        OnlinePortal(target: CaptureTarget(id: "online-us", title: "Visa Mỹ DS-160 / DV", subtitle: "ceac.state.gov",
                                           widthMm: 51, heightMm: 51, headRatio: 0.50...0.69,
                                           digitalPixels: CGSize(width: 600, height: 600), digitalMaxKB: 240),
                     note: "Vuông 600×600 px, JPEG ≤ 240 KB, đầu chiếm 50–69% chiều cao ảnh."),
        OnlinePortal(target: CaptureTarget(id: "online-cn", title: "Visa Trung Quốc (COVA)", subtitle: "cova.mfa.gov.cn",
                                           widthMm: 33, heightMm: 48, headRatio: 0.58...0.73,
                                           digitalPixels: CGSize(width: 354, height: 472), digitalMaxKB: 120),
                     note: "354×472 px, JPEG 40–120 KB."),
        OnlinePortal(target: CaptureTarget(id: "online-uk", title: "Visa Anh (online)", subtitle: "gov.uk",
                                           widthMm: 36, heightMm: 45, headRatio: 0.64...0.75,
                                           digitalPixels: CGSize(width: 900, height: 1125), digitalMaxKB: 6000),
                     note: "Tối thiểu 600×750 px, JPEG 50 KB – 6 MB, không dùng bộ lọc."),
        OnlinePortal(target: CaptureTarget(id: "online-vn-passport", title: "Hộ chiếu online (Bộ Công an)", subtitle: "dichvucong.bocongan.gov.vn",
                                           widthMm: 40, heightMm: 60, headRatio: 0.64...0.75,
                                           digitalPixels: CGSize(width: 600, height: 900), digitalMaxKB: 2000),
                     note: "Ảnh 4×6 nền trắng, file JPG. App giữ dưới 2 MB (các hướng dẫn nêu 2–4 MB)."),
        OnlinePortal(target: CaptureTarget(id: "online-thpt", title: "Đăng ký thi THPT / xét tuyển", subtitle: "thisinh.thitotnghiepthpt.edu.vn",
                                           widthMm: 40, heightMm: 60, headRatio: 0.64...0.75,
                                           digitalPixels: CGSize(width: 600, height: 900), digitalMaxKB: 1000),
                     note: "Ảnh 4×6 nền trắng kiểu căn cước, file JPG. Chưa có giới hạn dung lượng chính thức, app giữ dưới 1 MB."),
        OnlinePortal(target: CaptureTarget(id: "online-3x4", title: "Hồ sơ online 3×4", subtitle: "Xin việc, tuyển sinh, thi chứng chỉ",
                                           widthMm: 30, heightMm: 40, headRatio: 0.64...0.75,
                                           digitalPixels: CGSize(width: 600, height: 800), digitalMaxKB: 500),
                     note: "600×800 px, JPEG ≤ 500 KB. Kiểm tra lại yêu cầu riêng của nơi nộp."),
    ]

    // MARK: From presets

    public static func visa(_ destination: VisaDestination) -> CaptureTarget {
        CaptureTarget(
            id: "visa-\(destination.id)",
            title: "Visa \(destination.nameVi)",
            subtitle: destination.sizeLabel,
            widthMm: destination.print?.wMm.min ?? 35,
            heightMm: destination.print?.hMm.min ?? 45,
            headRatio: destination.faceRatio.map { $0.min...$0.max },
            digitalPixels: digitalPixels(destination.digital),
            digitalMaxKB: digitalKB(destination.digital)
        )
    }

    public static func passport(_ origin: OriginPassport) -> CaptureTarget {
        CaptureTarget(
            id: "pp-\(origin.id)",
            title: "Hộ chiếu \(origin.nameVi)",
            subtitle: origin.print?.summary ?? "ảnh theo quy chuẩn",
            widthMm: origin.print?.wMm.min ?? 40,
            heightMm: origin.print?.hMm.min ?? 60,
            headRatio: nil,
            digitalPixels: digitalPixels(origin.digital),
            digitalMaxKB: digitalKB(origin.digital)
        )
    }

    private static func digitalPixels(_ spec: DigitalSpec?) -> CGSize? {
        guard let spec else { return nil }
        if let square = spec.squarePx, let side = square.max() {
            return CGSize(width: side, height: side)
        }
        for dims in [spec.maxPx, spec.preferredPx, spec.minPx] {
            if let dims, dims.count >= 2 {
                return CGSize(width: dims[0], height: dims[1])
            }
        }
        return nil
    }

    private static func digitalKB(_ spec: DigitalSpec?) -> Int? {
        spec?.maxKb ?? spec?.kb?.last
    }
}

/// An online portal and the photo file it accepts.
public struct OnlinePortal: Identifiable, Hashable, Sendable {
    public let target: CaptureTarget
    public let note: String
    public var id: String { target.id }
}

/// Checks an existing photo file against a portal before upload. Face values come from the face checker
/// (normalised face box height) and the mean brightness of the image border (background).
public enum OnlinePhotoCheck {
    public struct Input: Sendable {
        public var pixelSize: CGSize
        public var bytes: Int
        public var isJPEG: Bool
        public var faceFound: Bool
        public var faceHeightRatio: Double?   // face box height / image height
        public var borderBrightness: Double   // 0…1

        public init(pixelSize: CGSize, bytes: Int, isJPEG: Bool, faceFound: Bool, faceHeightRatio: Double?, borderBrightness: Double) {
            self.pixelSize = pixelSize
            self.bytes = bytes
            self.isJPEG = isJPEG
            self.faceFound = faceFound
            self.faceHeightRatio = faceHeightRatio
            self.borderBrightness = borderBrightness
        }
    }

    public struct Item: Identifiable, Equatable, Sendable {
        public let id: String
        public let label: String
        public let detail: String
        public let ok: Bool
    }

    /// The Vision face box covers brow to chin; the full head (crown to chin) is about 1.45× taller.
    static let headPerFace = 1.45

    public static func evaluate(_ i: Input, for target: CaptureTarget) -> [Item] {
        var items: [Item] = []
        items.append(Item(id: "format", label: "Định dạng JPEG", detail: i.isJPEG ? "JPEG" : "Không phải JPEG", ok: i.isJPEG))
        let w = Int(i.pixelSize.width), h = Int(i.pixelSize.height)
        if let want = target.digitalPixels {
            let ratioOK = abs(i.pixelSize.width / max(i.pixelSize.height, 1) - want.width / want.height) < 0.02
            let bigEnough = i.pixelSize.width >= want.width * 0.98 && i.pixelSize.height >= want.height * 0.98
            items.append(Item(id: "ratio", label: "Đúng tỉ lệ khung", detail: "\(w)×\(h) px, cần tỉ lệ như \(Int(want.width))×\(Int(want.height))", ok: ratioOK))
            items.append(Item(id: "pixels", label: "Đủ độ phân giải", detail: "Cần ít nhất \(Int(want.width))×\(Int(want.height)) px", ok: bigEnough))
        }
        if let maxKB = target.digitalMaxKB {
            let kb = i.bytes / 1024
            items.append(Item(id: "kb", label: "Dung lượng ≤ \(maxKB) KB", detail: "File hiện \(kb) KB", ok: kb <= maxKB))
        }
        items.append(Item(id: "face", label: "Thấy rõ khuôn mặt", detail: i.faceFound ? "Có" : "Không tìm thấy mặt", ok: i.faceFound))
        if let range = target.headRatio, let face = i.faceHeightRatio {
            let head = face * headPerFace
            let ok = head >= range.lowerBound - 0.04 && head <= range.upperBound + 0.04
            items.append(Item(id: "head", label: "Cỡ đầu vừa khung", detail: "Đầu ≈ \(Int(head * 100))% chiều cao, cần \(Int(range.lowerBound * 100))–\(Int(range.upperBound * 100))%", ok: ok))
        }
        let bgOK = i.borderBrightness >= 0.78
        items.append(Item(id: "bg", label: "Nền trắng / sáng", detail: bgOK ? "Nền sáng" : "Nền tối hoặc nhiều màu", ok: bgOK))
        return items
    }
}
