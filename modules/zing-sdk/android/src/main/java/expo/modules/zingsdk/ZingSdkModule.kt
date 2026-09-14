package expo.modules.zingsdk

import android.annotation.SuppressLint
import android.content.Context
import androidx.core.content.res.ResourcesCompat
import coach.zing.fitness.coach.CoachesAvailability
import coach.zing.fitness.coach.Configuration
import coach.zing.fitness.coach.CriticalErrorHandler
import coach.zing.fitness.coach.GenderAvailability
import coach.zing.fitness.coach.MeasurementUnit
import coach.zing.fitness.coach.ProfileParams
import coach.zing.fitness.coach.SdkAuthState
import coach.zing.fitness.coach.SdkAuthentication
import coach.zing.fitness.coach.StartingRoute
import coach.zing.fitness.coach.UserGender
import coach.zing.fitness.coach.ZingSdk
import coach.zing.fitness.coach.ZingSdkActivity
import coach.zing.fitness.coach.ZingSdkTheme
import coach.zing.fitness.coach.ZingSdkTheme.CornerRadius.SdkRadius
import coach.zing.fitness.coach.embedded.home.HomeScreenConfig
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

class ZingSdkModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  private var authStateJob: Job? = null

  override fun definition() = ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged", "onCriticalError")

    OnCreate {
      ZingSdk.criticalErrorHandler = CriticalErrorHandler { error ->
        sendEvent("onCriticalError", mapOf("code" to "authError", "message" to error.toString()))
      }
    }

    OnDestroy {
      authStateJob?.cancel()
    }

    // The SDK expects its suspend functions to be called on the main thread.
    (AsyncFunction("initialize") Coroutine { args: InitializeArgs ->
      ZingSdk.init(theme = args.theme?.let(::buildTheme), configuration = args.configuration?.toSdk())
      observeAuthState()
    }).runOnQueue(Queues.MAIN)

    (AsyncFunction("login") Coroutine { args: LoginArgs ->
      ZingSdk.login(
        when {
          args.jwtToken != null -> SdkAuthentication.ExternalToken(jwtToken = args.jwtToken)
          args.apiKey != null -> SdkAuthentication.ApiKey(apiKey = args.apiKey, partnerUserId = args.partnerUserId)
          else -> throw CodedException("ERR_INVALID_AUTHENTICATION", "Provide either apiKey or externalToken", null)
        }
      )
    }).runOnQueue(Queues.MAIN)

    (AsyncFunction("logout") Coroutine { ->
      ZingSdk.logout()
    }).runOnQueue(Queues.MAIN)

    AsyncFunction("openScreen") { route: String, home: HomeArgs ->
      val startingRoute = when (route) {
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
      val activity = appContext.currentActivity
        ?: throw CodedException("ERR_NO_ACTIVITY", "No activity is currently attached", null)
      ZingSdkActivity.launch(activity, startingRoute)
    }

    (AsyncFunction("setProfileParams") Coroutine { args: ProfileArgs ->
      ZingSdk.setProfileParams(
        ProfileParams(
          name = args.name,
          gender = args.gender?.sdk,
          height = args.height,
          weight = args.weight,
          age = args.age,
          measurementSystem = args.measurementSystem?.sdk,
        )
      )
    }).runOnQueue(Queues.MAIN)

    View(ZingHomeView::class) {
      Prop("showCloseButton") { view: ZingHomeView, value: Boolean? ->
        view.showCloseButton = value ?: false
      }
      Prop("showAskCoachButton") { view: ZingHomeView, value: Boolean? ->
        view.showAskCoachButton = value ?: true
      }
      OnViewDidUpdateProps { view: ZingHomeView -> view.applyConfig() }
    }
  }

  private fun observeAuthState() {
    authStateJob?.cancel()
    authStateJob = appContext.mainQueue.launch {
      ZingSdk.authState.collect { state ->
        val payload = when (state) {
          is SdkAuthState.LoggedOut -> mapOf("state" to "loggedOut")
          is SdkAuthState.InProgress -> mapOf("state" to "inProgress")
          is SdkAuthState.LoggedIn -> mapOf("state" to "authenticated", "userId" to state.userId)
          else -> return@collect
        }
        sendEvent("onAuthStateChanged", payload)
      }
    }
  }

  private fun buildTheme(theme: ThemeArgs): ZingSdkTheme? {
    val colors = theme.colors?.toSdk()
    val typography = theme.typography?.let(::buildTypography)
    val buttonRadius = theme.cornersRounding?.button?.toSdk()
    val assets = buildAssets()
    if (colors == null && typography == null && buttonRadius == null && assets == null) return null
    return ZingSdkTheme(
      colors = colors,
      typography = typography,
      assets = assets,
      cornerRadius = buttonRadius?.let { ZingSdkTheme.CornerRadius(button = it) },
    )
  }

  private fun buildTypography(typography: TypographyArgs): ZingSdkTheme.Typography? {
    fun font(name: String?) = name?.let { resourceId(it, "font") }?.let { ResourcesCompat.getFont(context, it) }
    val system = font(typography.system)
    val brand = font(typography.brand)
    if (system == null && brand == null) return null
    return ZingSdkTheme.Typography(system = system, brand = brand)
  }

  private fun buildAssets(): ZingSdkTheme.Assets? {
    val planBackground = resourceId("zing_plan_background", "drawable")
    val coachImages = ZingSdkTheme.Assets.CoachAsset(
      john = resourceId("zing_coach_john", "drawable"),
      jennifer = resourceId("zing_coach_jennifer", "drawable"),
      sarah = resourceId("zing_coach_sarah", "drawable"),
      chris = resourceId("zing_coach_chris", "drawable"),
    )
    val hasCoachImages = listOf(coachImages.john, coachImages.jennifer, coachImages.sarah, coachImages.chris).any { it != null }
    if (planBackground == null && !hasCoachImages) return null
    return ZingSdkTheme.Assets(planBackground = planBackground, coachImages = coachImages.takeIf { hasCoachImages })
  }

  // Resource names come from the app's config plugin at runtime, so they cannot be referenced through R.
  @SuppressLint("DiscouragedApi")
  private fun resourceId(name: String, type: String) =
    context.resources.getIdentifier(name, type, context.packageName).takeIf { it != 0 }
}

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
  @Field val jwtToken: String? = null
  @Field val apiKey: String? = null
  @Field val partnerUserId: String? = null
}

