import SwiftUI
import SwiftData
import FotoworkDesign
import FeatureIDPhoto
import FeatureDocuments
import FeatureAvatar
import FeatureSettings

enum AppTab: CaseIterable {
    case idPhoto, docs, avatar, settings

    var title: String {
        switch self {
        case .idPhoto: "Ảnh thẻ"
        case .docs: "Giấy tờ"
        case .avatar: "Avatar"
        case .settings: "Cài đặt"
        }
    }

    var icon: String {
        switch self {
        case .idPhoto: "person.crop.rectangle"
        case .docs: "doc.text"
        case .avatar: "person.crop.circle"
        case .settings: "gearshape"
        }
    }
}

struct RootView: View {
    @State private var tab: AppTab = .idPhoto
    @State private var barHidden = false
    @State private var pendingTool: QuickTool?
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        ZStack(alignment: .bottom) {
            Fotowork.Palette.background.ignoresSafeArea()

            content
                .onPreferenceChange(TabBarHiddenKey.self) { barHidden = $0 }

            if !barHidden {
                FotoworkTabBar(selection: $tab)
                    .padding(.horizontal, 16)
                    .padding(.bottom, 6)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .preferredColorScheme(.light)
    }

    @ViewBuilder
    private var content: some View {
        switch tab {
        case .idPhoto:
            IDPhotoHomeView { tool in
                if tool == .avatar {
                    tab = .avatar
                } else {
                    pendingTool = tool
                    tab = .docs
                }
            }
        case .docs: DocumentsHomeView(openTool: $pendingTool)
        case .avatar: AvatarHomeView()
        case .settings:
            SettingsHomeView {
                let items = (try? modelContext.fetch(FetchDescriptor<DossierItem>())) ?? []
                items.forEach(modelContext.delete)
                try? modelContext.save()
                return items.count
            }
        }
    }
}

struct FotoworkTabBar: View {
    @Binding var selection: AppTab

    var body: some View {
        HStack(spacing: 4) {
            ForEach(AppTab.allCases, id: \.self) { item in
                Button {
                    selection = item
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: item.icon).font(.system(size: 20))
                        Text(item.title).font(.bvp(.caption2, selection == item ? .bold : .medium))
                    }
                    .foregroundStyle(selection == item ? Fotowork.Palette.primary : Fotowork.Palette.textSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(selection == item ? Fotowork.Palette.primaryTint : .clear,
                               in: RoundedRectangle(cornerRadius: 27, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(6)
        .frame(height: 66)
        .background(Fotowork.Palette.surface, in: .capsule)
        .overlay(Capsule().stroke(Fotowork.Palette.border, lineWidth: 1))
        .shadow(color: Fotowork.barShadow, radius: 24, y: 8)
    }
}

#Preview {
    RootView()
}
