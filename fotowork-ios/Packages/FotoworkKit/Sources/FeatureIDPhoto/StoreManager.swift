import StoreKit

/// Minimal StoreKit 2 wrapper for the HD / remove-logo upsell. Product id is a
/// placeholder; without an App Store Connect product or a .storekit config the
/// product simply stays `nil` and the UI falls back to the free watermarked export.
@MainActor
@Observable
final class StoreManager {
    static let hdProductID = "com.mivy.fotowork.hd"

    private(set) var product: Product?
    private(set) var isEntitled = false

    var priceText: String? { product?.displayPrice }
    var isConfigured: Bool { product != nil }

    func load() async {
        product = try? await Product.products(for: [Self.hdProductID]).first
        await refreshEntitlement()
    }

    func refreshEntitlement() async {
        for await result in Transaction.currentEntitlements {
            if case .verified(let transaction) = result, transaction.productID == Self.hdProductID {
                isEntitled = true
            }
        }
    }

    func purchase() async -> Bool {
        guard let product else { return false }
        guard let result = try? await product.purchase() else { return false }
        if case .success(let verification) = result, case .verified(let transaction) = verification {
            await transaction.finish()
            isEntitled = true
            return true
        }
        return false
    }
}
