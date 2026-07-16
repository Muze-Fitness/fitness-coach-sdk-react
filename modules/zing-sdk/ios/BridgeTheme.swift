import DesignSystem
import UIKit

/// Builds a `DesignSystem.Theme` from the dictionary sent over the JS bridge.
/// Mirrors `FlutterTheme` in the Flutter wrapper so both stay in sync.
struct BridgeTheme {
  let arguments: [String: Any]

  func build() -> DesignSystem.Theme {
    DesignSystem.Theme(
      colors: colorsProvider(),
      cornersRounding: cornersRoundingProvider(),
      typography: typographyProvider(),
      assets: assetsProvider()
    )
  }

  private func colorsProvider() -> TokenProvider<ColorToken, UIColor>? {
    guard let rawColors = arguments["colors"] as? [String: Any] else {
      return nil
    }

    let colors = rawColors
      .compactMapValues { ($0 as? NSNumber)?.int64Value }
      .mapValues { UIColor(argb: Int($0)) }

    return TokenProvider { token in
      switch token {
      case .brand(.primary):
        return colors["brand/primary"]

      case .brand(.secondary):
        return colors["brand/secondary"]

      case .textHeading(.darkPrimary):
        return colors["text/heading/dark-primary"]

      case .textHeading(.lightPrimary):
        return colors["text/heading/light-primary"]

      case .textBody(.darkPrimary):
        return colors["text/body/dark-primary"]

      case .textBody(.darkSecondary):
        return colors["text/body/dark-secondary"]

      case .buttonBackground(.darkPrimary):
        return colors["button/primary"]

      case .buttonBackground(.lightSecondary):
        return colors["button/secondary"]

      case .background(.white):
        return colors["bg/primary"]

      case .background(.lightGrey):
        return colors["bg/secondary"]

      default:
        return nil
      }
    }
  }

  private func cornersRoundingProvider() -> TokenProvider<RadiusToken, RadiusAttribute>? {
    guard let rawCornersRounding = arguments["cornersRounding"] as? [String: Any] else {
      return nil
    }

    let cornersRounding = rawCornersRounding
      .compactMapValues { $0 as? [String: Any] }
      .filter { RadiusToken(token: $0.key) != nil }
      .compactMapValues(RadiusAttribute.init(entry:))

    return TokenProvider { cornersRounding[$0.token] }
  }

  private func typographyProvider() -> TokenProvider<TypographyToken, TypographyAttributes>? {
    guard let rawTypography = arguments["typography"] as? [String: Any] else {
      return nil
    }

    let system = rawTypography["system"] as? String
    let brand = rawTypography["brand"] as? String

    return TokenProvider { token in
      let family: String?
      switch token {
      case .heading(.h1),
           .heading(.h2),
           .heading(.h3),
           .bodyBrand,
           .counter,
           .coach(.name):
        family = brand

      case .heading(.h4),
           .heading(.h4Semi),
           .bodySystem,
           .coach(.chat),
           .coach(.remark),
           .ui:
        family = system
      }

      return family.map {
        TypographyAttributes(fontFamily: $0)
      }
    }
  }

  private func assetsProvider() -> TokenProvider<AssetToken, UIImage> {
    TokenProvider { UIImage(named: $0.token) }
  }
}

private extension UIColor {
  convenience init(argb: Int) {
    let a = CGFloat((argb >> 24) & 0xFF) / 255.0
    let r = CGFloat((argb >> 16) & 0xFF) / 255.0
    let g = CGFloat((argb >> 8) & 0xFF) / 255.0
    let b = CGFloat(argb & 0xFF) / 255.0
    self.init(red: r, green: g, blue: b, alpha: a)
  }
}
