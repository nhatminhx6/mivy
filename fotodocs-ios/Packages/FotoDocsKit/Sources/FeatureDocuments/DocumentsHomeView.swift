import SwiftUI
import FotoDocsDesign

enum DocRoute: Hashable {
    case scan, cccd, compress, sign, visa, expense, dossier
}

public struct DocumentsHomeView: View {
    @State private var path = NavigationPath()
    @State private var showSearch = false
    @Binding private var openTool: QuickTool?

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    /// `openTool`: a shortcut from the home screen; opened once, then reset to nil.
    public init(openTool: Binding<QuickTool?> = .constant(nil)) {
        _openTool = openTool
    }

    public var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                FotoDocsBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header
                        LazyVGrid(columns: columns, spacing: 12) {
                            GlassTile(title: "Scan tài liệu", subtitle: "PDF nhiều trang", systemImage: "doc.viewfinder") {
                                path.append(DocRoute.scan)
                            }
                            GlassTile(title: "Thẻ hai mặt", subtitle: "CCCD, bằng lái, BHYT…", systemImage: "person.crop.rectangle") {
                                path.append(DocRoute.cccd)
                            }
                            GlassTile(title: "Nén file", subtitle: "Đúng giới hạn nơi nộp", systemImage: "arrow.down.right.and.arrow.up.left") {
                                path.append(DocRoute.compress)
                            }
                            GlassTile(title: "Ký tên", subtitle: "Lên file PDF", systemImage: "signature") {
                                path.append(DocRoute.sign)
                            }
                        }
                        wideCard("Điền form visa", "Quét CCCD, hộ chiếu → điền sẵn form", icon: "airplane", route: .visa)
                        wideCard("Công tác phí", "Chụp hoá đơn ra bảng kê Excel / PDF", icon: "receipt", route: .expense)
                        wideCard("Bộ hồ sơ", "Checklist giấy tờ cần chuẩn bị", icon: "checklist", route: .dossier)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 96)
                }
                .toolbar(.hidden, for: .navigationBar)
                .navigationDestination(for: DocRoute.self) { route in
                    switch route {
                    case .scan: ScanView()
                    case .cccd: CCCDView()
                    case .compress: CompressView()
                    case .sign: SignView()
                    case .visa: VisaHomeView()
                    case .expense: ExpenseView()
                    case .dossier: DossierView()
                    }
                }
            }
        }
        .task(id: openTool) {
            guard let tool = openTool else { return }
            switch tool {
            case .scan: path.append(DocRoute.scan)
            case .cccd: path.append(DocRoute.cccd)
            case .compress: path.append(DocRoute.compress)
            case .sign: path.append(DocRoute.sign)
            case .avatar: break
            }
            openTool = nil
        }
        .sheet(isPresented: $showSearch) {
            DocumentSearchSheet { route in
                showSearch = false
                path.append(route)
            }
        }
    }

    private var header: some View {
        HStack {
            Text("Giấy tờ")
                .font(.bvp(.largeTitle, .bold))
                .foregroundStyle(FotoDocs.Palette.textPrimary)
            Spacer()
            Button {
                showSearch = true
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.bvp(size: 18, .semibold))
                    .foregroundStyle(FotoDocs.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
        }
        .frame(height: 48)
    }

    private func wideCard(_ title: String, _ subtitle: String, icon: String, route: DocRoute) -> some View {
        Button {
            path.append(route)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.bvp(.title3))
                    .foregroundStyle(FotoDocs.Palette.primary)
                    .frame(width: 44, height: 44)
                    .background(FotoDocs.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text(title).font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                    Text(subtitle).font(.bvp(.footnote)).foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard()
        }
        .buttonStyle(.plain)
    }
}
