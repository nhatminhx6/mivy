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

    public init(
        id: String,
        title: String,
        subtitle: String,
        widthMm: Double,
        heightMm: Double,
        background: String = "trắng",
        headRatio: ClosedRange<Double>? = nil
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.widthMm = widthMm
        self.heightMm = heightMm
        self.background = background
        self.headRatio = headRatio
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

    // MARK: From presets

    public static func visa(_ destination: VisaDestination) -> CaptureTarget {
        CaptureTarget(
            id: "visa-\(destination.id)",
            title: "Visa \(destination.nameVi)",
            subtitle: destination.sizeLabel,
            widthMm: destination.print?.wMm.min ?? 35,
            heightMm: destination.print?.hMm.min ?? 45,
            headRatio: destination.faceRatio.map { $0.min...$0.max }
        )
    }

    public static func passport(_ origin: OriginPassport) -> CaptureTarget {
        CaptureTarget(
            id: "pp-\(origin.id)",
            title: "Hộ chiếu \(origin.nameVi)",
            subtitle: origin.print?.summary ?? "ảnh theo quy chuẩn",
            widthMm: origin.print?.wMm.min ?? 40,
            heightMm: origin.print?.hMm.min ?? 60,
            headRatio: nil
        )
    }
}