class HomeArgs : Record {
  @Field val showCloseButton: Boolean? = null
  @Field val showAskCoachButton: Boolean? = null

  fun toSdk(defaultShowCloseButton: Boolean) = HomeScreenConfig(
    backButtonIsVisible = showCloseButton ?: defaultShowCloseButton,
    askCoachIsVisible = showAskCoachButton ?: true,
  )
}

class ProfileArgs : Record {
  @Field val name: String? = null
  @Field val gender: GenderArg? = null
  @Field val height: Float? = null
  @Field val weight: Float? = null
  @Field val age: Int? = null
  @Field val measurementSystem: MeasurementSystemArg? = null
}

class ThemeArgs : Record {
  @Field val colors: ColorsArgs? = null
  @Field val typography: TypographyArgs? = null
  @Field val cornersRounding: CornersRoundingArgs? = null
}

// Unsigned ARGB integers, keyed by design token.
class ColorsArgs : Record {
  @Field("brand/primary") val brandPrimary: Long? = null
  @Field("brand/secondary") val brandSecondary: Long? = null
  @Field("text/heading/dark-primary") val textHeadingDarkPrimary: Long? = null
  @Field("text/heading/light-primary") val textHeadingLightPrimary: Long? = null
  @Field("text/body/dark-primary") val textBodyDarkPrimary: Long? = null
  @Field("text/body/dark-secondary") val textBodyDarkSecondary: Long? = null
  @Field("button/primary") val buttonPrimary: Long? = null
  @Field("button/secondary") val buttonSecondary: Long? = null
  @Field("bg/primary") val bgPrimary: Long? = null
  @Field("bg/secondary") val bgSecondary: Long? = null

  fun toSdk() = ZingSdkTheme.Colors(
    brandPrimary = brandPrimary,
    brandSecondary = brandSecondary,
    textHeadingDarkPrimary = textHeadingDarkPrimary,
    textHeadingLightPrimary = textHeadingLightPrimary,
    textBodyDarkPrimary = textBodyDarkPrimary,
    textBodyDarkSecondary = textBodyDarkSecondary,
    buttonPrimary = buttonPrimary,
    buttonSecondary = buttonSecondary,
    bgPrimary = bgPrimary,
    bgSecondary = bgSecondary,
  )
}

class TypographyArgs : Record {
  @Field val system: String? = null
  @Field val brand: String? = null
}

// The Android SDK only supports the button radius.
class CornersRoundingArgs : Record {
  @Field("radius/button") val button: RadiusArgs? = null
}

class RadiusArgs : Record {
  @Field val type = RadiusType.VALUE
  @Field val value = 0

  fun toSdk() = when (type) {
    RadiusType.PILL -> SdkRadius.Pill
    RadiusType.VALUE -> SdkRadius.Value(value)
  }
}

enum class RadiusType(val value: String) : Enumerable { PILL("pill"), VALUE("value") }

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
