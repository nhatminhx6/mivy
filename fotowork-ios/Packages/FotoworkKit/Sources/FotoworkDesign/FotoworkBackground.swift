import SwiftUI

/// Dark backdrop with large, soft colour blobs so the Liquid Glass reads clearly.
public struct FotoworkBackground: View {
    public init() {}

    public var body: some View {
        ZStack {
            Fotowork.Palette.background
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                ZStack {
                    blob(Fotowork.Palette.blobBlue, size: w * 0.95, opacity: 0.45)
                        .offset(x: -w * 0.28, y: -h * 0.08)
                    blob(Fotowork.Palette.blobPurple, size: w * 0.85, opacity: 0.38)
                        .offset(x: w * 0.38, y: h * 0.12)
                    blob(Fotowork.Palette.blobTeal, size: w * 0.75, opacity: 0.30)
                        .offset(x: w * 0.05, y: h * 0.55)
                }
            }
        }
        .ignoresSafeArea()
    }

    private func blob(_ color: Color, size: CGFloat, opacity: Double) -> some View {
        Circle()
            .fill(color)
            .frame(width: size, height: size)
            .blur(radius: 90)
            .opacity(opacity)
    }
}

#Preview {
    FotoworkBackground()
}
