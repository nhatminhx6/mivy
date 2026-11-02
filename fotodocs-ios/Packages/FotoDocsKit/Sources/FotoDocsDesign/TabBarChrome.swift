import SwiftUI

/// A pushed/detail screen sets this to hide the app's floating tab bar.
public struct TabBarHiddenKey: PreferenceKey {
    public static let defaultValue = false
    public static func reduce(value: inout Bool, nextValue: () -> Bool) {
        value = value || nextValue()
    }
}

public extension View {
    /// Hide the custom floating tab bar while this screen is on top.
    func fotoHidesTabBar() -> some View {
        preference(key: TabBarHiddenKey.self, value: true)
    }
}
