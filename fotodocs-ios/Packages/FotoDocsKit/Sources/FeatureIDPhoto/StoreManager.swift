import StoreKit
import CryptoKit
import UIKit

/// What a photo export costs: the preview and a watermarked file are free, the clean HD files are paid per photo.
/// A photo with the composited suit (the feature other apps don't have) costs more.
enum PhotoProduct: String, CaseIterable {
    case photo = "com.mivy.fotodocs.photo"           // ảnh thẻ HD (file in + file số, không watermark)
    case vest = "com.mivy.fotodocs.photo.vest"       // ảnh thẻ mặc vest HD

    /// Shown until the App Store answers (and on the simulator, where `simctl launch` has no StoreKit config).
    var fallbackPrice: String { self == .photo ? "29.000 ₫" : "49.000 ₫" }
    var title: String { self == .photo ? "Ảnh thẻ HD" : "Ảnh thẻ mặc vest HD" }
}

/// StoreKit 2 for the per-photo unlock (consumable: each purchase unlocks ONE photo, all its files).
/// Products come from App Store Connect, or `FotoDocs/Products.storekit` when run from Xcode. On the simulator
/// launched without that config, purchases are simulated so the whole flow can be tested.
@MainActor
@Observable
final class StoreManager {
    static let shared = StoreManager()

    private(set) var products: [String: Product] = [:]
    private var loaded = false

    func load() async {
        guard !loaded else { return }
        loaded = true
        let list = (try? await Product.products(for: PhotoProduct.allCases.map(\.rawValue))) ?? []
        products = Dictionary(uniqueKeysWithValues: list.map { ($0.id, $0) })
    }

    func price(_ p: PhotoProduct) -> String { products[p.rawValue]?.displayPrice ?? p.fallbackPrice }

    enum Outcome { case purchased, cancelled, unavailable }

    func purchase(_ p: PhotoProduct) async -> Outcome {
        guard let product = products[p.rawValue] else {
            #if targetEnvironment(simulator)
            return .purchased   // simulated store (no StoreKit config on the simulator)
            #else
            return .unavailable
            #endif
        }
        guard let result = try? await product.purchase() else { return .unavailable }
        switch result {
        case .success(let verification):
            guard case .verified(let transaction) = verification else { return .unavailable }
            await transaction.finish()
            return .purchased
        case .userCancelled, .pending: return .cancelled
        @unknown default: return .cancelled
        }
    }
}

/// Photos already paid for, so re-opening the export of the same photo doesn't charge again.
/// Keyed by a hash of the finished photo (a different crop / background / suit is a different photo).
enum PhotoUnlocks {
    private static let key = "unlockedPhotos"

    static func fingerprint(_ image: UIImage) -> String {
        let data = image.jpegData(compressionQuality: 0.5) ?? Data()
        return SHA256.hash(data: data).prefix(12).map { String(format: "%02x", $0) }.joined()
    }

    static func isUnlocked(_ fingerprint: String) -> Bool {
        (UserDefaults.standard.stringArray(forKey: key) ?? []).contains(fingerprint)
    }

    static func unlock(_ fingerprint: String) {
        var all = UserDefaults.standard.stringArray(forKey: key) ?? []
        guard !all.contains(fingerprint) else { return }
        all.append(fingerprint)
        UserDefaults.standard.set(Array(all.suffix(200)), forKey: key)
    }
}
