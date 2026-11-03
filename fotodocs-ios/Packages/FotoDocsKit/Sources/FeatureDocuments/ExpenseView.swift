import SwiftUI
import SwiftData
import PhotosUI
import VisionKit
import FotoDocsCore
import FotoDocsImaging
import FotoDocsDesign

/// "Công tác phí": snap receipts → on-device OCR reads vendor / date / total → edit → export an
/// expense sheet (Excel, or PDF with the receipt photos) for accounting.
struct ExpenseView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: [SortDescriptor(\ExpenseReceipt.date), SortDescriptor(\ExpenseReceipt.createdAt)])
    private var receipts: [ExpenseReceipt]
    @AppStorage("expense.trip") private var trip = ""
    @State private var pickerItems: [PhotosPickerItem] = []
    @State private var showScanner = false
    @State private var reading = 0
    @State private var editing: ExpenseReceipt?
    @State private var share: SharePayload?
    @State private var askExport = false
    @State private var askClear = false

    private var total: Int { receipts.compactMap(\.amount).reduce(0, +) }
    private var missing: Int { receipts.filter { $0.amount == nil }.count }

    var body: some View {
        ZStack {
            FotoDocsBackground()
            ScrollView {
                VStack(spacing: 16) {
                    summary
                    actions
                    if reading > 0 { readingRow }
                    if receipts.isEmpty {
                        if reading == 0 { emptyHint }
                    } else {
                        list
                        footer
                    }
                }
                .padding(20)
                .padding(.bottom, 40)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationTitle("Công tác phí")
        .navigationBarTitleDisplayMode(.inline)
        .fotoHidesTabBar()
        .toolbarBackground(FotoDocs.Palette.background, for: .navigationBar)
        .toolbar {
            if !receipts.isEmpty {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Xoá tất cả hoá đơn", systemImage: "trash", role: .destructive) { askClear = true }
                    } label: {
                        Image(systemName: "ellipsis")
                    }
                    .accessibilityLabel("Thêm")
                }
            }
        }
        .onChange(of: pickerItems) { _, items in Task { await loadPicked(items) } }
        .sheet(isPresented: $showScanner) {
            DocumentScanner { scanned in
                showScanner = false
                Task { await add(scanned) }
            } onCancel: {
                showScanner = false
            }
            .ignoresSafeArea()
        }
        .sheet(item: $editing) { ExpenseEditSheet(receipt: $0) }
        .sheet(item: $share) { ShareSheet(items: [$0.url]) }
        .confirmationDialog("Xoá tất cả \(receipts.count) hoá đơn?", isPresented: $askClear, titleVisibility: .visible) {
            Button("Xoá tất cả", role: .destructive) { receipts.forEach(context.delete) }
        }
    }

    // MARK: Sections

    private var summary: some View {
        VStack(alignment: .leading, spacing: 16) {
            TextField("", text: $trip, prompt: Text("Tên đợt, vd: Công tác Đà Nẵng 03/2026").foregroundStyle(.white.opacity(0.6)))
                .font(.bvp(.subheadline, .semibold))
                .foregroundStyle(.white)
                .tint(.white)
                .submitLabel(.done)
                .padding(.horizontal, 14)
                .frame(height: 44)
                .background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                Text("Tổng chi").font(.bvp(.subheadline)).foregroundStyle(FotoDocs.Palette.onPrimarySoft)
                Text("\(VND.format(total)) đ")
                    .font(.bvp(size: 34, .bold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                    .contentTransition(.numericText())
            }
            HStack(spacing: 6) {
                Text("\(receipts.count) hoá đơn")
                if missing > 0 {
                    Text("·")
                    Label("\(missing) chưa có số tiền", systemImage: "exclamationmark.circle.fill")
                        .foregroundStyle(FotoDocs.Palette.warningSoft)
                }
            }
            .font(.bvp(.footnote, .semibold))
            .foregroundStyle(FotoDocs.Palette.onPrimarySoft)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(FotoDocs.Palette.primary, in: RoundedRectangle(cornerRadius: FotoDocs.Radius.hero, style: .continuous))
    }

    private var actions: some View {
        HStack(spacing: 12) {
            if VNDocumentCameraViewController.isSupported {
                Button { showScanner = true } label: {
                    DocActionTile(title: "Chụp hoá đơn", icon: "doc.viewfinder", tint: FotoDocs.Palette.link)
                }
                .buttonStyle(.plain)
            }
            PhotosPicker(selection: $pickerItems, maxSelectionCount: 20, matching: .images) {
                DocActionTile(title: "Chọn ảnh", icon: "photo.on.rectangle", tint: FotoDocs.Palette.green)
            }
            .buttonStyle(.plain)
        }
    }

    private var readingRow: some View {
        HStack(spacing: 12) {
            ProgressView()
            Text("Đang đọc \(reading) hoá đơn…")
                .font(.bvp(.subheadline, .semibold))
                .foregroundStyle(FotoDocs.Palette.textPrimary)
            Spacer()
        }
        .padding(16)
        .fotoCard(16)
    }

    private var emptyHint: some View {
        VStack(spacing: 10) {
            Image(systemName: "receipt")
                .font(.bvp(size: 34))
                .foregroundStyle(FotoDocs.Palette.primary)
            Text("Chụp hoặc chọn ảnh hoá đơn")
                .font(.bvp(.headline, .semibold))
                .foregroundStyle(FotoDocs.Palette.textPrimary)
            Text("App tự đọc ngày, nơi chi và tổng tiền ngay trên máy. Bạn kiểm tra lại rồi xuất bảng kê Excel hoặc PDF gửi kế toán.")
                .font(.bvp(.subheadline))
                .foregroundStyle(FotoDocs.Palette.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .fotoCard()
    }

    private var list: some View {
        VStack(spacing: 10) {
            ForEach(receipts) { receipt in
                Button { editing = receipt } label: { row(receipt) }
                    .buttonStyle(.plain)
            }
        }
    }

    private func row(_ r: ExpenseReceipt) -> some View {
        HStack(spacing: 12) {
            ReceiptThumb(data: r.imageData)
            VStack(alignment: .leading, spacing: 3) {
                Text(r.vendor.isEmpty ? "Chưa rõ nơi chi" : r.vendor)
                    .font(.bvp(.subheadline, .semibold))
                    .foregroundStyle(FotoDocs.Palette.textPrimary)
                    .lineLimit(1)
                Label("\(ExpenseExport.day(r.date)) · \(r.category.rawValue)", systemImage: r.category.icon)
                    .labelStyle(.titleOnly)
                    .font(.bvp(.caption))
                    .foregroundStyle(FotoDocs.Palette.textSecondary)
            }
            Spacer(minLength: 8)
            if let amount = r.amount {
                Text(VND.format(amount))
                    .font(.bvp(.subheadline, .bold))
                    .foregroundStyle(FotoDocs.Palette.textPrimary)
                    .monospacedDigit()
            } else {
                Text("Nhập số tiền")
                    .font(.bvp(.caption, .semibold))
                    .foregroundStyle(FotoDocs.Palette.warning)
            }
            Image(systemName: "chevron.right")
                .font(.bvp(.caption, .semibold))
                .foregroundStyle(FotoDocs.Palette.textMuted)
        }
        .padding(12)
        .fotoCard(16)
    }

    private var footer: some View {
        VStack(spacing: 14) {
            Text("Số tiền do app tự đọc nên có thể sai. Bạn bấm vào từng hoá đơn để kiểm tra trước khi gửi.")
                .font(.bvp(.footnote))
                .foregroundStyle(FotoDocs.Palette.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
            PillButton("Xuất bảng kê", systemImage: "square.and.arrow.up") { askExport = true }
                .confirmationDialog("Xuất bảng kê", isPresented: $askExport, titleVisibility: .visible) {
                    Button("Excel (.xlsx)") { share = ExpenseExport.xlsx(receipts, trip: trip).map(SharePayload.init) }
                    Button("PDF kèm ảnh hoá đơn") { share = ExpenseExport.pdf(receipts, trip: trip).map(SharePayload.init) }
                }
        }
        .padding(.top, 4)
    }

    // MARK: Reading

    private func loadPicked(_ items: [PhotosPickerItem]) async {
        guard !items.isEmpty else { return }
        pickerItems = []
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self), let ui = UIImage(data: data) {
                images.append(ui)
            }
        }
        await add(images)
    }

    private func add(_ images: [UIImage]) async {
        reading += images.count
        for image in images {
            let upright = image.uprightForVision(maxSide: 2000)
            var parsed = ParsedReceipt()
            if let cg = upright.cgImage {
                parsed = ReceiptParser.parse(await ReceiptReader.read(cg))
            }
            withAnimation {
                context.insert(ExpenseReceipt(date: parsed.date ?? .now, amount: parsed.amount, vendor: parsed.vendor ?? "",
                                              category: parsed.category, imageData: upright.jpegData(compressionQuality: 0.7)))
                reading -= 1
            }
        }
    }
}

/// Small receipt thumbnail, decoded off the main render pass.
private struct ReceiptThumb: View {
    let data: Data?
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            FotoDocs.Palette.primaryTint
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else {
                Image(systemName: "receipt").foregroundStyle(FotoDocs.Palette.primary)
            }
        }
        .frame(width: 48, height: 48)
        .clipShape(.rect(cornerRadius: 10))
        .task(id: data) {
            image = data.flatMap(UIImage.init(data:))?.preparingThumbnail(of: CGSize(width: 144, height: 144))
        }
    }
}

