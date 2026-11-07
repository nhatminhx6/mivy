import SwiftUI
import FotoDocsCore
import FotoDocsDesign

/// Top card in Settings: signed out → invite to sign in (optional); signed in → name, email, balance.
struct AccountCard: View {
    let account: MivyAccount
    let open: () -> Void

    var body: some View {
        Button(action: open) {
            HStack(spacing: 14) {
                Image(systemName: account.isSignedIn ? "person.crop.circle.fill" : "person.crop.circle.badge.plus")
                    .font(.bvp(size: 30))
                    .foregroundStyle(account.isSignedIn ? .white : FotoDocs.Palette.primary)
                    .frame(width: 52, height: 52)
                    .background(account.isSignedIn ? FotoDocs.Palette.primary : FotoDocs.Palette.primaryTint, in: .circle)
                VStack(alignment: .leading, spacing: 3) {
                    if let user = account.user {
                        Text(user.name.isEmpty ? user.email : user.name)
                            .font(.bvp(.headline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.textPrimary)
                            .lineLimit(1)
                        Text("Tài khoản Mivy · \(user.balance) đồng")
                            .font(.bvp(.footnote))
                            .foregroundStyle(FotoDocs.Palette.textSecondary)
                    } else {
                        Text("Đăng nhập / Đăng ký")
                            .font(.bvp(.headline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.textPrimary)
                        Text("Dùng tài khoản Mivy. Không bắt buộc.")
                            .font(.bvp(.footnote))
                            .foregroundStyle(FotoDocs.Palette.textSecondary)
                    }
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right").foregroundStyle(FotoDocs.Palette.textMuted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fotoCard()
        }
        .buttonStyle(.plain)
    }
}

/// Sign in / register (one sheet, two modes).
struct AuthSheet: View {
    enum Mode: String, CaseIterable { case login = "Đăng nhập", register = "Đăng ký" }

    let account: MivyAccount
    @Environment(\.dismiss) private var dismiss
    @State private var mode: Mode = .login
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var error: String?
    @FocusState private var focus: Field?

    enum Field { case name, email, password }

    private var canSubmit: Bool {
        email.contains("@") && password.count >= 6 && !account.busy
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(mode == .login ? "Chào mừng bạn quay lại" : "Tạo tài khoản Mivy")
                            .font(.bvp(.title2, .bold))
                            .foregroundStyle(FotoDocs.Palette.textPrimary)
                        Text("Một tài khoản Mivy dùng được cho mọi ứng dụng của Mivy. Ảnh của bạn vẫn chỉ xử lý trên điện thoại.")
                            .font(.bvp(.subheadline))
                            .foregroundStyle(FotoDocs.Palette.textSecondary)
                    }
                    Picker("", selection: $mode) {
                        ForEach(Mode.allCases, id: \.self) { Text($0.rawValue) }
                    }
                    .pickerStyle(.segmented)

                    VStack(spacing: 10) {
                        if mode == .register {
                            field("Họ tên (không bắt buộc)", text: $name, icon: "person")
                                .textContentType(.name)
                                .focused($focus, equals: .name)
                                .submitLabel(.next)
                                .onSubmit { focus = .email }
                        }
                        field("Email", text: $email, icon: "envelope")
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .password }
                        SecureFieldRow(text: $password, newPassword: mode == .register)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .onSubmit(submit)
                        if mode == .register {
                            Text("Mật khẩu ít nhất 6 ký tự.")
                                .font(.bvp(.caption))
                                .foregroundStyle(FotoDocs.Palette.textMuted)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    if let error {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.bvp(.subheadline, .semibold))
                            .foregroundStyle(FotoDocs.Palette.warning)
                    }

                    Button(action: submit) {
                        ZStack {
                            if account.busy {
                                ProgressView().tint(.white)
                            } else {
                                Text(mode.rawValue).font(.bvp(.headline, .bold))
                            }
                        }
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(FotoDocs.Palette.primary, in: .capsule)
                        .opacity(canSubmit || account.busy ? 1 : 0.5)
                    }
                    .buttonStyle(.plain)
                    .disabled(!canSubmit)
                }
                .padding(20)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(FotoDocs.Palette.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Để sau") { dismiss() } }
            }
            .onChange(of: mode) { error = nil }
        }
    }

    private func field(_ title: String, text: Binding<String>, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon).foregroundStyle(FotoDocs.Palette.textMuted).frame(width: 20)
            TextField(title, text: text)
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .fotoCard(14)
    }

