package expo.modules.zingsdk

import android.annotation.SuppressLint
import android.content.Context
import androidx.core.content.res.ResourcesCompat
import coach.zing.fitness.coach.ZingSdkTheme
import coach.zing.fitness.coach.ZingSdkTheme.CornerRadius.SdkRadius
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import expo.modules.kotlin.types.Enumerable

class ThemeArgs : Record {
  @Field val colors: Map<String, Long> = emptyMap()
  @Field val typography: TypographyArgs? = null
  @Field val cornersRounding: CornersRoundingArgs? = null

  @SuppressLint("DiscouragedApi")
  fun toSdk(context: Context): ZingSdkTheme {
    fun resourceId(name: String, type: String) =
      context.resources.getIdentifier(name, type, context.packageName).takeIf { it != 0 }
    fun drawable(name: String) = resourceId(name, "drawable")
    fun font(name: String?) = name?.let { resourceId(it, "font") }?.let { ResourcesCompat.getFont(context, it) }

    return ZingSdkTheme(
      colors = ZingSdkTheme.Colors(
        brandPrimary = colors["brand/primary"],
        brandSecondary = colors["brand/secondary"],
        brandText = colors["brand/text"],
        textHeadingDarkPrimary = colors["heading/primary"],
        textHeadingLightPrimary = colors["heading/primary-inv"],
        textBodyDarkPrimary = colors["fg/primary"],
        textBodyDarkSecondary = colors["fg/secondary"],
        buttonPrimary = colors["button/bg-primary"],
        buttonSecondary = colors["button/bg-secondary"],
        bgPrimary = colors["bg/primary"],
        bgSecondary = colors["bg/secondary"],
        bgTertiary = colors["bg/tertiary"],
        bgLight = colors["bg/light"],
        bgLight24 = colors["bg/light-24"],
        bgLight64 = colors["bg/light-64"],
        bgLight8 = colors["bg/light-8"],
        bgAccentLayer = colors["bg/accent-layer"],
        borderPrimary = colors["border/primary"],
        borderSecondary = colors["border/secondary"],
        borderGloss = colors["border/gloss"],
        cardBgPrimary = colors["card-bg/primary"],
        cardBgSecondary = colors["card-bg/secondary"],
        cvBgBodyScan = colors["cv/bg-body-scan"],
        cvBgFitnessTest = colors["cv/bg-fitness-test"],
        cvBgFlexibilityTest = colors["cv/bg-flexibility-test"],
        cvPrimary = colors["cv/primary"],
        fgPrimaryDark = colors["fg/primary-dark"],
        fgPrimaryInv = colors["fg/primary-inv"],
        fgPrimaryLight = colors["fg/primary-light"],
        fgRed = colors["fg/red"],
        overlayCardAccent = colors["overlay/card/accent"],
        overlayCardDefault = colors["overlay/card/default"],
      ),
      typography = ZingSdkTheme.Typography(system = font(typography?.system), brand = font(typography?.brand)),
      assets = ZingSdkTheme.Assets(
        planBackground = drawable("zing_plan_background"),
        coachImages = ZingSdkTheme.Assets.CoachAsset(
          john = drawable("zing_coach_john"),
          jennifer = drawable("zing_coach_jennifer"),
          sarah = drawable("zing_coach_sarah"),
          chris = drawable("zing_coach_chris"),
        ),
      ),
      cornerRadius = ZingSdkTheme.CornerRadius(button = cornersRounding?.button?.toSdk()),
    )
  }
}

class TypographyArgs : Record {
  @Field val system: String? = null
  @Field val brand: String? = null
}

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
