import SwiftUI

/// Flat light background for all content screens.
public struct FotoworkBackground: View {
    public init() {}

    public var body: some View {
        Fotowork.Palette.background
            .ignoresSafeArea()
    }
}

#Preview {
    FotoworkBackground()
}
