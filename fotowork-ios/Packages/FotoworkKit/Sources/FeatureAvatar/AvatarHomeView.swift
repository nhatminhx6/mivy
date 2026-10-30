import SwiftUI
import FotoworkDesign

public struct AvatarHomeView: View {
    public init() {}

    public var body: some View {
        ComingSoonScreen(
            title: "Avatar",
            subtitle: "Công việc · Theo dịp · Sticker · Gia đình — tách nền & ghép khung ngay trên máy",
            systemImage: "person.crop.circle.badge.plus"
        )
    }
}

#Preview {
    AvatarHomeView()
}
