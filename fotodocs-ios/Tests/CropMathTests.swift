import Testing
import CoreGraphics
import FotoDocsImaging

@Suite("Aspect crop math")
struct CropMathTests {
    private func approx(_ a: CGRect, _ b: CGRect, tol: CGFloat = 0.5) -> Bool {
        abs(a.minX - b.minX) < tol && abs(a.minY - b.minY) < tol &&
        abs(a.width - b.width) < tol && abs(a.height - b.height) < tol
    }

    @Test("Portrait crop from a landscape source, centred")
    func portraitFromLandscape() {
        let extent = CGRect(x: 0, y: 0, width: 1600, height: 1200)
        let rect = PortraitEditor.aspectCropRect(in: extent, aspect: 40.0 / 60.0, zoom: 1, offsetY: 0)
        #expect(approx(rect, CGRect(x: 400, y: 0, width: 800, height: 1200)))
    }

    @Test("Zoom shrinks the crop around the centre")
    func zoom() {
        let extent = CGRect(x: 0, y: 0, width: 1600, height: 1200)
        let rect = PortraitEditor.aspectCropRect(in: extent, aspect: 40.0 / 60.0, zoom: 2, offsetY: 0)
        #expect(approx(rect, CGRect(x: 600, y: 300, width: 400, height: 600)))
    }

    @Test("Square target on square source is full frame")
    func squareFull() {
        let extent = CGRect(x: 0, y: 0, width: 1000, height: 1000)
        let rect = PortraitEditor.aspectCropRect(in: extent, aspect: 1, zoom: 1, offsetY: 0)
        #expect(approx(rect, extent))
    }

    @Test("Vertical offset is clamped inside the source")
    func offsetClamp() {
        let extent = CGRect(x: 0, y: 0, width: 1600, height: 1200)
        let rect = PortraitEditor.aspectCropRect(in: extent, aspect: 40.0 / 60.0, zoom: 1, offsetY: 1)
        #expect(rect.minY >= extent.minY - 0.001)
        #expect(rect.maxY <= extent.maxY + 0.001)
    }
}
