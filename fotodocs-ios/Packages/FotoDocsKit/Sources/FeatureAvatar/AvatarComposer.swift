import UIKit
import ImageIO
import FotoDocsImaging

enum AvatarComposer {
    /// Composites the subject onto a code-rendered backdrop, clipped to the template shape.
    /// If `cutout` is nil (no subject mask), the whole photo is placed over the backdrop.
    /// `backgroundReplaced` is false when the person could not be cut out (the photo fills the frame).
    static func compose(photo: UIImage, template: AvatarTemplate, size: CGFloat = 1024) -> (image: UIImage, backgroundReplaced: Bool) {
        let cutout = makeCutout(photo)
        return (render(photo: photo, cutout: cutout, template: template, size: size), cutout != nil)
    }

    private static func render(photo: UIImage, cutout: UIImage?, template: AvatarTemplate, size: CGFloat) -> UIImage {
        let canvas = CGRect(x: 0, y: 0, width: size, height: size)
        let renderer = UIGraphicsImageRenderer(size: canvas.size)
        return renderer.image { ctx in
            let cg = ctx.cgContext

            let clip: UIBezierPath = template.shape == .circle
                ? UIBezierPath(ovalIn: canvas)
                : UIBezierPath(roundedRect: canvas, cornerRadius: size * 0.14)
            clip.addClip()

            let colors = template.uiColors.map(\.cgColor) as CFArray
            if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: [0, 1]) {
                cg.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size, y: size), options: [])
            }

            let subject = cutout ?? photo
            let targetHeight = size * (cutout != nil ? 0.94 : 1.0)
            let scale = targetHeight / subject.size.height
            let w = subject.size.width * scale
            let h = subject.size.height * scale
            // Anchor to the bottom so a cut-out person sits naturally; fall back to fill.
            let x = size / 2 - w / 2
            let y = cutout != nil ? size - h : size / 2 - h / 2
            subject.draw(in: CGRect(x: x, y: y, width: w, height: h))
        }
    }

    static func hasSubject(_ photo: UIImage) -> Bool {
        makeCutout(photo) != nil
    }

    private static func makeCutout(_ photo: UIImage) -> UIImage? {
        guard let cg = photo.cgImage else { return nil }
        let orientation = CGImagePropertyOrientation(photo.imageOrientation)
        guard let cutout = PortraitCutout.cutout(cgImage: cg, orientation: orientation) else { return nil }
        return UIImage(cgImage: cutout)
    }
}

private extension CGImagePropertyOrientation {
    init(_ uiOrientation: UIImage.Orientation) {
        switch uiOrientation {
        case .up: self = .up
        case .upMirrored: self = .upMirrored
        case .down: self = .down
        case .downMirrored: self = .downMirrored
        case .left: self = .left
        case .leftMirrored: self = .leftMirrored
        case .right: self = .right
        case .rightMirrored: self = .rightMirrored
        @unknown default: self = .up
        }
    }
}
