package expo.modules.zingsdk

import android.content.Context
import coach.zing.fitness.coach.embedded.home.ZingSdkHomeView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class ZingHomeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  override val shouldUseAndroidLayout = true

  val home = HomeArgs()

  private var homeView: ZingSdkHomeView? = null

  fun applyConfig() {
    homeView?.setConfig(home.toSdk(defaultShowCloseButton = false))
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (homeView != null) return
    homeView = ZingSdkHomeView(appContext.currentActivity ?: context).also {
      addView(it, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    }
    applyConfig()
  }
}
