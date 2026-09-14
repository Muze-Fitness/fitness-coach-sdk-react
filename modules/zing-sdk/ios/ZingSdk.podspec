Pod::Spec.new do |s|
  s.name           = 'ZingSdk'
  s.version        = '1.0.0'
  s.summary        = 'Zing Coach SDK for React Native'
  s.author         = 'Zing Coach'
  s.homepage       = 'https://github.com/Muze-Fitness/zing-coach-sdk-ios'
  s.platforms      = { :ios => '16.0' }
  s.source         = { git: '' }
  s.static_framework = true
  s.source_files   = '*.swift'

  s.dependency 'ExpoModulesCore'
  spm_dependency(s,
    url: 'https://github.com/Muze-Fitness/zing-coach-sdk-ios',
    requirement: { kind: 'exactVersion', version: '2.2.0' },
    products: ['ZingCoach']
  )

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'FRAMEWORK_SEARCH_PATHS' => '$(inherited) "${BUILD_DIR}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/PackageFrameworks"',
  }
end
