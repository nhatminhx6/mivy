// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "FotoworkKit",
    defaultLocalization: "vi",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "FotoworkCore", targets: ["FotoworkCore"]),
        .library(name: "FotoworkImaging", targets: ["FotoworkImaging"]),
        .library(name: "FotoworkDesign", targets: ["FotoworkDesign"]),
        .library(name: "FeatureIDPhoto", targets: ["FeatureIDPhoto"]),
        .library(name: "FeatureDocuments", targets: ["FeatureDocuments"]),
        .library(name: "FeatureAvatar", targets: ["FeatureAvatar"]),
        .library(name: "FeatureSettings", targets: ["FeatureSettings"]),
    ],
    targets: [
        .target(
            name: "FotoworkCore",
            resources: [.process("Resources")]
        ),
        .target(
            name: "FotoworkImaging",
            dependencies: ["FotoworkCore"]
        ),
        .target(
            name: "FotoworkDesign"
        ),
        .target(
            name: "FeatureIDPhoto",
            dependencies: ["FotoworkCore", "FotoworkImaging", "FotoworkDesign"]
        ),
        .target(
            name: "FeatureDocuments",
            dependencies: ["FotoworkCore", "FotoworkImaging", "FotoworkDesign"]
        ),
        .target(
            name: "FeatureAvatar",
            dependencies: ["FotoworkCore", "FotoworkImaging", "FotoworkDesign"]
        ),
        .target(
            name: "FeatureSettings",
            dependencies: ["FotoworkCore", "FotoworkDesign"]
        ),
        .testTarget(
            name: "FotoworkCoreTests",
            dependencies: ["FotoworkCore"]
        ),
    ]
)