/// Edit one receipt: amount, vendor, date, category, note.
private struct ExpenseEditSheet: View {
    @Bindable var receipt: ExpenseReceipt
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var context
    @State private var amountText = ""
    @State private var image: UIImage?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 14) {
                    if let image {
                        Image(uiImage: image)
                            .resizable().scaledToFit()
                            .frame(maxWidth: .infinity, maxHeight: 280)
                            .clipShape(.rect(cornerRadius: 14))
                    }
                    field("Số tiền (đ)") {
                        TextField("Nhập tổng tiền", text: $amountText)
                            .keyboardType(.numberPad)
                            .font(.bvp(.title3, .bold))
                    }
                    field("Nơi chi") {
                        TextField("Tên cửa hàng, hãng xe, khách sạn…", text: $receipt.vendor)
                    }
                    field("Ngày") {
                        DatePicker("Ngày", selection: $receipt.date, displayedComponents: .date)
                            .labelsHidden()
                            .environment(\.locale, Locale(identifier: "vi_VN"))
                    }
                    field("Loại chi phí") {
                        Picker("Loại chi phí", selection: $receipt.category) {
                            ForEach(ExpenseCategory.allCases, id: \.self) { cat in
                                Label(cat.rawValue, systemImage: cat.icon).tag(cat)
                            }
                        }
                        .pickerStyle(.menu)
                        .tint(FotoDocs.Palette.primary)
                    }
                    field("Ghi chú") {
                        TextField("Không bắt buộc", text: $receipt.note)
                    }
                    Button(role: .destructive) {
                        context.delete(receipt)
                        dismiss()
                    } label: {
                        Label("Xoá hoá đơn này", systemImage: "trash")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.red)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 6)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(FotoDocs.Palette.background)
            .navigationTitle("Hoá đơn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Xong") { dismiss() }
                }
            }
        }
        .onAppear {
            amountText = receipt.amount.map(VND.format) ?? ""
            image = receipt.imageData.flatMap(UIImage.init(data:))
        }
        .onChange(of: amountText) { _, text in
            let value = Int(String(text.filter(\.isNumber).prefix(12)))
            receipt.amount = value
            let formatted = value.map(VND.format) ?? ""
            if formatted != text { amountText = formatted }
        }
    }

    private func field(_ title: String, @ViewBuilder _ content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.bvp(.caption, .semibold))
                .foregroundStyle(FotoDocs.Palette.textSecondary)
            content()
                .foregroundStyle(FotoDocs.Palette.textPrimary)
                .padding(.horizontal, 14)
                .frame(minHeight: 48)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fotoCard(14)
        }
    }
}
