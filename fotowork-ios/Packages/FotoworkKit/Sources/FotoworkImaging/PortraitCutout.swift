import CoreImage
import CoreImage.CIFilterBuiltins
import Vision
import ImageIO

/// Cuts the subject out of a photo as an image with a transparent background,
/// using the on-device Vision foreground mask. Returns nil when no subject is found
/// (e.g. in the simulator, where the segmentation request has no result).
public enum PortraitCutout {
    private static let context = CIContext()

    public static func cutout(cgImage: CGImage, orientation: CGImagePropertyOrientation) -> CGImage? {
        let oriented = CIImage(cgImage: cgImage).oriented(orientation)
        let image = oriented.transformed(
            by: CGAffineTransform(translationX: -oriented.extent.origin.x, y: -oriented.extent.origin.y)
        )

        let request = VNGenerateForegroundInstanceMaskRequest()
        let handler = VNImageRequestHandler(ciImage: image, options: [:])
        guard (try? handler.perform([request])) != nil,
              let result = request.results?.first,
              !result.allInstances.isEmpty,
              let maskBuffer = try? result.generateScaledMaskForImage(forInstances: result.allInstances, from: handler)
        else { return nil }

        let mask = CIImage(cvPixelBuffer: maskBuffer)
        let blend = CIFilter.blendWithMask()
        blend.inputImage = image
        blend.backgroundImage = CIImage(color: CIColor(red: 0, green: 0, blue: 0, alpha: 0)).cropped(to: image.extent)
        blend.maskImage = mask
        guard let output = blend.outputImage else { return nil }
        return context.createCGImage(output, from: image.extent)
    }
}
