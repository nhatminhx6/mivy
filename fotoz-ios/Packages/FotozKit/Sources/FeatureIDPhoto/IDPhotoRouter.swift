import SwiftUI
import FotozCore

@MainActor
@Observable
public final class IDPhotoRouter {
    public var path = NavigationPath()

    public init() {}

    public func push(_ target: CaptureTarget) {
        path.append(target)
    }

    public func popToRoot() {
        path = NavigationPath()
    }
}
