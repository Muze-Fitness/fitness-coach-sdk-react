package expo.modules.zingsdk

import android.content.Context
import coach.zing.fitness.coach.embedded.home.HomeScreenConfig
import coach.zing.fitness.coach.embedded.home.ZingSdkHomeView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.views.ExpoView

class ZingHomeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  override val shouldUseAndroidLayout = true

  var showCloseButton = false
  var showAskCoachButton = true

  private var homeView: ZingSdkHomeView? = null

  fun applyConfig() {
    homeView?.setConfig(
      HomeScreenConfig(backButtonIsVisible = showCloseButton, askCoachIsVisible = showAskCoachButton)
    )
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
