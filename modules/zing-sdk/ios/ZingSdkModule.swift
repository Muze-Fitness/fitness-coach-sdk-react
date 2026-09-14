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
      guard self.sdk == nil else {
        throw Exception(name: "AlreadyInitialized", description: "Zing SDK is already initialized")
      }

      let configuration = args.configuration.map {
        ZingSDK.Configuration(
          coachesAvailability: $0.coachesAvailability,
          genderAvailability: $0.genderAvailability,
          ahBackgroundDeliveryEnabled: $0.healthBackgroundSync
        )
      } ?? ZingSDK.Configuration()
      let theme = args.theme.map { BridgeTheme(arguments: $0).build() }

      let sdk = try await ZingSDK.initialize(with: .init(theme: theme, configuration: configuration))
      sdk.criticalErrorHandler = self
      self.authStateTask = Task { [weak self] in
        for await state in sdk.loginStatePublisher.values {
          if let payload = state.payload {
            self?.sendEvent("onAuthStateChanged", payload)
          }
        }
      }
      self.sdk = sdk
    }

    AsyncFunction("login") { @MainActor (args: LoginArgs) async throws in
      let authentication: ZingSDK.AuthenticationType
      if let token = args.jwtToken {
        authentication = .jwtToken(token: token)
      } else if let key = args.apiKey {
        authentication = .apiKey(key: key, partnerUserID: args.partnerUserId)
      } else {
        throw Exception(name: "InvalidAuthentication", description: "Provide either apiKey or externalToken")
      }
      try await self.requireSdk().login(with: authentication)
    }

    AsyncFunction("logout") { @MainActor () async throws in
      try await self.requireSdk().logout()
    }

    AsyncFunction("openScreen") { @MainActor (route: String, home: HomeArgs) async throws in
      let screen: ZingSDK.Screen =
        switch route {
        case "home": .program(configuration: home.configuration(defaultShowCloseButton: true))
        case "onboarding": .onboarding
        case "customWorkout": .customWorkout
        case "aiAssistant": .assistantChat
        // The iOS SDK has no dedicated workout plan details screen.
        case "workoutPlanDetails", "fullSchedule": .fullSchedule
        case "profileSettings": .profileSettings
        case "bodyScan": .bodyScan()
        case "flexibilityTest": .flexibilityTest()
        case "fitnessTest": .fitnessTest()
        default: throw Exception(name: "UnknownRoute", description: "Route \(route) is not supported")
        }

      let viewController = try self.requireSdk().makeScreen(screen)
      guard let presenter = self.appContext?.utilities?.currentViewController() else {
        throw Exception(name: "NoRootViewController", description: "No view controller available to present from")
      }
      viewController.modalPresentationStyle = .fullScreen
      presenter.present(viewController, animated: true)
    }

    AsyncFunction("setProfileParams") { @MainActor (args: ProfileArgs) async throws in
      try self.requireSdk().setProfileParams(ProfileParameters(
        name: args.name,
        gender: args.gender,
        height: args.height,
        weight: args.weight,
        age: args.age,
        measurementSystem: args.measurementSystem
      ))
    }

    View(ZingHomeView.self) {
      Prop("showCloseButton") { (view: ZingHomeView, value: Bool?) in
        view.home.showCloseButton = value
      }
      Prop("showAskCoachButton") { (view: ZingHomeView, value: Bool?) in
        view.home.showAskCoachButton = value
      }
      OnViewDidUpdateProps { (view: ZingHomeView) in
        guard view.viewController == nil, let sdk = self.sdk else { return }
        MainActor.assumeIsolated {
          view.embed(try? sdk.makeScreen(.program(configuration: view.home.configuration(defaultShowCloseButton: false))))
        }
      }
    }
  }

  private func requireSdk() throws -> ZingSDK {
    guard let sdk else {
      throw Exception(name: "NotInitialized", description: "Zing SDK is not initialized")
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

struct InitializeArgs: Record {
  @Field var configuration: ConfigurationArgs?
  @Field var theme: [String: Any]?
}

struct ConfigurationArgs: Record {
  @Field var coachesAvailability: CoachesAvailability = .allCoaches
  @Field var genderAvailability: GenderAvailability = .all
  @Field var healthBackgroundSync = false
}

struct LoginArgs: Record {
  @Field var jwtToken: String?
  @Field var apiKey: String?
  @Field var partnerUserId: String?
}

struct HomeArgs: Record {
  @Field var showCloseButton: Bool?
  @Field var showAskCoachButton: Bool?

  func configuration(defaultShowCloseButton: Bool) -> ZingSDK.ProgramScreenConfiguration {
    .init(showCloseButton: showCloseButton ?? defaultShowCloseButton, showAskCoachButton: showAskCoachButton ?? true)
  }
}

struct ProfileArgs: Record {
  @Field var name: String?
  @Field var gender: ProfileParameters.UserGender?
  @Field var height: Double?
  @Field var weight: Double?
  @Field var age: Int?
  @Field var measurementSystem: ProfileParameters.Unit?
}

extension CoachesAvailability: @retroactive CaseIterable, @retroactive Enumerable {
  public static let allCases: [Self] = [.allCoaches, .userGenderBased]
}

extension GenderAvailability: @retroactive CaseIterable, @retroactive Enumerable {
  public static let allCases: [Self] = [.all, .binary]
}

extension ProfileParameters.UserGender: @retroactive Enumerable {}
extension ProfileParameters.Unit: @retroactive Enumerable {}

private extension LoginState {
  var payload: [String: String]? {
    switch self {
    case .loggedOut: ["state": "loggedOut"]
    case .inProgress: ["state": "inProgress"]
    case .loggedIn(let userId): ["state": "authenticated", "userId": userId]
    @unknown default: nil
    }
  }
}
