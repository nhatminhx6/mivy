import SwiftUI
import FotoworkDesign
import FeatureIDPhoto
import FeatureDocuments
import FeatureAvatar
import FeatureSettings

struct RootView: View {
    var body: some View {
        TabView {
            Tab("Ảnh thẻ", systemImage: "person.crop.square.badge.camera") {
                IDPhotoHomeView()
            }
            Tab("Giấy tờ", systemImage: "doc.text.viewfinder") {
                DocumentsHomeView()
            }
            Tab("Avatar", systemImage: "person.crop.circle.badge.plus") {
                AvatarHomeView()
            }
            Tab("Cài đặt", systemImage: "gearshape") {
                SettingsHomeView()
            }
        }
        .tint(Fotowork.Palette.link)
        .preferredColorScheme(.dark)
    }
}

#Preview {
    RootView()
}
