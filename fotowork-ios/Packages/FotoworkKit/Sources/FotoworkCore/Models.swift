import Foundation

/// A measurement that may be a single value or a `[min, max]` range in the source JSON.
public enum Measure: Codable, Sendable, Equatable {
    case value(Double)
    case range(Double, Double)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let single = try? container.decode(Double.self) {
            self = .value(single)
            return
        }
        let array = try container.decode([Double].self)
        self = .range(array.first ?? 0, array.last ?? 0)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .value(let value):
            try container.encode(value)
        case .range(let lower, let upper):
            try container.encode([lower, upper])
        }
    }

    public var min: Double {
        switch self {
        case .value(let value): value
        case .range(let lower, _): lower
        }
    }

    public var max: Double {
        switch self {
        case .value(let value): value
        case .range(_, let upper): upper
        }
    }

    public var isRange: Bool {
        if case .range = self { return true }
        return false
    }

    /// Compact human form, e.g. `35` or `35–40`.
    public var short: String {
        func format(_ value: Double) -> String {
            value == value.rounded() ? String(Int(value)) : String(value)
        }
        switch self {
        case .value(let value): return format(value)
        case .range(let lower, let upper): return "\(format(lower))–\(format(upper))"
        }
    }
}

public struct PrintSize: Codable, Sendable, Equatable {
    public let wMm: Measure
    public let hMm: Measure
    public let label: String?

    enum CodingKeys: String, CodingKey {
        case wMm = "w_mm"
        case hMm = "h_mm"
        case label
    }

    /// e.g. `35×45 mm` or `51×51 mm · 2x2 inch`.
    public var summary: String {
        let base = "\(wMm.short)×\(hMm.short) mm"
        if let label { return "\(base) · \(label)" }
        return base
    }
}

public struct AltPreset: Codable, Sendable, Equatable {
    public let label: String
    public let wMm: Double
    public let hMm: Double

    enum CodingKeys: String, CodingKey {
        case label
        case wMm = "w_mm"
        case hMm = "h_mm"
    }
}

/// Digital upload spec. Fields are heterogeneous across authorities, so all are optional.
public struct DigitalSpec: Codable, Sendable, Equatable {
    public let format: String?
    public let maxPx: [Int]?
    public let minPx: [Int]?
    public let squarePx: [Int]?
    public let preferredPx: [Int]?
    public let kb: [Int]?
    public let maxKb: Int?
    public let color: String?
    public let scope: String?
    public let noFilters: Bool?

    enum CodingKeys: String, CodingKey {
        case format
        case maxPx = "max_px"
        case minPx = "min_px"
        case squarePx = "square_px"
        case preferredPx = "preferred_px"
        case kb
        case maxKb = "max_kb"
        case color
        case scope
        case noFilters = "no_filters"
    }
}

public struct VisaDestination: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let nameVi: String
    public let print: PrintSize?
    public let headMm: Measure?
    public let headWidthMm: Measure?
    public let headRatio: Measure?
    public let faceRatio: Measure?
    public let background: String?
    public let glasses: String?
    public let headCovering: String?
    public let recencyMonths: Int?
    public let standard: String?
    public let digital: DigitalSpec?
    public let altPresets: [AltPreset]?
    public let notes: String?
    public let uncertain: [String]?
    public let sources: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case nameVi = "name_vi"
        case print
        case headMm = "head_mm"
        case headWidthMm = "head_width_mm"
        case headRatio = "head_ratio"
        case faceRatio = "face_ratio"
        case background
        case glasses
        case headCovering = "head_covering"
        case recencyMonths = "recency_months"
        case standard
        case digital
        case altPresets = "alt_presets"
        case notes
        case uncertain
        case sources
    }

    /// Display size for the picker row: print size, else a digital hint, else a dash.
    public var sizeLabel: String {
        if let print { return print.summary }
        if digital != nil { return "Chỉ ảnh số" }
        return "—"
    }
}

public struct OriginPassport: Codable, Sendable, Identifiable, Equatable {
    public let id: String
    public let nameVi: String
    public let photo: String
    public let print: PrintSize?
    public let background: String?
    public let glasses: Bool?
    public let headCovering: Bool?
    public let earsVisible: Bool?
    public let recencyMonths: Int?
    public let digital: DigitalSpec?
    public let notes: String?
    public let uncertain: [String]?
    public let sources: [String]?

    enum CodingKeys: String, CodingKey {
        case id
        case nameVi = "name_vi"
        case photo
        case print
        case background
        case glasses
        case headCovering = "head_covering"
        case earsVisible = "ears_visible"
        case recencyMonths = "recency_months"
        case digital
        case notes
        case uncertain
        case sources
    }

    /// How the passport photo is produced for this country.
    public enum PhotoMode: String, Sendable {
        case selfSupplied = "self_supplied"
        case selfSuppliedAbroad = "self_supplied_abroad"
        case liveCapture = "live_capture"
        case uncertain
    }

    public var photoMode: PhotoMode {
        PhotoMode(rawValue: photo) ?? .uncertain
    }
}

public struct PresetData: Codable, Sendable, Equatable {
    public let version: Int
    public let researched: String
    public let note: String?
    public let visaDestinations: [VisaDestination]
    public let originPassports: [OriginPassport]

    enum CodingKeys: String, CodingKey {
        case version
        case researched
        case note
        case visaDestinations = "visa_destinations"
        case originPassports = "origin_passports"
    }
}
