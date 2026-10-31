import SwiftUI
import FotoworkDesign

enum DocRoute: Hashable {
    case scan, cccd, compress, sign, dossier
}

public struct DocumentsHomeView: View {
    @State private var path = NavigationPath()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    public init() {}

    public var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                FotoworkBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        header
                        LazyVGrid(columns: columns, spacing: 12) {
                            GlassTile(title: "Scan tài liệu", subtitle: "PDF nhiều trang", systemImage: "doc.viewfinder") {
                                path.append(DocRoute.scan)
                            }
                            GlassTile(title: "CCCD hai mặt", subtitle: "Lên 1 trang A4", systemImage: "person.crop.rectangle") {
                                path.append(DocRoute.cccd)
                            }
                            GlassTile(title: "Nén file", subtitle: "Đúng giới hạn nơi nộp", systemImage: "arrow.down.right.and.arrow.up.left") {
                                path.append(DocRoute.compress)
                            }
                            GlassTile(title: "Ký tên", subtitle: "Lên file PDF", systemImage: "signature") {
                                path.append(DocRoute.sign)
                            }
                        }
                        dossierCard
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
                    case .dossier: DossierView()
                    }
                }
            }
        }
    }

    private var header: some View {
        HStack {
            Text("Giấy tờ")
                .font(.bvp(.largeTitle, .bold))
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()
            Button {
                // search — later
            } label: {
                Image(systemName: "magnifyingglass")
                    .font(.bvp(size: 18, .semibold))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)
        }
        .frame(height: 48)
    }

    private var dossierCard: some View {
        Button {
            path.append(DocRoute.dossier)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: "checklist")
                    .font(.bvp(.title3))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 44, height: 44)
                    .background(Fotowork.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 3) {
                    Text("Bộ hồ sơ").font(.bvp(.headline, .semibold)).foregroundStyle(Fotowork.Palette.textPrimary)
                    Text("Checklist giấy tờ cần chuẩn bị").font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Fotowork.Palette.textMuted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard()
        }
        .buttonStyle(.plain)
    }
}
