import ExpoModulesCore
import UIKit

final class ZingHomeView: ExpoView {
  var home = HomeArgs()
  private(set) var viewController: UIViewController?

  func embed(_ child: UIViewController?) {
    guard let child, let parent = appContext?.utilities?.currentViewController() else { return }
    parent.addChild(child)
    child.view.frame = bounds
    child.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    child.beginAppearanceTransition(true, animated: false)
    addSubview(child.view)
    child.endAppearanceTransition()
    child.didMove(toParent: parent)
    viewController = child
  }

  override func removeFromSuperview() {
    viewController?.willMove(toParent: nil)
    viewController?.beginAppearanceTransition(false, animated: false)
    viewController?.view.removeFromSuperview()
    viewController?.endAppearanceTransition()
    viewController?.removeFromParent()
    viewController = nil
    super.removeFromSuperview()
  }
}
