Pod::Spec.new do |s|
  s.name           = 'ZingSdk'
  s.version        = '1.0.0'
  s.summary        = 'Zing Coach SDK wrapper for React Native'
  s.description    = 'Thin Expo Module bridging the native Zing Coach iOS SDK to JavaScript.'
  s.author         = 'Mikhail Vospennikov'
  s.homepage       = 'https://github.com/Muze-Fitness/expo-modules-zing-sdk'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # The ZingCoach SPM product is attached to this pod target by a post_install
  # hook injected by plugins/withZingSdk.js. That hook also adds the package
  # reference to the main Xcode project so the app target links the framework.
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_INCLUDE_PATHS' => '$(inherited) "${BUILD_DIR}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}"',
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${BUILD_DIR}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/PackageFrameworks"',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
