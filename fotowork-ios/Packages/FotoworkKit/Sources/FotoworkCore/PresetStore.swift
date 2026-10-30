import Foundation

public enum PresetError: Error, Sendable, Equatable {
    case missingFile
}

/// Reads the bundled photo-standard presets. On-device only — no network.
public protocol PresetProviding: Sendable {
    func load() throws -> PresetData
}

/// Live store: decodes `presets.json` shipped as a resource of FotoworkCore.
public struct PresetStore: PresetProviding {
    public init() {}

    public func load() throws -> PresetData {
        guard let url = Bundle.module.url(forResource: "presets", withExtension: "json") else {
            throw PresetError.missingFile
        }
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode(PresetData.self, from: data)
    }
}

/// In-memory store for previews and tests.
public struct MockPresetStore: PresetProviding {
    public var data: PresetData

    public init(data: PresetData) {
        self.data = data
    }

    public func load() throws -> PresetData {
        data
    }
}
