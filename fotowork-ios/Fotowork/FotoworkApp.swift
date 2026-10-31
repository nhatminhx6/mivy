import SwiftUI
import SwiftData
import FeatureDocuments

@main
struct FotoworkApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(for: DossierItem.self)
    }
}
