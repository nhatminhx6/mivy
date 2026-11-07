import SwiftUI
import SwiftData
import FeatureDocuments
import FeatureIDPhoto
import FotoDocsDesign
import FotoDocsCore

@main
struct FotoDocsApp: App {
    @State private var account = MivyAccount()

    init() {
        FotoFonts.register()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.font, .bvp(.body))
                .environment(\.mivyAccount, account)
                .task { await account.restore() }
                #if DEBUG
                .task { await DebugVestRender.runIfRequested() }
                #endif
        }
        .modelContainer(for: [DossierItem.self, ExpenseReceipt.self])
    }
}
