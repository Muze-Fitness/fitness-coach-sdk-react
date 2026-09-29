package expo.modules.zingsdk

import coach.zing.fitness.coach.CoachesAvailability
import coach.zing.fitness.coach.Configuration
import coach.zing.fitness.coach.GenderAvailability
import coach.zing.fitness.coach.MeasurementUnit
import coach.zing.fitness.coach.ProfileParams
import coach.zing.fitness.coach.SdkAuthentication
import coach.zing.fitness.coach.StartingRoute
import coach.zing.fitness.coach.UserGender
import coach.zing.fitness.coach.embedded.home.HomeScreenConfig
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable

class InitializeArgs : Record {
  @Field val configuration: ConfigurationArgs? = null
  @Field val theme: ThemeArgs? = null
}

class ConfigurationArgs : Record {
  @Field val coachesAvailability = CoachesAvailabilityArg.ALL_COACHES
  @Field val genderAvailability = GenderAvailabilityArg.ALL
  @Field val healthBackgroundSync = false

  fun toSdk() = Configuration(
    coachesAvailability = coachesAvailability.sdk,
    genderAvailability = genderAvailability.sdk,
    healthConnectBackgroundSync = healthBackgroundSync,
  )
}

class LoginArgs : Record {
  @Field val externalToken: String? = null
  @Field val apiKey: String? = null
  @Field val partnerUserId: String? = null

  fun toSdk() = when {
    externalToken != null -> SdkAuthentication.ExternalToken(jwtToken = externalToken)
    apiKey != null -> SdkAuthentication.ApiKey(apiKey = apiKey, partnerUserId = partnerUserId)
    else -> throw CodedException("ERR_INVALID_AUTHENTICATION", "Provide either apiKey or externalToken", null)
  }
}

class HomeArgs : Record {
  @Field var showCloseButton: Boolean? = null
  @Field var showAskCoachButton: Boolean? = null
  @Field var showBodyScanWidget: Boolean? = null

  fun toSdk(defaultShowCloseButton: Boolean) = HomeScreenConfig(
    backButtonIsVisible = showCloseButton ?: defaultShowCloseButton,
    askCoachIsVisible = showAskCoachButton ?: true,
    bodyScanIsVisible = showBodyScanWidget ?: true,
  )
}

fun startingRoute(route: String, home: HomeArgs) = when (route) {
  "home" -> StartingRoute.Home(home.toSdk(defaultShowCloseButton = true))
  "onboarding" -> StartingRoute.Onboarding(navigateToHome = false)
  "customWorkout" -> StartingRoute.CustomWorkout
  "aiAssistant" -> StartingRoute.AiAssistant
  "workoutPlanDetails" -> StartingRoute.WorkoutPlanDetails
  "fullSchedule" -> StartingRoute.FullSchedule
  "profileSettings" -> StartingRoute.ProfileSettings
  "bodyScan" -> StartingRoute.BodyScan
  "flexibilityTest" -> StartingRoute.FlexibilityTest
  "fitnessTest" -> StartingRoute.FitnessTest
  else -> throw CodedException("ERR_UNKNOWN_ROUTE", "Route $route is not supported", null)
}

class ProfileArgs : Record {
  @Field val name: String? = null
  @Field val gender: GenderArg? = null
  @Field val height: Float? = null
  @Field val weight: Float? = null
  @Field val age: Int? = null
  @Field val measurementSystem: MeasurementSystemArg? = null

  fun toSdk() = ProfileParams(
    name = name,
    gender = gender?.sdk,
    height = height,
    weight = weight,
    age = age,
    measurementSystem = measurementSystem?.sdk,
  )
}

enum class CoachesAvailabilityArg(val value: String) : Enumerable {
  ALL_COACHES("allCoaches"), USER_GENDER_BASED("userGenderBased");

  val sdk get() = CoachesAvailability.valueOf(name)
}

enum class GenderAvailabilityArg(val value: String) : Enumerable {
  ALL("all"), BINARY("binary");

  val sdk get() = GenderAvailability.valueOf(name)
}

enum class GenderArg(val value: String) : Enumerable {
  MALE("male"), FEMALE("female"), OTHER("other"), PREFER_NOT_TO_SAY("preferNotToSay");

  val sdk get() = if (this == PREFER_NOT_TO_SAY) null else UserGender.valueOf(name)
}

enum class MeasurementSystemArg(val value: String) : Enumerable {
  METRIC("metric"), IMPERIAL("imperial");

  val sdk get() = MeasurementUnit.valueOf(name)
}
