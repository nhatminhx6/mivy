import SwiftUI

/// Flat light background for all content screens.
public struct FotoDocsBackground: View {
    public init() {}

    public var body: some View {
        FotoDocs.Palette.background
            .ignoresSafeArea()
    }
}

#Preview {
    FotoDocsBackground()
}
