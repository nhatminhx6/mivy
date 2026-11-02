import SwiftUI
import UIKit

/// Share / save bridge for exported files (PDF, JPEG, …).
public struct ShareSheet: UIViewControllerRepresentable {
    private let items: [Any]

    public init(items: [Any]) {
        self.items = items
    }

    public func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    public func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}

/// Wrapper so a URL can drive `.sheet(item:)`.
public struct SharePayload: Identifiable {
    public let id = UUID()
    public let url: URL
    public init(url: URL) { self.url = url }
}
