import UIKit
import FotoworkImaging

/// Composites a real garment **template image** onto the photo.
///
/// Template spec (add as image sets `outfit-vest` / `outfit-shirt` / `outfit-aodai`
/// in the app asset catalog, or PNGs in the bundle):
/// - Front-facing worn garment (vest/shirt/áo dài) on a transparent background.
/// - The neck/collar opening centred horizontally near the top, so a face placed
///   above it lines up with the collar.
/// - Drawn scaled to the photo width and anchored to the bottom edge.
///
/// Returns `nil` when no template asset is available yet (caller keeps the photo
/// unchanged and shows a "coming soon" note) — we never draw a fake garment.
enum OutfitCompositor {
    static func apply(_ photo: UIImage, outfit: OutfitOption) -> UIImage? {
        guard let name = outfit.templateAsset, let garment = loadTemplate(name) else { return nil }

        let size = photo.size
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = photo.scale
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { _ in
            photo.draw(at: .zero)
            let gw = size.width
            let gh = gw * (garment.size.height / max(garment.size.width, 1))
            let rect = CGRect(x: 0, y: size.height - gh, width: gw, height: gh)
            garment.draw(in: rect)
        }
    }

    static func hasTemplate(for outfit: OutfitOption) -> Bool {
        guard let name = outfit.templateAsset else { return false }
        return loadTemplate(name) != nil
    }

    private static func loadTemplate(_ name: String) -> UIImage? {
        // App asset catalog (drag images in as `outfit-vest`, …) …
        if let image = UIImage(named: name) { return image }
        // … or a bundled PNG.
        if let url = Bundle.main.url(forResource: name, withExtension: "png") {
            return UIImage(contentsOfFile: url.path)
        }
        return nil
    }
}
