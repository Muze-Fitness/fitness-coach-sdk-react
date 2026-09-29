package expo.modules.zingsdk

import android.content.Context
import coach.zing.fitness.coach.CriticalErrorHandler
import coach.zing.fitness.coach.SdkAuthState
import coach.zing.fitness.coach.ZingSdk
import coach.zing.fitness.coach.ZingSdkActivity
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
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

    (AsyncFunction("initialize") Coroutine { args: InitializeArgs ->
      ZingSdk.init(
        theme = args.theme?.toSdk(context),
        configuration = args.configuration?.toSdk(),
      )
      observeAuthState()
    }).runOnQueue(Queues.MAIN)

    (AsyncFunction("login") Coroutine { args: LoginArgs ->
      ZingSdk.login(args.toSdk())
    }).runOnQueue(Queues.MAIN)

    (AsyncFunction("logout") Coroutine { ->
      ZingSdk.logout()
    }).runOnQueue(Queues.MAIN)

    AsyncFunction("setTheme") { theme: ThemeArgs ->
      ZingSdk.theme.value = theme.toSdk(context)
    }

    AsyncFunction("openScreen") { route: String, home: HomeArgs ->
      val activity = appContext.currentActivity
        ?: throw CodedException("ERR_NO_PRESENTER", "No activity to present from", null)
      ZingSdkActivity.launch(activity, startingRoute(route, home))
    }.runOnQueue(Queues.MAIN)

    (AsyncFunction("setProfileParams") Coroutine { args: ProfileArgs ->
      ZingSdk.setProfileParams(args.toSdk())
    }).runOnQueue(Queues.MAIN)

    (AsyncFunction("setPrimaryLocationId") Coroutine { id: String ->
      ZingSdk.setPrimaryLocationId(id)
    }).runOnQueue(Queues.MAIN)

    View(ZingHomeView::class) {
      Prop("showCloseButton") { view: ZingHomeView, value: Boolean? ->
        view.home.showCloseButton = value
      }
      Prop("showAskCoachButton") { view: ZingHomeView, value: Boolean? ->
        view.home.showAskCoachButton = value
      }
      Prop("showBodyScanWidget") { view: ZingHomeView, value: Boolean? ->
        view.home.showBodyScanWidget = value
      }
      OnViewDidUpdateProps { view: ZingHomeView -> view.applyConfig() }
    }
  }

  private fun observeAuthState() {
    authStateJob?.cancel()
    authStateJob = appContext.mainQueue.launch {
      ZingSdk.authState.collect { state ->
        state?.payload?.let { sendEvent("onAuthStateChanged", it) }
      }
    }
  }
}

private val SdkAuthState.payload: Map<String, String>
  get() = when (this) {
    is SdkAuthState.LoggedOut -> mapOf("status" to "loggedOut")
    is SdkAuthState.InProgress -> mapOf("status" to "inProgress")
    is SdkAuthState.LoggedIn -> mapOf("status" to "loggedIn", "userId" to userId)
  }
