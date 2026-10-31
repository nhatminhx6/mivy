import SwiftUI
import SwiftData
import FeatureDocuments
import FotoworkDesign

@main
struct FotoworkApp: App {
    init() {
        FotoFonts.register()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.font, .bvp(.body))
        }
        .modelContainer(for: DossierItem.self)
    }
}
