import Testing
import Foundation
import FotoDocsCore

@Suite("Mivy account")
struct MivyAccountTests {
    @Test("Back-end error messages reach the user")
    func errors() {
        let body = Data(#"{"detail":{"code":"bad_login","message":"Sai email hoặc mật khẩu."}}"#.utf8)
        let e = MivyAccount.error(from: body)
        #expect(e.code == "bad_login" && e.message == "Sai email hoặc mật khẩu.")
        let mivy = Data(#"{"error":{"code":"email_taken","message":"Email này đã có tài khoản, đăng nhập nhé."}}"#.utf8)
        #expect(MivyAccount.error(from: mivy).code == "email_taken")
        #expect(MivyAccount.error(from: Data("oops".utf8)).code == "unexpected")
    }

    @Test("Starts signed out without a saved session")
    @MainActor func signedOut() {
        let account = MivyAccount()
        #expect(!account.isSignedIn)
    }
}

