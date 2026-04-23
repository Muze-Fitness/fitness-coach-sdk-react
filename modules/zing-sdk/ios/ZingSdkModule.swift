import Combine
import ExpoModulesCore
import UIKit
import ZingCoachSDK

public class ZingSdkModule: Module {
  private var sdk: ZingSDK?
  private var authStateCancellable: AnyCancellable?

  public func definition() -> ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged")

    AsyncFunction("initialize") { (keys: [String: String], promise: Promise) in
      guard self.sdk == nil else {
        promise.resolve(nil)
        return
      }
      guard let apiKey = keys["iosApiKey"], !apiKey.isEmpty else {
        promise.reject("INVALID_ARGUMENT", "iosApiKey is required")
        return
      }

      Task { @MainActor in
        let result = await ZingSDK.initialize(
          with: .init(authentication: .apiKey(key: apiKey))
        )
        switch result {
        case .success(let instance):
          self.sdk = instance
          self.observeAuthState(instance)
          promise.resolve(nil)
        case .failure(let error):
          promise.reject("INIT_FAILED", error.localizedDescription)
        }
      }
    }

    AsyncFunction("login") { (promise: Promise) in
      guard let sdk = self.sdk else {
        promise.reject("NOT_INITIALIZED", "Zing SDK is not initialized")
        return
      }
      Task { @MainActor in
        switch await sdk.login() {
        case .success:
          promise.resolve(nil)
        case .failure(let error):
          promise.reject("LOGIN_FAILED", String(describing: error))
        }
      }
    }

    AsyncFunction("logout") { (promise: Promise) in
      guard let sdk = self.sdk else {
        promise.reject("NOT_INITIALIZED", "Zing SDK is not initialized")
        return
      }
      Task { @MainActor in
        switch await sdk.logout() {
        case .success:
          promise.resolve(nil)
        case .failure(let error):
          promise.reject("LOGOUT_FAILED", String(describing: error))
        }
      }
    }

    AsyncFunction("openScreen") { (route: String, promise: Promise) in
      guard let sdk = self.sdk else {
        promise.reject("NOT_INITIALIZED", "Zing SDK is not initialized")
        return
      }
      Task { @MainActor in
        let viewController: UIViewController
        switch route {
        case "home":
          viewController = sdk.makeProgramModule()
        case "custom_workout":
          viewController = sdk.makeCustomWorkoutModule()
        case "ai_assistant":
          viewController = sdk.makeAssistantChat()
        case "workout_plan_details", "full_schedule":
          viewController = sdk.makeFullSchedule()
        case "profile_settings":
          viewController = sdk.makeProfileSettings()
        default:
          promise.reject("UNKNOWN_ROUTE", "Route \(route) is not supported")
          return
        }

        guard
          let scene = UIApplication.shared.currentScene,
          let rootViewController = scene.keyWindow?.rootViewController
        else {
          promise.reject("NO_ROOT_VIEW_CONTROLLER", "No root view controller available")
          return
        }

        let presenter = rootViewController.topPresentedViewController.topInNavigationController
        viewController.modalPresentationStyle = .fullScreen
        presenter.present(viewController, animated: true)
        promise.resolve(nil)
      }
    }
  }

  private func observeAuthState(_ sdk: ZingSDK) {
    authStateCancellable = sdk.loginStatePublisher
      .receive(on: DispatchQueue.main)
      .sink { [weak self] state in
        let payload: [String: String]
        switch state {
        case .loggedOut:
          payload = ["state": "loggedOut"]
        case .inProgress:
          payload = ["state": "inProgress"]
        case .loggedIn:
          payload = ["state": "authenticated"]
        @unknown default:
          return
        }
        self?.sendEvent("onAuthStateChanged", payload)
      }
  }
}

private extension UIViewController {
  var topPresentedViewController: UIViewController {
    presentedViewController.flatMap { $0.topPresentedViewController } ?? self
  }

  var topInNavigationController: UIViewController {
    (self as? UINavigationController)?.topViewController ?? self
  }
}

private extension UIApplication {
  var currentScene: UIWindowScene? {
    connectedScenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
  }
}
