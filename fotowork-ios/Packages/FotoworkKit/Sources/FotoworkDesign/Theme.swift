import SwiftUI

public extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let red = Double((hex >> 16) & 0xFF) / 255
        let green = Double((hex >> 8) & 0xFF) / 255
        let blue = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: red, green: green, blue: blue, opacity: alpha)
    }
}

/// Fotowork design tokens. Dark base, big colour blobs, Liquid Glass surfaces.
public enum Fotowork {
    public enum Palette {
        public static let background = Color(hex: 0x07080F)

        // Backdrop blobs behind the glass.
        public static let blobBlue = Color(hex: 0x2B72C2)
        public static let blobPurple = Color(hex: 0x6B3FD6)
        public static let blobTeal = Color(hex: 0x1E8F9E)

        // Hero / primary CTA gradient stops.
        public static let heroStart = Color(hex: 0x2B72C2)
        public static let heroMid = Color(hex: 0x3D56D6)
        public static let heroEnd = Color(hex: 0x4A3BBE)

        // Accents by category.
        public static let lime = Color(hex: 0xC8F051)
        public static let green = Color(hex: 0x3DDC84)
        public static let orange = Color(hex: 0xFFA53B)
        public static let red = Color(hex: 0xFF5C5C)
        public static let redSoft = Color(hex: 0xFF8A8A)
        public static let purple = Color(hex: 0xB57CFF)
        public static let yellow = Color(hex: 0xF5D547)
        public static let link = Color(hex: 0x8CC4FF)

        public static let textPrimary = Color.white
        public static let textSecondary = Color(hex: 0xC2C5D8)
    }

    public enum Radius {
        public static let card: CGFloat = 30
        public static let tile: CGFloat = 26
        public static let pill: CGFloat = 999
    }

    public static let heroGradient = LinearGradient(
        colors: [Palette.heroStart, Palette.heroMid, Palette.heroEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}
