// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "FotozKit",
    defaultLocalization: "vi",
    platforms: [.iOS(.v26)],
    products: [
        .library(name: "FotozCore", targets: ["FotozCore"]),
        .library(name: "FotozImaging", targets: ["FotozImaging"]),
        .library(name: "FotozDesign", targets: ["FotozDesign"]),
        .library(name: "FeatureIDPhoto", targets: ["FeatureIDPhoto"]),
        .library(name: "FeatureDocuments", targets: ["FeatureDocuments"]),
        .library(name: "FeatureAvatar", targets: ["FeatureAvatar"]),
        .library(name: "FeatureSettings", targets: ["FeatureSettings"]),
    ],
    targets: [
        .target(
            name: "FotozCore",
            resources: [.process("Resources")]
        ),
        .target(
            name: "FotozImaging",
            dependencies: ["FotozCore"]
        ),
        .target(
            name: "FotozDesign"
        ),
        .target(
            name: "FeatureIDPhoto",
            dependencies: ["FotozCore", "FotozImaging", "FotozDesign"]
        ),
        .target(
            name: "FeatureDocuments",
            dependencies: ["FotozCore", "FotozImaging", "FotozDesign"]
        ),
        .target(
            name: "FeatureAvatar",
            dependencies: ["FotozCore", "FotozImaging", "FotozDesign"]
        ),
        .target(
            name: "FeatureSettings",
            dependencies: ["FotozCore", "FotozDesign"]
        ),
        .testTarget(
            name: "FotozCoreTests",
            dependencies: ["FotozCore"]
        ),
    ]
)
