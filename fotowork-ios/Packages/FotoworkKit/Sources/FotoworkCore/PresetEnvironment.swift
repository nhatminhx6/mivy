import SwiftUI

public extension EnvironmentValues {
    /// Dependency-injected preset provider. Swap with `MockPresetStore` in previews/tests.
    @Entry var presetStore: any PresetProviding = PresetStore()
}
