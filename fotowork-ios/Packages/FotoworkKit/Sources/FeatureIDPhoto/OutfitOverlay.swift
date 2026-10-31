import UIKit
import FotoworkImaging

/// Code-rendered outfit overlay (v1): draws a flat vest / shirt / áo dài on the
/// lower part of the photo so picking an outfit visibly changes the result.
/// A photoreal template-PNG version comes later.
enum OutfitOverlay {
    static func apply(_ image: UIImage, outfit: OutfitOption) -> UIImage {
        guard outfit != .keep else { return image }
        let renderer = UIGraphicsImageRenderer(size: image.size, format: {
            let f = UIGraphicsImageRendererFormat.default()
            f.scale = image.scale
            return f
        }())
        return renderer.image { ctx in
            image.draw(at: .zero)
            draw(outfit, in: ctx.cgContext, size: image.size)
        }
    }

    private static func color(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }

    private static func draw(_ outfit: OutfitOption, in cg: CGContext, size: CGSize) {
        let w = size.width
        let h = size.height
        let shoulderY = h * 0.58
        let ch = h - shoulderY

        func p(_ fx: CGFloat, _ fyFromShoulder: CGFloat) -> CGPoint {
            CGPoint(x: w * fx, y: shoulderY + ch * fyFromShoulder)
        }

        // Shared jacket/body block with sloped shoulders.
        func bodyPath() -> UIBezierPath {
            let path = UIBezierPath()
            path.move(to: CGPoint(x: 0, y: h))
            path.addLine(to: p(0, 0.18))
            path.addQuadCurve(to: p(0.5, 0.05), controlPoint: p(0.25, 0))
            path.addQuadCurve(to: p(1, 0.18), controlPoint: p(0.75, 0))
            path.addLine(to: CGPoint(x: w, y: h))
            path.close()
            return path
        }

        switch outfit {
        case .vest:
            color(0x1E2633).setFill()
            bodyPath().fill()
            // Shirt V
            let shirt = UIBezierPath()
            shirt.move(to: p(0.5, 0.60))
            shirt.addLine(to: p(0.37, 0.10))
            shirt.addLine(to: p(0.63, 0.10))
            shirt.close()
            color(0xF2F4F8).setFill()
            shirt.fill()
            // Tie
            let tie = UIBezierPath()
            tie.move(to: p(0.5, 0.12))
            tie.addLine(to: p(0.45, 0.22))
            tie.addLine(to: p(0.475, 1.0))
            tie.addLine(to: p(0.525, 1.0))
            tie.addLine(to: p(0.55, 0.22))
            tie.close()
            color(0x2B3A5B).setFill()
            tie.fill()

        case .shirt:
            color(0xE8EAF0).setFill()
            bodyPath().fill()
            // Collar
            let collarL = UIBezierPath()
            collarL.move(to: p(0.5, 0.06))
            collarL.addLine(to: p(0.5, 0.30))
            collarL.addLine(to: p(0.38, 0.12))
            collarL.close()
            let collarR = UIBezierPath()
            collarR.move(to: p(0.5, 0.06))
            collarR.addLine(to: p(0.5, 0.30))
            collarR.addLine(to: p(0.62, 0.12))
            collarR.close()
            color(0xCDD3E0).setFill()
            collarL.fill()
            collarR.fill()
            // Placket + buttons
            color(0xCDD3E0).setStroke()
            let placket = UIBezierPath()
            placket.move(to: p(0.5, 0.30))
            placket.addLine(to: CGPoint(x: w * 0.5, y: h))
            placket.lineWidth = max(1, w * 0.006)
            placket.stroke()
            color(0x9AA3B5).setFill()
            for f in [CGFloat(0.5), 0.7, 0.9] {
                let r = w * 0.012
                let c = p(0.5, f)
                UIBezierPath(ovalIn: CGRect(x: c.x - r, y: c.y - r, width: r * 2, height: r * 2)).fill()
            }

        case .aodai:
            color(0xB23A48).setFill()
            bodyPath().fill()
            // Diagonal closure
            let diag = UIBezierPath()
            diag.move(to: p(0.5, 0.06))
            diag.addLine(to: p(0.78, 0.35))
            diag.lineWidth = max(1.5, w * 0.01)
            color(0x8E2C38).setStroke()
            diag.stroke()
            // Mandarin collar
            let collar = UIBezierPath(roundedRect: CGRect(x: w * 0.42, y: shoulderY + ch * 0.02, width: w * 0.16, height: ch * 0.12), cornerRadius: w * 0.03)
            color(0x8E2C38).setFill()
            collar.fill()

        case .keep:
            break
        }
    }
}
