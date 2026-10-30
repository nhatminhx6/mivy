import UIKit
import FotozCore
import FotozImaging

enum ExportKind {
    case print10x15
    case digital
}

/// Builds the shareable output files. Watermark + file writing live here (UIKit);
/// the heavy pixel work is in FotozImaging's `PhotoExporter`.
enum ExportRenderer {
    static func makeFile(kind: ExportKind, image: UIImage, target: CaptureTarget, hd: Bool) -> (url: URL, note: String)? {
        let photo = hd ? image : watermarked(image)
        guard let cgPhoto = photo.cgImage else { return nil }

        switch kind {
        case .print10x15:
            guard let sheet = PhotoExporter.printSheet(
                photo: cgPhoto,
                photoWidthMm: target.widthMm,
                photoHeightMm: target.heightMm
            ), let data = PhotoExporter.jpeg(sheet.image, quality: 0.95) else { return nil }
            let url = write(data, name: "fotoz-in-10x15.jpg")
            return (url, "Dàn \(sheet.count) ảnh · 10×15 cm · 300 DPI")

        case .digital:
            let size = PhotoExporter.digitalPixelSize(for: target)
            guard let resized = PhotoExporter.resized(cgPhoto, to: size),
                  let data = PhotoExporter.compressedJPEG(resized, maxKB: target.digitalMaxKB) else { return nil }
            let url = write(data, name: "fotoz-online.jpg")
            return (url, "\(Int(size.width))×\(Int(size.height)) px · \(data.count / 1024) KB")
        }
    }

    static func watermarked(_ image: UIImage) -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: image.size)
        return renderer.image { context in
            image.draw(at: .zero)
            let cg = context.cgContext
            let fontSize = image.size.width * 0.06
            let text = NSAttributedString(string: "Fotoz", attributes: [
                .font: UIFont.systemFont(ofSize: fontSize, weight: .heavy),
                .foregroundColor: UIColor.white.withAlphaComponent(0.45),
            ])
            let textSize = text.size()

            cg.saveGState()
            cg.translateBy(x: image.size.width / 2, y: image.size.height / 2)
            cg.rotate(by: -.pi / 6)
            cg.translateBy(x: -image.size.width / 2, y: -image.size.height / 2)

            var y = -image.size.height
            while y < image.size.height * 2 {
                var x = -image.size.width
                while x < image.size.width * 2 {
                    text.draw(at: CGPoint(x: x, y: y))
                    x += textSize.width + fontSize * 1.6
                }
                y += textSize.height + fontSize * 2.2
            }
            cg.restoreGState()
        }
    }

    private static func write(_ data: Data, name: String) -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? data.write(to: url)
        return url
    }
}
