import DesignSystem
import ExpoModulesCore
import UIKit
import ZingCoachSDK

struct ThemeArgs: Record {
  @Field var colors: [String: Double] = [:]
  @Field var cornersRounding: [String: RadiusArgs] = [:]
  @Field var typography: TypographyArgs?
  @Field var blurStyle: BlurStyleArg?

  func toSdk() -> DesignSystem.Theme {
    let colors = colors.mapValues { UIColor(argb: Int($0)) }
    let radii = cornersRounding.mapValues { $0.toSdk() }
    let blurStyle = blurStyle?.sdk
    return DesignSystem.Theme.default.byApplying(
      colorsTransform: { token, color in colors[token.token] ?? color },
      cornersRoundingTransform: { token, radius in radii[token.token] ?? radius },
      typographyTransform: typography?.toSdk(),
      assetsTransform: { token, image in UIImage(named: token.token) ?? image },
      blurStyleTransform: { _, style in blurStyle ?? style }
    )
  }
}

struct TypographyArgs: Record {
  @Field var system: String?
  @Field var brand: String?

  func toSdk() -> Transform<TypographyToken, TypographyAttributes> {
    { token, attributes in
      let family: String? = switch token {
      case .heading(.h1),
           .heading(.h2),
           .heading(.h3),
           .bodyBrand,
           .counter,
           .coach(.name):
        brand

      case .heading(.h4),
           .heading(.h4Semi),
           .bodySystem,
           .coach(.chat),
           .coach(.remark),
           .ui:
        system
      }

      guard let family, UIFont(name: family, size: UIFont.systemFontSize) != nil else { return attributes }
      var updated = attributes
      updated.fontFamily = family
      return updated
    }
  }
}

struct RadiusArgs: Record {
  @Field var type: RadiusType = .value
  @Field var value: Double = 0

  func toSdk() -> RadiusAttribute {
    switch type {
    case .pill: .pill
    case .value: .value(value)
    }
  }
}

enum RadiusType: String, CaseIterable, Enumerable {
  case pill
  case value
}

enum BlurStyleArg: String, CaseIterable, Enumerable {
  case systemMaterialLight
  case systemMaterialDark

  var sdk: UIBlurEffect.Style {
    switch self {
    case .systemMaterialLight: .systemMaterialLight
    case .systemMaterialDark: .systemMaterialDark
    }
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
