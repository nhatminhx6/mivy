#if DEBUG
import UIKit
import ImageIO
import FotoDocsImaging

/// Debug builds only: launched with `-renderVest`, the app runs the suit compositing on the last
/// source photo (`Documents/debug-last-source.jpg`) with the phone's own Vision, writes one result per
/// suit to `Documents/debug-vest-<suit>.jpg` (blue and white backdrops), then `debug-vest-done.txt`.
public enum DebugVestRender {
    public static func runIfRequested() async {
        guard ProcessInfo.processInfo.arguments.contains("-renderVest"),
              let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
              let data = try? Data(contentsOf: docs.appendingPathComponent("debug-last-source.jpg")),
              let photo = UIImage(data: data), let cg = photo.cgImage else { return }
        let editor = PortraitEditor()
        await editor.prepare(cgImage: cg, orientation: CGImagePropertyOrientation(photo.imageOrientation))
        var log = "mask: \(await editor.hasMask())\n"
        for outfit in OutfitOption.allCases where outfit != .keep {
            for background in [BackgroundOption.white, .blue] {
                var settings = EditSettings()
                settings.outfit = outfit
                settings.background = background
                let start = Date()
                if let r = await editor.renderWithOutfit(settings: settings, targetAspect: 2.0 / 3.0),
                   let jpg = UIImage(cgImage: r.image).jpegData(compressionQuality: 0.9) {
                    try? jpg.write(to: docs.appendingPathComponent("debug-vest-\(outfit.rawValue)-\(background.rawValue).jpg"))
                    log += "\(outfit.rawValue) \(background.rawValue): fitted \(r.outfitFitted) \(Int(Date().timeIntervalSince(start) * 1000)) ms\n"
                } else {
                    log += "\(outfit.rawValue) \(background.rawValue): nil\n"
                }
            }
        }
        try? log.write(to: docs.appendingPathComponent("debug-vest-done.txt"), atomically: true, encoding: .utf8)
    }
}
#endif
