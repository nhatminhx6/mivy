import Observation
import FotoworkCore

@MainActor
@Observable
public final class IDPhotoViewModel {
    public private(set) var presets: PresetData?
    public var selectedOrigin: OriginPassport?
    public var loadError: String?

    public init() {}

    public func loadIfNeeded(using store: any PresetProviding) {
        guard presets == nil else { return }
        do {
            let data = try store.load()
            presets = data
            selectedOrigin = data.originPassports.first { $0.id == "vn" } ?? data.originPassports.first
        } catch {
            loadError = String(describing: error)
        }
    }

    public var visaDestinations: [VisaDestination] {
        presets?.visaDestinations ?? []
    }

    public var origins: [OriginPassport] {
        presets?.originPassports ?? []
    }

    /// Passport print size for the selected origin, e.g. `40×60 mm`.
    public var passportSizeText: String {
        selectedOrigin?.print?.summary ?? "ảnh theo quy chuẩn"
    }

    public var originCode: String {
        (selectedOrigin?.id ?? "vn").uppercased()
    }
}
