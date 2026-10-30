import SwiftUI
import FotoworkDesign

public struct DocumentsHomeView: View {
    public init() {}

    public var body: some View {
        ComingSoonScreen(
            title: "Giấy tờ",
            subtitle: "Scan tài liệu · CCCD 2 mặt · Nén file · Ký tên · Bộ hồ sơ",
            systemImage: "doc.text.viewfinder"
        )
    }
}

#Preview {
    DocumentsHomeView()
}
