import ExpoModulesCore
import UIKit
import ZingCoachSDK

public final class ZingSdkModule: Module {
  private var sdk: ZingSDK?
  private var authStateTask: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged", "onCriticalError")

    OnDestroy {
      self.authStateTask?.cancel()
    }

    AsyncFunction("initialize") { @MainActor (args: InitializeArgs) async throws in
      let configuration = args.configuration?.toSdk() ?? ZingSDK.Configuration()
      let sdk = try await ZingSDK.initialize(with: .init(configuration: configuration))
      if let theme = args.theme {
        sdk.theme = theme.toSdk()
      }
      sdk.criticalErrorHandler = self
      self.observeAuthState(of: sdk)
      self.sdk = sdk
    }

    AsyncFunction("login") { @MainActor (args: LoginArgs) async throws in
      try await self.requireSdk().login(with: args.toSdk())
    }

    AsyncFunction("logout") { @MainActor () async throws in
      try await self.requireSdk().logout()
    }

    AsyncFunction("setTheme") { @MainActor (theme: ThemeArgs) async throws in
      try self.requireSdk().theme = theme.toSdk()
    }

    AsyncFunction("openScreen") { @MainActor (route: String, home: HomeArgs) async throws in
      let viewController = try self.requireSdk().makeScreen(ZingSDK.Screen(route: route, home: home))
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        throw Exception(name: "NoPresenter", description: "No view controller to present from", code: "ERR_NO_PRESENTER")
      }
      viewController.modalPresentationStyle = .fullScreen
      presenter.present(viewController, animated: true)
    }

    AsyncFunction("setProfileParams") { @MainActor (args: ProfileArgs) async throws in
      try self.requireSdk().setProfileParams(args.toSdk())
    }

    AsyncFunction("setPrimaryLocationId") { @MainActor (id: String) async throws in
      try self.requireSdk().setPrimaryLocationID(id)
    }

    View(ZingHomeView.self) {
      Prop("showCloseButton") { (view: ZingHomeView, value: Bool?) in
        view.home.showCloseButton = value
      }
      Prop("showAskCoachButton") { (view: ZingHomeView, value: Bool?) in
        view.home.showAskCoachButton = value
      }
      Prop("showBodyScanWidget") { (view: ZingHomeView, value: Bool?) in
        view.home.showBodyScanWidget = value
      }
      OnViewDidUpdateProps { (view: ZingHomeView) in
        guard view.viewController == nil, let sdk = self.sdk else { return }
        MainActor.assumeIsolated {
          view.embed(try? sdk.makeScreen(.program(configuration: view.home.toSdk(defaultShowCloseButton: false))))
        }
      }
    }
  }

  private func observeAuthState(of sdk: ZingSDK) {
    authStateTask = Task { [weak self] in
      for await state in sdk.loginStatePublisher.values {
        if let payload = state.payload {
          self?.sendEvent("onAuthStateChanged", payload)
        }
      }
    }
  }

  private func requireSdk() throws -> ZingSDK {
    guard let sdk else {
      throw Exception(name: "NotInitialized", description: "Zing SDK is not initialized", code: "ERR_NOT_INITIALIZED")
    }
    return sdk
  }
}

extension ZingSdkModule: CriticalErrorHandler {
  public func sdkDidFail(with error: any Error) {
    sendEvent("onCriticalError", [
      "code": error is AuthError ? "authError" : "unknown",
      "message": String(describing: error),
    ])
  }
}

private extension LoginState {
  var payload: [String: String]? {
    switch self {
    case .loggedOut: ["status": "loggedOut"]
    case .inProgress: ["status": "inProgress"]
    case .loggedIn(let userId): ["status": "loggedIn", "userId": userId]
    @unknown default: nil
    }
  }
}
