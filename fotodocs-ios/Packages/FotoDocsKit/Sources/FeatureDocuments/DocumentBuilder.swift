import UIKit

/// Builds shareable document files (PDF / compressed image) on-device.
enum DocumentBuilder {
    /// A4 in PDF points (72 dpi).
    static let a4 = CGSize(width: 595.2, height: 841.8)

    static func pt(_ mm: Double) -> CGFloat { CGFloat(mm) / 25.4 * 72 }

    static func write(_ data: Data, name: String) -> URL {
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        try? data.write(to: url)
        return url
    }

    /// One image per A4 page, aspect-fit with margin.
    static func imagesPDF(_ images: [UIImage], name: String = "fotodocs-scan.pdf") -> URL? {
        guard !images.isEmpty else { return nil }
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: a4))
        let data = renderer.pdfData { ctx in
            let margin: CGFloat = 28
            let box = CGRect(x: margin, y: margin, width: a4.width - margin * 2, height: a4.height - margin * 2)
            for image in images {
                ctx.beginPage()
                draw(image, aspectFitIn: box)
            }
        }
        return write(data, name: name)
    }

    /// ID card (CCCD) front + optional back at real size on one A4 page.
    static func cccdA4(front: UIImage, back: UIImage?, name: String = "fotodocs-cccd-a4.pdf") -> URL? {
        let cardW = pt(85.6), cardH = pt(53.98)
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: a4))
        let data = renderer.pdfData { ctx in
            ctx.beginPage()
            let cx = a4.width / 2
            let frontRect = CGRect(x: cx - cardW / 2, y: a4.height * 0.26 - cardH / 2, width: cardW, height: cardH)
            label("Mặt trước", above: frontRect)
            draw(front, aspectFillIn: frontRect, corner: 8)
            if let back {
                let backRect = CGRect(x: cx - cardW / 2, y: a4.height * 0.58 - cardH / 2, width: cardW, height: cardH)
                label("Mặt sau", above: backRect)
                draw(back, aspectFillIn: backRect, corner: 8)
            }
        }
        return write(data, name: name)
    }

    /// Flatten a document image with a signature overlay as a one-page PDF.
    static func signed(document: UIImage, signature: UIImage, name: String = "fotodocs-signed.pdf") -> URL? {
        let size = document.size
        guard size.width > 0, size.height > 0 else { return nil }
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: size))
        let data = renderer.pdfData { ctx in
            ctx.beginPage()
            document.draw(in: CGRect(origin: .zero, size: size))
            signature.draw(in: CGRect(origin: .zero, size: size))
        }
        return write(data, name: name)
    }

    static func compressImage(_ image: UIImage, maxKB: Int, name: String = "fotodocs-nen.jpg") -> (url: URL, kb: Int)? {
        var quality: CGFloat = 0.92
        var data = image.jpegData(compressionQuality: quality)
        while let current = data, current.count > maxKB * 1024, quality > 0.1 {
            quality -= 0.07
            data = image.jpegData(compressionQuality: quality)
        }
        guard let final = data else { return nil }
        return (write(final, name: name), final.count / 1024)
    }

    // MARK: - Drawing helpers (inside a UIGraphics context)

    private static func draw(_ image: UIImage, aspectFitIn box: CGRect) {
        let scale = min(box.width / image.size.width, box.height / image.size.height)
        let w = image.size.width * scale, h = image.size.height * scale
        image.draw(in: CGRect(x: box.midX - w / 2, y: box.midY - h / 2, width: w, height: h))
    }

    private static func draw(_ image: UIImage, aspectFillIn box: CGRect, corner: CGFloat) {
        let ctx = UIGraphicsGetCurrentContext()
        let path = UIBezierPath(roundedRect: box, cornerRadius: corner)
        ctx?.saveGState()
        path.addClip()
        let scale = max(box.width / image.size.width, box.height / image.size.height)
        let w = image.size.width * scale, h = image.size.height * scale
        image.draw(in: CGRect(x: box.midX - w / 2, y: box.midY - h / 2, width: w, height: h))
        ctx?.restoreGState()
        UIColor(white: 0.85, alpha: 1).setStroke()
        path.lineWidth = 1
        path.stroke()
    }

    private static func label(_ text: String, above rect: CGRect) {
        let attrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold),
            .foregroundColor: UIColor.darkGray,
        ]
        (text as NSString).draw(at: CGPoint(x: rect.minX, y: rect.minY - 16), withAttributes: attrs)
    }
}
