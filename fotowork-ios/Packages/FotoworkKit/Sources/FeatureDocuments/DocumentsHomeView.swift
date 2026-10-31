import SwiftUI
import FotoworkDesign

enum DocRoute: Hashable {
    case scan, cccd, compress, sign, dossier
}

public struct DocumentsHomeView: View {
    @State private var path = NavigationPath()

    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14),
    ]

    public init() {}

    public var body: some View {
        NavigationStack(path: $path) {
            ZStack {
                FotoworkBackground()
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Giấy tờ")
                            .font(.largeTitle.bold())
                            .foregroundStyle(.white)
                            .padding(.top, 8)

                        LazyVGrid(columns: columns, spacing: 14) {
                            GlassTile(title: "Scan tài liệu", subtitle: "Quét ra PDF", systemImage: "doc.viewfinder", tint: Fotowork.Palette.link) {
                                path.append(DocRoute.scan)
                            }
                            GlassTile(title: "CCCD 2 mặt", subtitle: "Ghép 1 trang A4", systemImage: "person.crop.rectangle", tint: Fotowork.Palette.green) {
                                path.append(DocRoute.cccd)
                            }
                            GlassTile(title: "Nén file", subtitle: "Giảm dung lượng", systemImage: "archivebox", tint: Fotowork.Palette.orange) {
                                path.append(DocRoute.compress)
                            }
                            GlassTile(title: "Ký tên", subtitle: "Ký lên tài liệu", systemImage: "signature", tint: Fotowork.Palette.yellow) {
                                path.append(DocRoute.sign)
                            }
                        }

                        dossierCard
                    }
                    .padding(.horizontal, 20)
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

    private var dossierCard: some View {
        Button {
            path.append(DocRoute.dossier)
        } label: {
            HStack(spacing: 14) {
                Image(systemName: "checklist")
                    .font(.title3)
                    .foregroundStyle(Fotowork.Palette.purple)
                    .frame(width: 48, height: 48)
                    .background(Fotowork.Palette.purple.opacity(0.18), in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    Text("Bộ hồ sơ").font(.headline).foregroundStyle(.white)
                    Text("Checklist giấy tờ cần chuẩn bị").font(.footnote).foregroundStyle(Fotowork.Palette.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(Fotowork.Palette.textSecondary)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .glassEffect(.regular.interactive(), in: .rect(cornerRadius: 20))
        }
        .buttonStyle(.plain)
    }
}
