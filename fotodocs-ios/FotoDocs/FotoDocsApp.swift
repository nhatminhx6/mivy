import SwiftUI
import SwiftData
import FeatureDocuments
import FotoDocsDesign

@main
struct FotoDocsApp: App {
    init() {
        FotoFonts.register()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.font, .bvp(.body))
        }
        .modelContainer(for: [DossierItem.self, ExpenseReceipt.self])
    }
}
