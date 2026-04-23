package expo.modules.zingsdk

import coach.zing.fitness.coach.SdkAuthState
import coach.zing.fitness.coach.StartingRoute
import coach.zing.fitness.coach.ZingSdk
import coach.zing.fitness.coach.ZingSdkActivity
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class ZingSdkModule : Module() {

  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
  private var authStateJob: Job? = null
  private var initialized = false

  override fun definition() = ModuleDefinition {
    Name("ZingSdk")

    Events("onAuthStateChanged")

    AsyncFunction("initialize") { _: Map<String, String>, promise: Promise ->
      if (!initialized) {
        initialized = true
        observeAuthState()
      }
      promise.resolve(null)
    }

    AsyncFunction("login") { promise: Promise ->
      if (!initialized) {
        promise.reject(CodedException("NOT_INITIALIZED", "Zing SDK is not initialized", null))
        return@AsyncFunction
      }
      scope.launch {
        runCatching { ZingSdk.login() }
          .onSuccess { promise.resolve(null) }
          .onFailure { error ->
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
        runCatching { ZingSdk.logout() }
          .onSuccess { promise.resolve(null) }
          .onFailure { error ->
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

    OnDestroy {
      authStateJob?.cancel()
      scope.cancel()
    }
  }

  private fun observeAuthState() {
    authStateJob?.cancel()
    authStateJob = scope.launch {
      ZingSdk.authState.collect { state ->
        val mapped = when (state) {
          is SdkAuthState.LoggedOut -> "loggedOut"
          is SdkAuthState.InProgress -> "inProgress"
          is SdkAuthState.Authenticated -> "authenticated"
          else -> return@collect
        }
        sendEvent("onAuthStateChanged", mapOf("state" to mapped))
      }
    }
  }
}
