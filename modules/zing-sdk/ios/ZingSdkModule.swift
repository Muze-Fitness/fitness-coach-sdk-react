import Combine
import DesignSystem
import ExpoModulesCore
import UIKit
import ZingCoachSDK

public class ZingSdkModule: Module {
  private struct InitArgumentError: Error {
    let message: String
  }

  private var sdk: ZingSDK?
  private var isInitializing = false
  private var authStateCancellable: AnyCancellable?
  private let tokenRequests = AuthTokenRequestStore()
  private var authAdapter: AuthAdapter?
  private var tokenErrorForwarder: TokenErrorForwarder?

  public func definition() -> ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged", "onAuthTokenRequested", "onTokenInvalid")

    AsyncFunction("initialize") { (args: [String: Any], promise: Promise) in
      guard self.sdk == nil, !self.isInitializing else {
        promise.reject("ALREADY_INITIALIZED", "Zing SDK is already initialized")
        return
      }

      let parameters: ZingSDK.InitializationParameters
      do {
        parameters = try self.makeInitializationParameters(args: args)
      } catch let error as InitArgumentError {
        promise.reject("INVALID_ARGUMENT", error.message)
        return
      }

      self.isInitializing = true
      Task { @MainActor in
        let result = await ZingSDK.initialize(with: parameters)
        self.isInitializing = false
        switch result {
        case .success(let instance):
          self.sdk = instance
          self.observeAuthState(instance)
          promise.resolve(nil)
        case .failure(let error):
          promise.reject("INIT_FAILED", String(describing: error))
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
        let screen: ZingSDK.Screen
        switch route {
        case "home":
          screen = .program
        case "custom_workout":
          screen = .customWorkout
        case "ai_assistant":
          screen = .assistantChat
        case "workout_plan_details", "full_schedule":
          // The iOS SDK has no dedicated workout-plan-details screen.
          screen = .fullSchedule
        case "profile_settings":
          screen = .profileSettings
        case "body_scan":
          screen = .bodyScan(useFrontCamera: true)
        case "flexibility_test":
          screen = .flexibilityTest(useFrontCamera: true)
        case "fitness_test":
          screen = .fitnessTest(useFrontCamera: true)
        default:
          promise.reject("UNKNOWN_ROUTE", "Route \(route) is not supported")
          return
        }

        switch sdk.makeScreen(screen) {
        case .success(let viewController):
          self.present(viewController, promise: promise)
        case .failure(let error):
          switch error {
          case .notLoggedIn:
            promise.reject("NOT_LOGGED_IN", String(describing: error))
          }
        }
      }
    }

    Function("provideAuthToken") { (requestId: String, token: String) in
      self.tokenRequests.resolve(requestId: requestId, with: .success(token))
    }

    Function("rejectAuthToken") { (requestId: String, message: String) in
      self.tokenRequests.resolve(
        requestId: requestId,
        with: .failure(AuthTokenBridgeError.rejected(message))
      )
    }

    OnDestroy {
      self.tokenRequests.failAll(with: AuthTokenBridgeError.bridgeDestroyed)
    }
  }

  private func makeInitializationParameters(
    args: [String: Any]
  ) throws -> ZingSDK.InitializationParameters {
    guard let type = args["type"] as? String else {
      throw InitArgumentError(message: "authentication type is required")
    }

    let authentication: ZingSDK.AuthenticationType
    switch type {
    case "apiKey":
      guard let key = args["apiKey"] as? String, !key.isEmpty else {
        throw InitArgumentError(message: "apiKey is required")
      }
      authentication = .apiKey(key: key)
    case "externalToken":
      let adapter = AuthAdapter(store: tokenRequests) { [weak self] requestId in
        self?.sendEvent("onAuthTokenRequested", ["requestId": requestId])
      }
      let forwarder = TokenErrorForwarder { [weak self] in
        self?.sendEvent("onTokenInvalid")
      }
      authAdapter = adapter
      tokenErrorForwarder = forwarder
      authentication = .externalToken(provider: adapter, errorHandler: forwarder)
    default:
      throw InitArgumentError(message: "Unknown auth type: \(type)")
    }

    let configuration: ZingSDK.Configuration
    if let configDict = args["configuration"] as? [String: Any] {
      guard
        let coachesRaw = configDict["coachesAvailability"] as? String,
        let coaches = CoachesAvailability(rawValue: coachesRaw),
        let genderRaw = configDict["genderAvailability"] as? String,
        let gender = GenderAvailability(rawValue: genderRaw),
        let backgroundDeliveryEnabled = configDict["healthBackgroundSync"] as? Bool
      else {
        throw InitArgumentError(message: "Invalid configuration")
      }
      configuration = ZingSDK.Configuration(
        coachesAvailability: coaches,
        genderAvailability: gender,
        ahBackgroundDeliveryEnabled: backgroundDeliveryEnabled
      )
    } else {
      configuration = ZingSDK.Configuration()
    }

    let theme = (args["theme"] as? [String: Any]).map { BridgeTheme(arguments: $0).build() }
    return ZingSDK.InitializationParameters(
      authentication: authentication,
      theme: theme,
      configuration: configuration
    )
  }

  @MainActor
  private func present(_ viewController: UIViewController, promise: Promise) {
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
