package expo.modules.zingsdk

import android.content.Context
import android.graphics.Typeface
import android.util.Log
import androidx.core.content.res.ResourcesCompat
import coach.zing.fitness.coach.AuthTokenCallback
import coach.zing.fitness.coach.CoachesAvailability
import coach.zing.fitness.coach.Configuration
import coach.zing.fitness.coach.GenderAvailability
import coach.zing.fitness.coach.SdkAuthState
import coach.zing.fitness.coach.SdkAuthentication
import coach.zing.fitness.coach.StartingRoute
import coach.zing.fitness.coach.ZingSdk
import coach.zing.fitness.coach.ZingSdkActivity
import coach.zing.fitness.coach.ZingSdkTheme
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ZingSdkModule : Module() {

  private companion object {
    const val TAG = "ZingSdkModule"
  }

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var authStateJob: Job? = null
  @Volatile private var initialized = false
  @Volatile private var initializing = false
  private val pendingTokenRequests = ConcurrentHashMap<String, CompletableDeferred<String>>()

  override fun definition() = ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged", "onAuthTokenRequested", "onTokenInvalid")

    AsyncFunction("initialize") { args: Map<String, Any?>, promise: Promise ->
      if (initialized || initializing) {
        promise.reject(CodedException("ALREADY_INITIALIZED", "Zing SDK is already initialized", null))
        return@AsyncFunction
      }
      initializing = true
      scope.launch {
        try {
          val auth = buildAuthentication(args)
          val theme = buildTheme(args["theme"].asMapOrNull())
          val configuration = args["configuration"].asMapOrNull()?.let { buildConfiguration(it) }
          ZingSdk.init(auth, theme, configuration)
          initialized = true
          observeAuthState()
          promise.resolve(null)
        } catch (cancellation: CancellationException) {
          throw cancellation
        } catch (error: Throwable) {
          Log.e(TAG, "Failed to initialize Zing SDK", error)
          if (error is IllegalArgumentException) {
            promise.reject(CodedException("INVALID_ARGUMENT", error.message, error))
          } else {
            promise.reject(CodedException("INIT_FAILED", error.message ?: "Initialization failed", error))
          }
        } finally {
          initializing = false
        }
      }
    }

    AsyncFunction("login") { promise: Promise ->
      if (!initialized) {
        promise.reject(CodedException("NOT_INITIALIZED", "Zing SDK is not initialized", null))
        return@AsyncFunction
      }
      scope.launch {
        try {
          ZingSdk.login()
          promise.resolve(null)
        } catch (cancellation: CancellationException) {
          throw cancellation
        } catch (error: Throwable) {
          promise.reject(CodedException("LOGIN_FAILED", error.message ?: "Login failed", error))
        }
      }
    }

    AsyncFunction("logout") { promise: Promise ->
      if (!initialized) {
        promise.reject(CodedException("NOT_INITIALIZED", "Zing SDK is not initialized", null))
        return@AsyncFunction
      }
      scope.launch {
        try {
          ZingSdk.logout()
          promise.resolve(null)
        } catch (cancellation: CancellationException) {
          throw cancellation
        } catch (error: Throwable) {
          promise.reject(CodedException("LOGOUT_FAILED", error.message ?: "Logout failed", error))
        }
      }
    }

    AsyncFunction("openScreen") { route: String, promise: Promise ->
      if (!initialized) {
        promise.reject(CodedException("NOT_INITIALIZED", "Zing SDK is not initialized", null))
        return@AsyncFunction
      }
      val startingRoute = when (route) {
        "home" -> StartingRoute.Home
        "custom_workout" -> StartingRoute.CustomWorkout
        "ai_assistant" -> StartingRoute.AiAssistant
        "workout_plan_details" -> StartingRoute.WorkoutPlanDetails
        "full_schedule" -> StartingRoute.FullSchedule
        "profile_settings" -> StartingRoute.ProfileSettings
        "body_scan" -> StartingRoute.BodyScan
        "flexibility_test" -> StartingRoute.FlexibilityTest
        "fitness_test" -> StartingRoute.FitnessTest
        else -> {
          promise.reject(CodedException("UNKNOWN_ROUTE", "Route $route is not supported", null))
          return@AsyncFunction
        }
      }
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject(CodedException("NO_ACTIVITY", "No activity is currently attached", null))
        return@AsyncFunction
      }
      runCatching { ZingSdkActivity.launch(activity, startingRoute) }
        .onSuccess { promise.resolve(null) }
        .onFailure { error ->
          promise.reject(CodedException("LAUNCH_FAILED", error.message ?: "Failed to launch route", error))
        }
    }

    Function("provideAuthToken") { requestId: String, token: String ->
      pendingTokenRequests.remove(requestId)?.complete(token)
      Unit
    }

    Function("rejectAuthToken") { requestId: String, message: String ->
      pendingTokenRequests.remove(requestId)
        ?.completeExceptionally(RuntimeException("getAuthToken failed: $message"))
      Unit
    }

    OnDestroy {
      authStateJob?.cancel()
      scope.cancel()
      val destroyed = IllegalStateException("ZingSdk module was destroyed before the token request completed")
      pendingTokenRequests.values.forEach { it.completeExceptionally(destroyed) }
      pendingTokenRequests.clear()
    }
  }

  private fun buildAuthentication(args: Map<String, Any?>): SdkAuthentication {
    return when (val type = args["type"] as? String) {
      "apiKey" -> {
        val apiKey = args["apiKey"] as? String
        require(!apiKey.isNullOrEmpty()) { "apiKey is required" }
        SdkAuthentication.ApiKey(apiKey = apiKey)
      }

      "externalToken" -> SdkAuthentication.ExternalToken(
        authTokenCallback = bridgeAuthTokenCallback()
      )

      else -> throw IllegalArgumentException("Unknown auth type: $type")
    }
  }

  /**
   * Suspends the SDK's token request until JS answers the emitted
   * `onAuthTokenRequested` event via `provideAuthToken`/`rejectAuthToken`.
   */
  private fun bridgeAuthTokenCallback() = object : AuthTokenCallback {
    override suspend fun getAuthToken(): String {
      val requestId = UUID.randomUUID().toString()
      val deferred = CompletableDeferred<String>()
      pendingTokenRequests[requestId] = deferred
      sendEvent("onAuthTokenRequested", mapOf("requestId" to requestId))
      try {
        return deferred.await()
      } finally {
        pendingTokenRequests.remove(requestId)
      }
    }

    override fun onTokenInvalid() {
      sendEvent("onTokenInvalid", emptyMap<String, Any>())
    }
  }

  private fun observeAuthState() {
    authStateJob?.cancel()
    authStateJob = scope.launch {
      ZingSdk.authState.collect { state ->
        val mapped = when (state) {
          is SdkAuthState.LoggedOut -> "loggedOut"
          is SdkAuthState.InProgress -> "inProgress"
          is SdkAuthState.LoggedIn -> "authenticated"
          else -> return@collect
        }
        sendEvent("onAuthStateChanged", mapOf("state" to mapped))
      }
    }
  }

  private fun buildTheme(themeMap: Map<String, Any?>?): ZingSdkTheme? {
    val colors = themeMap?.let { buildColors(it) }
    val typography = themeMap?.let { buildTypography(it) }
    val assets = buildAssets()
    val cornerRadius = themeMap?.let { buildCornerRadius(it) }
    if (colors == null && typography == null && assets == null && cornerRadius == null) return null
    return ZingSdkTheme(
      colors = colors,
      typography = typography,
      assets = assets,
      cornerRadius = cornerRadius,
    )
  }

  private fun buildColors(themeMap: Map<String, Any?>): ZingSdkTheme.Colors? {
    val colorsMap = themeMap["colors"].asMapOrNull() ?: return null
    fun color(key: String): Long? = (colorsMap[key] as? Number)?.toLong()
    return ZingSdkTheme.Colors(
      brandPrimary = color("brand/primary"),
      brandSecondary = color("brand/secondary"),
      textHeadingDarkPrimary = color("text/heading/dark-primary"),
      textHeadingLightPrimary = color("text/heading/light-primary"),
      textBodyDarkPrimary = color("text/body/dark-primary"),
      textBodyDarkSecondary = color("text/body/dark-secondary"),
      buttonPrimary = color("button/primary"),
      buttonSecondary = color("button/secondary"),
      bgPrimary = color("bg/primary"),
      bgSecondary = color("bg/secondary"),
    )
  }

  private fun buildTypography(themeMap: Map<String, Any?>): ZingSdkTheme.Typography? {
    val typographyMap = themeMap["typography"].asMapOrNull() ?: return null
    val context = hostContext() ?: return null
    val system = (typographyMap["system"] as? String)?.let { loadFont(context, it) }
    val brand = (typographyMap["brand"] as? String)?.let { loadFont(context, it) }
    if (system == null && brand == null) return null
    return ZingSdkTheme.Typography(system = system, brand = brand)
  }

  private fun loadFont(context: Context, fontName: String): Typeface? {
    val resId = context.resources.getIdentifier(fontName, "font", context.packageName)
    if (resId == 0) {
      Log.w(TAG, "Font not found in host res/font: $fontName")
      return null
    }
    return ResourcesCompat.getFont(context, resId)
  }

  private fun buildAssets(): ZingSdkTheme.Assets? {
    val context = hostContext() ?: return null

    fun drawable(name: String): Int? {
      val id = context.resources.getIdentifier(name, "drawable", context.packageName)
      return if (id != 0) id else null
    }

    val planBackground = drawable("zing_plan_background")
    val welcomePicture = drawable("zing_welcome_picture")
    val coachAsset = ZingSdkTheme.Assets.CoachAsset(
      john = drawable("zing_coach_john"),
      jennifer = drawable("zing_coach_jennifer"),
      sarah = drawable("zing_coach_sarah"),
      chris = drawable("zing_coach_chris"),
    )
    val hasCoach = coachAsset.john != null || coachAsset.jennifer != null ||
      coachAsset.sarah != null || coachAsset.chris != null

    if (planBackground == null && welcomePicture == null && !hasCoach) return null
    return ZingSdkTheme.Assets(
      planBackground = planBackground,
      welcomePicture = welcomePicture,
      coachImages = if (hasCoach) coachAsset else null,
    )
  }

  private fun buildCornerRadius(themeMap: Map<String, Any?>): ZingSdkTheme.CornerRadius? {
    val cornerMap = themeMap["cornersRounding"].asMapOrNull() ?: return null
    val buttonMap = cornerMap["button/border"].asMapOrNull() ?: return null
    val sdkRadius = when (buttonMap["type"] as? String) {
      "pill" -> ZingSdkTheme.CornerRadius.SdkRadius.Pill
      "value" -> {
        val value = (buttonMap["value"] as? Number)?.toInt() ?: 0
        ZingSdkTheme.CornerRadius.SdkRadius.Value(value)
      }
      else -> return null
    }
    return ZingSdkTheme.CornerRadius(button = sdkRadius)
  }

  private fun buildConfiguration(configMap: Map<String, Any?>): Configuration {
    val coachesAvailability = when (configMap["coachesAvailability"] as? String) {
      "allCoaches" -> CoachesAvailability.ALL_COACHES
      "userGenderBased" -> CoachesAvailability.USER_GENDER_BASED
      else -> null
    }
    val genderAvailability = when (configMap["genderAvailability"] as? String) {
      "all" -> GenderAvailability.ALL
      "binary" -> GenderAvailability.BINARY
      else -> null
    }
    val healthBackgroundSync = configMap["healthBackgroundSync"] as? Boolean ?: false
    return Configuration(
      coachesAvailability = coachesAvailability,
      genderAvailability = genderAvailability,
      healthConnectBackgroundSync = healthBackgroundSync,
    )
  }

  private fun hostContext(): Context? =
    appContext.currentActivity ?: appContext.reactContext

  @Suppress("UNCHECKED_CAST")
  private fun Any?.asMapOrNull(): Map<String, Any?>? = this as? Map<String, Any?>
}
