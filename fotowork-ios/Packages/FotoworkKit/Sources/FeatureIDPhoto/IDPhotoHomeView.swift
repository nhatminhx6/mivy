import SwiftUI
import FotoworkCore
import FotoworkDesign

public struct IDPhotoHomeView: View {
    @Environment(\.presetStore) private var store
    @State private var model = IDPhotoViewModel()
    @State private var router = IDPhotoRouter()
    @State private var showCountrySheet = false
    @State private var showVisaSheet = false
    @State private var showAllSizes = false
    private let onTool: (QuickTool) -> Void

    public init(onTool: @escaping (QuickTool) -> Void = { _ in }) {
        self.onTool = onTool
    }

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    public var body: some View {
        NavigationStack(path: $router.path) {
            ZStack {
                FotoworkBackground()
                ScrollView {
                    VStack(spacing: 18) {
                        header
                        hero
                        grid
                        quickTools
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 96)
                }
                .navigationDestination(for: CaptureTarget.self) { target in
                    CaptureView(target: target)
                }
            }
            .toolbar(.hidden, for: .navigationBar)
        }
        .task { model.loadIfNeeded(using: store) }
        .sheet(isPresented: $showCountrySheet) {
            CountryPickerSheet(origins: model.origins, selected: model.selectedOrigin) { origin in
                model.selectedOrigin = origin
                showCountrySheet = false
            }
        }
        .sheet(isPresented: $showAllSizes) {
            AllSizesSheet(origins: model.origins, destinations: model.visaDestinations) { target in
                showAllSizes = false
                router.push(target)
            }
        }
        .sheet(isPresented: $showVisaSheet) {
            VisaPickerSheet(destinations: model.visaDestinations) { destination in
                showVisaSheet = false
                router.push(.visa(destination))
            }
        }
    }

    // MARK: Header

    private var header: some View {
        HStack {
            Button {
                showAllSizes = true
            } label: {
                Image(systemName: "square.grid.2x2.fill")
                    .font(.bvp(size: 16))
                    .foregroundStyle(Fotowork.Palette.primary)
                    .frame(width: 48, height: 48)
                    .fotoCardCircle()
            }
            .buttonStyle(.plain)

            Spacer()
            Text("Fotowork")
                .font(.bvp(.title3, .bold))
                .foregroundStyle(Fotowork.Palette.textPrimary)
            Spacer()

            GlassPill(model.originCode) { showCountrySheet = true }
        }
        .frame(height: 48)
    }

    // MARK: Hero

    private var hero: some View {
        ZStack(alignment: .bottom) {
            HStack(spacing: 18) {
                Image(systemName: "camera.fill")
                    .font(.bvp(size: 30))
                    .foregroundStyle(.white)
                    .frame(width: 68, height: 68)
                    .background(.white.opacity(0.14), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke(.white.opacity(0.28)))
                VStack(alignment: .leading, spacing: 8) {
                    Text("Chụp ảnh thẻ")
                        .font(.bvp(size: 24, .bold))
                        .foregroundStyle(.white)
                    Text("Hộ chiếu · \(model.passportSizeText) · nền trắng")
                        .font(.bvp(.subheadline))
                        .foregroundStyle(Fotowork.Palette.onPrimarySoft)
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 22)
            .padding(.top, 26)
            .padding(.bottom, 42)
            .background(Fotowork.Palette.primary, in: RoundedRectangle(cornerRadius: Fotowork.Radius.hero, style: .continuous))

            Button {
                router.push(startTarget)
            } label: {
                HStack(spacing: 12) {
                    Text("Bắt đầu").font(.bvp(.subheadline, .bold)).foregroundStyle(Fotowork.Palette.primary)
                    Image(systemName: "arrow.right")
                        .font(.bvp(.caption, .bold))
                        .foregroundStyle(.white)
                        .frame(width: 36, height: 36)
                        .background(Fotowork.Palette.primary, in: .circle)
                }
                .padding(.leading, 22)
                .padding(.trailing, 8)
                .frame(height: 52)
                .background(.white, in: .capsule)
                .overlay(Capsule().stroke(Fotowork.Palette.border))
                .shadow(color: Fotowork.barShadow, radius: 18, y: 8)
            }
            .buttonStyle(.plain)
            .offset(y: 26)
        }
        .padding(.bottom, 26)
    }

    private var startTarget: CaptureTarget {
        if let origin = model.selectedOrigin, origin.print != nil {
            return .passport(origin)
        }
        return .idCard4x6
    }

    // MARK: 2×2 grid

    private var grid: some View {
        LazyVGrid(columns: columns, spacing: 12) {
            homeTile(title: "3×4", icon: "person.text.rectangle", label: "Hồ sơ", caption: "Thẻ sinh viên") {
                router.push(.idCard3x4)
            }
            homeTile(title: "4×6", icon: "book.closed", label: "Hộ chiếu", caption: "Nền trắng") {
                router.push(.idCard4x6)
            }
            homeTile(title: "Xin việc", icon: "briefcase.fill", label: "Ghép vest", caption: CaptureTarget.jobApplication.sizeText) {
                router.push(.jobApplication)
            }
            homeTile(title: "Visa", icon: "airplane", label: "\(model.visaDestinations.count) nước", caption: "Hàn, Nhật, Đài…") {
                showVisaSheet = true
            }
        }
    }

    private func homeTile(title: String, icon: String, label: String, caption: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(spacing: 8) {
                    Image(systemName: icon).font(.bvp(size: 18)).foregroundStyle(Fotowork.Palette.primary)
                    Text(title).font(.bvp(.title3, .bold)).foregroundStyle(Fotowork.Palette.textPrimary)
                }
                HStack(alignment: .bottom) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(label).font(.bvp(.subheadline, .semibold)).foregroundStyle(Fotowork.Palette.primary)
                        Text(caption).font(.bvp(.footnote)).foregroundStyle(Fotowork.Palette.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.bvp(.caption2, .bold))
                        .foregroundStyle(Fotowork.Palette.primary)
                        .frame(width: 34, height: 34)
                        .background(Fotowork.Palette.primaryTint, in: .circle)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard(Fotowork.Radius.tile)
        }
        .buttonStyle(.plain)
    }

    // MARK: Quick tools

    private var quickTools: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Công cụ nhanh")
                .font(.bvp(.headline, .semibold))
                .foregroundStyle(Fotowork.Palette.textPrimary)
            HStack(alignment: .top, spacing: 4) {
                CircleToolButton(title: "Scan", systemImage: "doc.viewfinder") { onTool(.scan) }
                CircleToolButton(title: "CCCD", systemImage: "person.crop.rectangle") { onTool(.cccd) }
                CircleToolButton(title: "Nén file", systemImage: "arrow.down.right.and.arrow.up.left") { onTool(.compress) }
                CircleToolButton(title: "Ký tên", systemImage: "signature") { onTool(.sign) }
                CircleToolButton(title: "Avatar", systemImage: "person.crop.circle") { onTool(.avatar) }
            }
        }
    }
}

#Preview {
    IDPhotoHomeView()
}
