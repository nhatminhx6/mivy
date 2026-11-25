import Testing
import UIKit
import FotoDocsCore
@testable import FeatureIDPhoto

@Suite("Photo paywall", .serialized)
@MainActor
struct PaywallTests {
    private func photo(_ gray: CGFloat) -> UIImage {
        UIGraphicsImageRenderer(size: CGSize(width: 40, height: 60)).image { _ in
            UIColor(white: gray, alpha: 1).setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 40, height: 60))
        }
    }

    @Test("A suit photo costs the vest price, a plain photo the basic one")
    func productByOutfit() {
        let t = CaptureTarget.idCard4x6
        #expect(ExportViewModel(target: t, image: photo(0.3), hasOutfit: true).product == .vest)
        #expect(ExportViewModel(target: t, image: photo(0.3), hasOutfit: false).product == .photo)
    }

    @Test("Not paid: preview and file are watermarked; paid once: the same photo stays unlocked")
    func unlockSticks() {
        let t = CaptureTarget.idCard4x6
        let img = photo(CGFloat.random(in: 0.1...0.9))
        let locked = ExportViewModel(target: t, image: img)
        #expect(!locked.unlocked)
        #expect(locked.previewImage.pngData() != locked.sheetPreview?.pngData())   // watermarked sheet
        PhotoUnlocks.unlock(PhotoUnlocks.fingerprint(img))
        let again = ExportViewModel(target: t, image: img)
        #expect(again.unlocked)
    }
}