    private func submit() {
        guard canSubmit else { return }
        error = nil
        Task {
            do {
                let e = email.trimmingCharacters(in: .whitespaces)
                if mode == .login {
                    try await account.login(email: e, password: password)
                } else {
                    try await account.register(email: e, password: password, name: name.trimmingCharacters(in: .whitespaces))
                }
                dismiss()
            } catch {
                self.error = (error as? LocalizedError)?.errorDescription ?? "Có lỗi xảy ra, bạn thử lại sau nhé."
            }
        }
    }
}

/// Password with a show / hide toggle.
private struct SecureFieldRow: View {
    @Binding var text: String
    let newPassword: Bool
    @State private var visible = false

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "lock").foregroundStyle(FotoDocs.Palette.textMuted).frame(width: 20)
            Group {
                if visible {
                    TextField("Mật khẩu", text: $text)
                } else {
                    SecureField("Mật khẩu", text: $text)
                }
            }
            .textContentType(newPassword ? .newPassword : .password)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            Button { visible.toggle() } label: {
                Image(systemName: visible ? "eye.slash" : "eye").foregroundStyle(FotoDocs.Palette.textMuted)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(visible ? "Ẩn mật khẩu" : "Hiện mật khẩu")
        }
        .padding(.horizontal, 16)
        .frame(height: 52)
        .fotoCard(14)
    }
}

/// Signed-in account: name, email, balance, sign out.
struct AccountSheet: View {
    let account: MivyAccount
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var saving = false
    @State private var error: String?
    @State private var askLogout = false

    var body: some View {
        NavigationStack {
            Form {
                if let user = account.user {
                    Section("Tài khoản Mivy") {
                        LabeledContent("Email", value: user.email)
                        LabeledContent("Số dư ví", value: "\(user.balance) đồng")
                    }
                    Section {
                        TextField("Họ tên", text: $name)
                            .textContentType(.name)
                            .onSubmit(saveName)
                        if name.trimmingCharacters(in: .whitespaces) != user.name {
                            Button(saving ? "Đang lưu…" : "Lưu họ tên", action: saveName).disabled(saving)
                        }
                    } header: {
                        Text("Họ tên")
                    } footer: {
                        if let error { Text(error).foregroundStyle(FotoDocs.Palette.warning) }
                    }
                    Section {
                        Button("Đăng xuất", role: .destructive) { askLogout = true }
                    } footer: {
                        Text("Đăng xuất không xoá ảnh, hồ sơ hay hoá đơn đã lưu trên điện thoại.")
                    }
                }
            }
            .scrollContentBackground(.hidden)
            .background(FotoDocs.Palette.background)
            .navigationTitle("Tài khoản")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Xong") { dismiss() } }
            }
            .confirmationDialog("Đăng xuất khỏi tài khoản Mivy?", isPresented: $askLogout, titleVisibility: .visible) {
                Button("Đăng xuất", role: .destructive) {
                    Task {
                        await account.logout()
                        dismiss()
                    }
                }
            }
            .onAppear { name = account.user?.name ?? "" }
        }
    }

    private func saveName() {
        let n = name.trimmingCharacters(in: .whitespaces)
        guard n != account.user?.name else { return }
        saving = true
        error = nil
        Task {
            do { try await account.updateName(n) } catch { self.error = (error as? LocalizedError)?.errorDescription }
            saving = false
        }
    }
}
