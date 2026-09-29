import ExpoModulesCore
import ZingCoachSDK

struct InitializeArgs: Record {
  @Field var configuration: ConfigurationArgs?
  @Field var theme: ThemeArgs?
}

struct ConfigurationArgs: Record {
  @Field var coachesAvailability: CoachesAvailability = .allCoaches
  @Field var genderAvailability: GenderAvailability = .all
  @Field var healthBackgroundSync = false

  func toSdk() -> ZingSDK.Configuration {
    ZingSDK.Configuration(
      coachesAvailability: coachesAvailability,
      genderAvailability: genderAvailability,
      ahBackgroundDeliveryEnabled: healthBackgroundSync
    )
  }
}

struct LoginArgs: Record {
  @Field var externalToken: String?
  @Field var apiKey: String?
  @Field var partnerUserId: String?

  func toSdk() throws -> ZingSDK.AuthenticationType {
    if let externalToken {
      return .jwtToken(token: externalToken)
    }
    if let apiKey {
      return .apiKey(key: apiKey, partnerUserID: partnerUserId)
    }
    throw Exception(name: "InvalidAuthentication", description: "Provide either apiKey or externalToken", code: "ERR_INVALID_AUTHENTICATION")
  }
}

struct HomeArgs: Record {
  @Field var showCloseButton: Bool?
  @Field var showAskCoachButton: Bool?
  @Field var showBodyScanWidget: Bool?

  func toSdk(defaultShowCloseButton: Bool) -> ZingSDK.ProgramScreenConfiguration {
    .init(
      showCloseButton: showCloseButton ?? defaultShowCloseButton,
      showAskCoachButton: showAskCoachButton ?? true,
      showBodyScanWidget: showBodyScanWidget ?? true
    )
  }
}

extension ZingSDK.Screen {
  init(route: String, home: HomeArgs) throws {
    self =
      switch route {
      case "home": .program(configuration: home.toSdk(defaultShowCloseButton: true))
      case "onboarding": .onboarding
      case "customWorkout": .customWorkout
      case "aiAssistant": .assistantChat
      case "workoutPlanDetails", "fullSchedule": .fullSchedule
      case "profileSettings": .profileSettings
      case "bodyScan": .bodyScan()
      case "flexibilityTest": .flexibilityTest()
      case "fitnessTest": .fitnessTest()
      default: throw Exception(name: "UnknownRoute", description: "Route \(route) is not supported", code: "ERR_UNKNOWN_ROUTE")
      }
  }
}

struct ProfileArgs: Record {
  @Field var name: String?
  @Field var gender: ProfileParameters.UserGender?
  @Field var height: Double?
  @Field var weight: Double?
  @Field var age: Int?
  @Field var measurementSystem: ProfileParameters.Unit?

  func toSdk() -> ProfileParameters {
    ProfileParameters(
      name: name,
      gender: gender,
      height: height,
      weight: weight,
      age: age,
      measurementSystem: measurementSystem
    )
  }
}

extension CoachesAvailability: @retroactive CaseIterable, @retroactive Enumerable {
  public static let allCases: [Self] = [.allCoaches, .userGenderBased]
}

extension GenderAvailability: @retroactive CaseIterable, @retroactive Enumerable {
  public static let allCases: [Self] = [.all, .binary]
}

extension ProfileParameters.UserGender: @retroactive Enumerable {}
extension ProfileParameters.Unit: @retroactive Enumerable {}
