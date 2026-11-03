import Foundation
import Observation
import FotoDocsCore

/// The traveller profile as one JSON file in Application Support, encrypted at rest
/// (complete file protection) and never sent anywhere.
@MainActor
@Observable
final class VisaProfileStore {
    var profile: VisaProfile {
        didSet { if profile != oldValue { save() } }
    }

    private static var url: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("visa-profile.json")
    }

    init() {
        profile = (try? Data(contentsOf: Self.url)).flatMap { try? JSONDecoder().decode(VisaProfile.self, from: $0) } ?? VisaProfile()
    }

    private func save() {
        if profile.isEmpty {
            try? FileManager.default.removeItem(at: Self.url)
        } else if let data = try? JSONEncoder().encode(profile) {
            try? data.write(to: Self.url, options: [.atomic, .completeFileProtection])
        }
    }

    func clear() { profile = VisaProfile() }
}
