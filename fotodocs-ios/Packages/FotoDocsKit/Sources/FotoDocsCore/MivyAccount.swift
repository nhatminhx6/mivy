import Foundation
import Observation
import Security
import SwiftUI

/// A Mivy account (shared by every Mivy app): email + password on the Mivy back-end.
public struct MivyUser: Codable, Equatable, Sendable {
    public var id: Int
    public var email: String
    public var name: String
    public var phone: String
    public var balance: Int
}

public enum MivyAPI {
    /// Back-end root. Debug builds talk to the local back-end (the simulator reaches the Mac at localhost).
    /// The production address is set here before release.
    public static let baseURL = URL(string: "http://localhost:8000")!
    static let client = "fotodocs-ios"
}

public struct MivyAPIError: Error, LocalizedError, Equatable {
    public let code: String
    public let message: String
    public var errorDescription: String? { message }

    static let offline = MivyAPIError(code: "offline", message: "Không kết nối được máy chủ Mivy. Kiểm tra mạng rồi thử lại.")
    static let unexpected = MivyAPIError(code: "unexpected", message: "Có lỗi xảy ra, bạn thử lại sau nhé.")
}

/// Session token in the Keychain. The service name is shared by Mivy apps so that, once they sit in one
/// Keychain access group, signing in to one app signs in to all of them on the phone.
enum MivyKeychain {
    private static let service = "vn.mivy.account"
    private static let account = "session"

    static func read() -> String? {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: account, kSecReturnData as String: true]
        var out: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let data = out as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func write(_ token: String?) {
        let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                                kSecAttrAccount as String: account]
        SecItemDelete(q as CFDictionary)
        guard let token else { return }
        var add = q
        add[kSecValueData as String] = Data(token.utf8)
        add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(add as CFDictionary, nil)
    }
}

/// Signed-in state for the whole app. Signing in is optional: nothing here blocks using the app.
@MainActor
@Observable
public final class MivyAccount {
    public private(set) var user: MivyUser?
    public private(set) var busy = false
    public var isSignedIn: Bool { user != nil }

    private var token: String?
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
        token = MivyKeychain.read()
    }

    /// On launch: refresh the profile if a session is saved. An expired session is dropped quietly;
    /// no network keeps the user signed out of the UI without losing the token.
    public func restore() async {
        guard token != nil else { return }
        do {
            user = try await send("GET", "/v1/me")
        } catch let e as MivyAPIError where e.code == "unauthorized" {
            clearSession()
        } catch {}
    }

    public func register(email: String, password: String, name: String) async throws {
        try await authenticate("/v1/auth/register", ["email": email, "password": password, "name": name])
    }

    public func login(email: String, password: String) async throws {
        try await authenticate("/v1/auth/login", ["email": email, "password": password])
    }

    public func logout() async {
        if token != nil { _ = try? await send("POST", "/v1/auth/logout") as Ignored }
        clearSession()
    }

    public func updateName(_ name: String) async throws {
        user = try await send("PATCH", "/v1/me", body: ["name": name])
    }

    // MARK: Plumbing

    private struct Session: Decodable {
        let id: Int, email: String, name: String, phone: String, balance: Int, token: String
    }
    private struct Ignored: Decodable {}

    private func authenticate(_ path: String, _ body: [String: String]) async throws {
        busy = true
        defer { busy = false }
        let s: Session = try await send("POST", path, body: body)
        token = s.token
        MivyKeychain.write(s.token)
        user = MivyUser(id: s.id, email: s.email, name: s.name, phone: s.phone, balance: s.balance)
    }

    private func clearSession() {
        token = nil
        user = nil
        MivyKeychain.write(nil)
    }

    private func send<T: Decodable>(_ method: String, _ path: String, body: [String: String]? = nil) async throws -> T {
        var req = URLRequest(url: MivyAPI.baseURL.appending(path: path))
        req.httpMethod = method
        req.timeoutInterval = 20
        req.setValue(MivyAPI.client, forHTTPHeaderField: "X-Mivy-Client")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }
        let data: Data, response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw MivyAPIError.offline
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw Self.error(from: data) }
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw MivyAPIError.unexpected
        }
    }

    /// Mivy errors: `{"error": {"code", "message"}}` (FastAPI's default `{"detail": …}` also read).
    nonisolated public static func error(from data: Data) -> MivyAPIError {
        struct Detail: Decodable { let code: String; let message: String }
        struct Body: Decodable { let error: Detail?; let detail: Detail? }
        if let b = try? JSONDecoder().decode(Body.self, from: data), let d = b.error ?? b.detail {
            return MivyAPIError(code: d.code, message: d.message)
        }
        return .unexpected
    }
}

public extension EnvironmentValues {
    @Entry var mivyAccount: MivyAccount? = nil
}
