import SwiftUI
import PhotosUI
import VisionKit
import FotoDocsCore
import FotoDocsImaging
import FotoDocsDesign

struct VisaFormRoute: Hashable {
    let id: String
}

/// "Điền form visa": scan the CCCD (QR) and passport (MRZ) once, then copy each box of a country's
/// visa form, or print the official form already filled in.
struct VisaHomeView: View {
    @State private var store = VisaProfileStore()
    @State private var scanning: ScanKind?
    @State private var pickerItem: PhotosPickerItem?
    @State private var showPicker = false
    @State private var showScanner = false
    @State private var reading = false
    @State private var message: (text: String, ok: Bool)?
    @State private var editing = false

    enum ScanKind { case cccd, passport }

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    profileCard
                    scanRow
                    if reading {
                        HStack(spacing: 12) {
                            ProgressView()
                            Text("Đang đọc giấy tờ…").font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                        }
                        .padding(16)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .fotoCard(16)
                    }
                    if let message {
                        Label(message.text, systemImage: message.ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(message.ok ? FotoDocs.Palette.success : FotoDocs.Palette.warning)
                            .padding(16)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .fotoCard(16)
                    }
                    Text("Chọn nước để điền form")
                        .font(.bvp(.headline, .semibold))
                        .foregroundStyle(FotoDocs.Palette.textPrimary)
                        .padding(.top, 4)
                    VStack(spacing: 10) {
                        ForEach(VisaForms.all) { spec in
                            NavigationLink(value: VisaFormRoute(id: spec.id)) { countryRow(spec) }
                                .buttonStyle(.plain)
                        }
                    }
                    Text("Giấy tờ kèm hồ sơ")
                        .font(.bvp(.headline, .semibold))
                        .foregroundStyle(FotoDocs.Palette.textPrimary)
                        .padding(.top, 4)
                    VStack(spacing: 10) {
                        extraRow(.itinerary, title: "Lịch trình chuyến đi", detail: "Bảng từng ngày bằng tiếng Anh, xuất PDF", icon: "calendar")
                        extraRow(.translations, title: "Bản dịch giấy tờ", detail: "Khai sinh, xác nhận cư trú, xác nhận công tác", icon: "character.book.closed")
                    }
                    Label("Thông tin chỉ lưu trên điện thoại này, không gửi đi đâu.", systemImage: "lock.fill")
                        .font(.bvp(.footnote))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                .padding(20)
                .padding(.bottom, 40)
            }
        }
        .navigationTitle("Điền form visa")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .navigationDestination(for: VisaFormRoute.self) { route in
            if let spec = VisaForms.spec(route.id) { VisaCopyView(spec: spec, store: store) }
        }
        .navigationDestination(for: VisaExtraRoute.self) { route in
            switch route {
            case .itinerary: ItineraryView(profile: store.profile)
            case .translations: TranslationListView()
            case .translation(let id):
                if let t = TranslationTemplate.all.first(where: { $0.id == id }) { TranslationEditView(template: t, profile: store.profile) }
            }
        }
        .photosPicker(isPresented: $showPicker, selection: $pickerItem, matching: .images)
        .onChange(of: pickerItem) { _, item in
            guard let item else { return }
            pickerItem = nil
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) { await read(ui) }
            }
        }
        .sheet(isPresented: $showScanner) {
            DocumentScanner { pages in
                showScanner = false
                if let page = pages.first { Task { await read(page) } }
            } onCancel: {
                showScanner = false
            }
            .ignoresSafeArea()
        }
        .sheet(isPresented: $editing) { VisaProfileSheet(store: store) }
    }

    // MARK: Profile

    private var profileCard: some View {
        let p = store.profile
        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Hồ sơ của tôi").font(.bvp(.subheadline)).foregroundStyle(FotoDocs.Palette.onPrimarySoft)
                    Text(p.isEmpty ? "Chưa có thông tin" : p.latinFullName)
                        .font(.bvp(.title3, .bold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                }
                Spacer()
                Button { editing = true } label: {
                    Text(p.isEmpty ? "Nhập tay" : "Sửa")
                        .font(.bvp(.subheadline, .semibold))
                        .foregroundStyle(FotoDocs.Palette.primary)
                        .padding(.horizontal, 14)
                        .frame(height: 36)
                        .background(.white, in: .capsule)
                }
                .buttonStyle(.plain)
            }
            HStack(spacing: 8) {
                chip("CCCD", done: p.hasCCCD)
                chip("Hộ chiếu", done: p.hasPassport)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(FotoDocs.Palette.primary, in: RoundedRectangle(cornerRadius: FotoDocs.Radius.hero, style: .continuous))
    }

    private func chip(_ title: String, done: Bool) -> some View {
        Label(done ? "\(title) đã có" : "Chưa có \(title)", systemImage: done ? "checkmark.circle.fill" : "circle.dashed")
            .font(.bvp(.caption, .semibold))
            .foregroundStyle(done ? .white : FotoDocs.Palette.onPrimarySoft)
            .padding(.horizontal, 10)
            .frame(height: 28)
            .background(.white.opacity(done ? 0.2 : 0.1), in: .capsule)
    }

    private var scanRow: some View {
        HStack(spacing: 12) {
            scanTile(.cccd, title: "Quét CCCD", detail: "Mặt trước, có mã QR", icon: "qrcode.viewfinder")
            scanTile(.passport, title: "Quét hộ chiếu", detail: "Trang có ảnh", icon: "person.text.rectangle")
        }
    }

    private func scanTile(_ kind: ScanKind, title: String, detail: String, icon: String) -> some View {
        Menu {
            if VNDocumentCameraViewController.isSupported {
                Button("Chụp ảnh", systemImage: "camera") { scanning = kind; showScanner = true }
            }
            Button("Chọn ảnh có sẵn", systemImage: "photo") { scanning = kind; showPicker = true }
        } label: {
            VStack(spacing: 6) {
                Image(systemName: icon).font(.bvp(.title2)).foregroundStyle(FotoDocs.Palette.primary)
                Text(title).font(.bvp(.subheadline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Text(detail).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
            }
            .frame(maxWidth: .infinity, minHeight: 104)
            .fotoCard(18)
        }
        .buttonStyle(.plain)
    }

    private func extraRow(_ route: VisaExtraRoute, title: String, detail: String, icon: String) -> some View {
        NavigationLink(value: route) {
            HStack(spacing: 14) {
                Image(systemName: icon)
                    .font(.bvp(.title3))
                    .foregroundStyle(FotoDocs.Palette.primary)
                    .frame(width: 44, height: 44)
                    .background(FotoDocs.Palette.primaryTint, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                    Text(detail).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
            }
            .padding(14)
            .fotoCard(16)
        }
        .buttonStyle(.plain)
    }

    private func countryRow(_ spec: VisaFormSpec) -> some View {
        HStack(spacing: 14) {
            Text(spec.flag).font(.system(size: 30))
            VStack(alignment: .leading, spacing: 2) {
                Text(spec.name).font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Text(spec.channel).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary).lineLimit(2)
            }
            Spacer(minLength: 8)
            if spec.id == JapanVisaPDF.countryID && JapanVisaPDF.isAvailable {
                Text("PDF").font(.bvp(.caption2, .bold)).foregroundStyle(FotoDocs.Palette.primary)
                    .padding(.horizontal, 8).frame(height: 22)
                    .background(FotoDocs.Palette.primaryTint, in: .capsule)
            }
            Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
        }
        .padding(14)
        .fotoCard(16)
    }

    // MARK: Reading

    private func read(_ image: UIImage) async {
        message = nil
        reading = true
        defer { reading = false }
        guard let cg = image.uprightForVision(maxSide: 3000).cgImage else { return }
        switch await IDDocumentReader.read(cg) {
        case .cccd(let info):
            store.profile.apply(info)
            message = ("Đã đọc CCCD của \(info.fullName)", true)
        case .passport(let mrz):
            store.profile.apply(mrz)
            message = ("Đã đọc hộ chiếu số \(mrz.number)", true)
        case .nothing:
            message = scanning == .passport
                ? ("Chưa đọc được hộ chiếu. Chụp rõ trang có ảnh, thấy đủ 2 dòng mã ở cuối trang, không loá.", false)
                : ("Chưa đọc được mã QR. Chụp rõ mặt trước CCCD gắn chip, đủ sáng, không loá.", false)
        }
    }
}

// MARK: - One country's form

struct VisaCopyView: View {
    let spec: VisaFormSpec
    @Bindable var store: VisaProfileStore
    @State private var copied: String?
    @State private var editing = false
    @State private var showPDF = false

    var body: some View {
        ZStack(alignment: .bottom) {
            FotoDocsBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    header
                    if spec.id == JapanVisaPDF.countryID && JapanVisaPDF.isAvailable {
                        PillButton("Điền form PDF chính thức", systemImage: "doc.richtext") { showPDF = true }
                    }
                    Text("Chạm vào một ô để copy, rồi dán vào form.")
                        .font(.bvp(.footnote))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    VStack(spacing: 8) {
                        ForEach(spec.fields) { field in row(field) }
                    }
                    Button { copyAll() } label: {
                        Label("Copy tất cả (gửi đại lý / người làm hộ)", systemImage: "doc.on.doc")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.primary)
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .fotoCardCapsule()
                    }
                    .buttonStyle(.plain)
                    Text("Mục đích chuyến đi, lịch trình, người bảo lãnh… bạn tự điền theo hồ sơ của mình. Kiểm tra lại từng ô trước khi nộp.")
                        .font(.bvp(.footnote))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                }
                .padding(20)
                .padding(.bottom, 60)
            }
            if let copied {
                Text("Đã copy: \(copied)")
                    .font(.bvp(.subheadline, .semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .padding(.horizontal, 18)
                    .frame(height: 44)
                    .background(FotoDocs.Palette.textPrimary.opacity(0.92), in: .capsule)
                    .padding(.horizontal, 20)
                    .padding(.bottom, 24)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .task(id: copied) {
                        try? await Task.sleep(for: .seconds(1.6))
                        withAnimation { self.copied = nil }
                    }
            }
        }
        .navigationTitle("\(spec.flag) \(spec.name)")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Sửa") { editing = true }
            }
        }
        .sensoryFeedback(.success, trigger: copied) { _, new in new != nil }
        .sheet(isPresented: $editing) { VisaProfileSheet(store: store) }
        .sheet(isPresented: $showPDF) { JapanVisaPDFSheet(profile: store.profile) }
    }

    private var header: some View {
        HStack(spacing: 14) {
            Text(spec.flag).font(.system(size: 40))
            VStack(alignment: .leading, spacing: 3) {
                Text("Form visa \(spec.name)").font(.bvp(.headline, .semibold)).foregroundStyle(FotoDocs.Palette.textPrimary)
                Text(spec.channel).font(.bvp(.caption)).foregroundStyle(FotoDocs.Palette.textSecondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .fotoCard()
    }

    private func row(_ field: VisaFormField) -> some View {
        let value = field.value(store.profile)
        return Button {
            if value.isEmpty {
                editing = true
            } else {
                UIPasteboard.general.string = value
                withAnimation { copied = value }
            }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(field.label)
                        .font(.bvp(.caption, .semibold))
                        .foregroundStyle(FotoDocs.Palette.textSecondary)
                    Text(value.isEmpty ? "Chưa có · bấm để nhập" : value)
                        .font(.bvp(.subheadline, value.isEmpty ? .regular : .semibold))
                        .foregroundStyle(value.isEmpty ? FotoDocs.Palette.textMuted : FotoDocs.Palette.textPrimary)
                        .multilineTextAlignment(.leading)
                    Text(field.hint)
                        .font(.bvp(.caption2))
                        .foregroundStyle(FotoDocs.Palette.textMuted)
                }
                Spacer(minLength: 8)
                Image(systemName: value.isEmpty ? "square.and.pencil" : "doc.on.doc")
                    .font(.bvp(.subheadline))
                    .foregroundStyle(value.isEmpty ? FotoDocs.Palette.textMuted : FotoDocs.Palette.primary)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard(14)
        }
        .buttonStyle(.plain)
        .accessibilityHint(value.isEmpty ? "Nhập thông tin" : "Copy")
    }

    private func copyAll() {
        let text = (["Form visa \(spec.name)"] + spec.fields.compactMap { f in
            let v = f.value(store.profile)
            return v.isEmpty ? nil : "\(f.label): \(v)"
        }).joined(separator: "\n")
        UIPasteboard.general.string = text
        withAnimation { copied = "tất cả \(spec.fields.count) ô" }
    }
}

// MARK: - Edit the profile

struct VisaProfileSheet: View {
    @Bindable var store: VisaProfileStore
    @Environment(\.dismiss) private var dismiss
    @State private var askClear = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Họ tên (như trên hộ chiếu)") {
                    TextField("Họ, vd: NGUYEN", text: $store.profile.surname).textInputAutocapitalization(.characters)
                    TextField("Tên đệm + tên, vd: VAN AN", text: $store.profile.givenNames).textInputAutocapitalization(.characters)
                    TextField("Họ tên có dấu", text: $store.profile.fullNameVN)
                    Picker("Giới tính", selection: $store.profile.sex) {
                        Text("Chưa chọn").tag(Sex?.none)
                        ForEach(Sex.allCases, id: \.self) { Text($0.vi).tag(Sex?.some($0)) }
                    }
                    DayField(title: "Ngày sinh", value: $store.profile.dateOfBirth)
                    TextField("Nơi sinh (tỉnh / thành)", text: $store.profile.placeOfBirth)
                    Picker("Hôn nhân", selection: $store.profile.maritalStatus) {
                        Text("Chưa chọn").tag(MaritalStatus?.none)
                        ForEach(MaritalStatus.allCases, id: \.self) { Text($0.vi).tag(MaritalStatus?.some($0)) }
                    }
                }
                Section("CCCD") {
                    TextField("Số CCCD", text: $store.profile.idNumber).keyboardType(.numberPad)
                    DayField(title: "Ngày cấp", value: $store.profile.idIssueDate)
                    TextField("Địa chỉ thường trú", text: $store.profile.address, axis: .vertical)
                }
                Section("Hộ chiếu") {
                    TextField("Số hộ chiếu", text: $store.profile.passportNumber).textInputAutocapitalization(.characters)
                    DayField(title: "Ngày cấp", value: $store.profile.passportIssueDate)
                    DayField(title: "Ngày hết hạn", value: $store.profile.passportExpiry)
                    TextField("Nơi cấp, vd: Cục Quản lý xuất nhập cảnh", text: $store.profile.passportIssuePlace)
                }
                Section("Liên hệ") {
                    TextField("Số điện thoại, vd: +84 912 345 678", text: $store.profile.phone).keyboardType(.phonePad)
                    TextField("Email", text: $store.profile.email).keyboardType(.emailAddress).textInputAutocapitalization(.never)
                }
                Section("Công việc") {
                    TextField("Nghề nghiệp bằng tiếng Anh, vd: Office staff", text: $store.profile.occupation)
                    TextField("Tên công ty / trường", text: $store.profile.employer)
                    TextField("Địa chỉ công ty / trường", text: $store.profile.employerAddress, axis: .vertical)
                }
                Section {
                    Button("Xoá toàn bộ hồ sơ", role: .destructive) { askClear = true }
                } footer: {
                    Text("Thông tin chỉ lưu trên điện thoại này.")
                }
            }
            .scrollContentBackground(.hidden)
            .background(FotoDocs.Palette.background)
            .navigationTitle("Hồ sơ của tôi")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Xong") { dismiss() } }
            }
            .confirmationDialog("Xoá toàn bộ hồ sơ visa?", isPresented: $askClear, titleVisibility: .visible) {
                Button("Xoá", role: .destructive) { store.clear() }
            }
        }
    }
}

/// An optional day: "Thêm" until set, then a date picker with a clear button.
private struct DayField: View {
    let title: String
    @Binding var value: DayDate?

    var body: some View {
        HStack {
            Text(title)
            Spacer()
            if let current = value {
                DatePicker(title, selection: Binding(get: { current.date }, set: { value = DayDate($0) }), displayedComponents: .date)
                    .labelsHidden()
                    .environment(\.locale, Locale(identifier: "vi_VN"))
                Button { value = nil } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(.tertiary) }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Xoá \(title.lowercased())")
            } else {
                Button("Thêm") { value = DayDate(.now) }
            }
        }
    }
}

extension UIImage {
    /// Orientation baked in (Vision reads raw pixels), longest side capped.
    func uprightForVision(maxSide: CGFloat) -> UIImage {
        let scale = min(1, maxSide / max(size.width, size.height))
        let target = CGSize(width: (size.width * scale).rounded(), height: (size.height * scale).rounded())
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        return UIGraphicsImageRenderer(size: target, format: format).image { _ in
            draw(in: CGRect(origin: .zero, size: target))
        }
    }
}
