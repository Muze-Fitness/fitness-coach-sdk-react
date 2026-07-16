const {
  withInfoPlist,
  withEntitlementsPlist,
  withXcodeProject,
  withPodfile,
  withMainApplication,
  withAppBuildGradle,
  withProjectBuildGradle,
} = require('@expo/config-plugins');

const IOS_PERMISSIONS = {
  NSHealthShareUsageDescription:
    'We use your health data to personalize workouts and track your fitness progress.',
  NSHealthUpdateUsageDescription:
    'We save your workout data to Apple Health for comprehensive fitness tracking.',
  NSCameraUsageDescription:
    'We need access to your camera for various Computer Vision features and AI Assistant chat.',
  NSPhotoLibraryUsageDescription:
    'We need access to your photo library for photo-enabled interactions with the AI Assistant.',
};

const SPM_PACKAGES = [
  {
    url: 'https://github.com/Muze-Fitness/zing-coach-sdk-ios',
    version: '1.8.0',
    products: ['ZingCoach'],
  },
];

const withIosInfoPlistPermissions = (config) =>
  withInfoPlist(config, (cfg) => {
    for (const [key, value] of Object.entries(IOS_PERMISSIONS)) {
      if (!cfg.modResults[key]) {
        cfg.modResults[key] = value;
      }
    }
    return cfg;
  });

const withIosHealthKitEntitlement = (config) =>
  withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.healthkit'] = true;
    if (!Array.isArray(cfg.modResults['com.apple.developer.healthkit.access'])) {
      cfg.modResults['com.apple.developer.healthkit.access'] = [];
    }
    return cfg;
  });

const withIosSwiftPackages = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    for (const pkg of SPM_PACKAGES) {
      addSwiftPackageToProject(project, cfg.modRequest.projectName, pkg);
    }
    return cfg;
  });

const SPM_EMBED_SCRIPT_MARKER = '# ZingSdk: embed SPM-built frameworks';
const SPM_EMBED_SCRIPT = `${SPM_EMBED_SCRIPT_MARKER}
set -e
APP_FRAMEWORKS="\${TARGET_BUILD_DIR}/\${FULL_PRODUCT_NAME}/Frameworks"
mkdir -p "$APP_FRAMEWORKS"
copy_framework() {
  local name="$1"
  local src="$2"
  if [ -d "$src" ]; then
    rsync -a --delete "$src/" "$APP_FRAMEWORKS/$name.framework/"
    if [ -n "$EXPANDED_CODE_SIGN_IDENTITY" ]; then
      codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --preserve-metadata=identifier,entitlements --timestamp=none --generate-entitlement-der "$APP_FRAMEWORKS/$name.framework" || true
    fi
  fi
}
for FW in ZingCoachSDK Lottie-Dynamic SnapKit-Dynamic ZingCoachDynamicDependencies; do
  if [ -d "\${BUILT_PRODUCTS_DIR}/PackageFrameworks/$FW.framework" ]; then
    copy_framework "$FW" "\${BUILT_PRODUCTS_DIR}/PackageFrameworks/$FW.framework"
  elif [ -d "\${BUILT_PRODUCTS_DIR}/$FW.framework" ]; then
    copy_framework "$FW" "\${BUILT_PRODUCTS_DIR}/$FW.framework"
  fi
done
`;

const withIosEmbedSpmFrameworks = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const objects = project.hash.project.objects;
    const appTargetUuid = findAppTargetUuid(objects, cfg.modRequest.projectName);
    if (!appTargetUuid) return cfg;

    const target = objects.PBXNativeTarget[appTargetUuid];
    const existing = target.buildPhases.find((bp) => {
      const phaseUuid = bp.value;
      const phase = objects.PBXShellScriptBuildPhase && objects.PBXShellScriptBuildPhase[phaseUuid];
      if (!phase || typeof phase !== 'object') return false;
      return typeof phase.shellScript === 'string' && phase.shellScript.includes(SPM_EMBED_SCRIPT_MARKER);
    });
    if (existing) return cfg;

    if (!objects.PBXShellScriptBuildPhase) objects.PBXShellScriptBuildPhase = {};
    const phaseUuid = project.generateUuid();
    objects.PBXShellScriptBuildPhase[phaseUuid] = {
      isa: 'PBXShellScriptBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      inputFileListPaths: [],
      inputPaths: [],
      name: '"[ZingSdk] Embed SPM frameworks"',
      outputFileListPaths: [],
      outputPaths: [],
      runOnlyForDeploymentPostprocessing: 0,
      shellPath: '/bin/sh',
      shellScript: JSON.stringify(SPM_EMBED_SCRIPT),
      alwaysOutOfDate: 1,
    };
    objects.PBXShellScriptBuildPhase[`${phaseUuid}_comment`] = '[ZingSdk] Embed SPM frameworks';

    target.buildPhases.push({
      value: phaseUuid,
      comment: '[ZingSdk] Embed SPM frameworks',
    });
    return cfg;
  });

const POD_POST_INSTALL_MARKER = '# ZingSdk: attach SPM products to pod target';

const productNames = SPM_PACKAGES.flatMap((p) => p.products);
const productNamesRuby = productNames.map((n) => `'${n}'`).join(', ');
const primaryPackage = SPM_PACKAGES[0];

const SPM_PATCH = `
    ${POD_POST_INSTALL_MARKER}
    begin
      zing_target = installer.pods_project.targets.find { |t| t.name == 'ZingSdk' }
      if zing_target
        pods_project = installer.pods_project
        pods_package_ref = pods_project.root_object.package_references.find do |ref|
          ref.respond_to?(:repositoryURL) && ref.repositoryURL.to_s.include?('zing-coach-sdk-ios')
        end
        unless pods_package_ref
          pods_package_ref = pods_project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
          pods_package_ref.repositoryURL = '${primaryPackage.url}'
          pods_package_ref.requirement = { 'kind' => 'exactVersion', 'version' => '${primaryPackage.version}' }
          pods_project.root_object.package_references << pods_package_ref
        end
        existing = zing_target.package_product_dependencies.map(&:product_name)
        [${productNamesRuby}].each do |product_name|
          next if existing.include?(product_name)
          dep = pods_project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
          dep.package = pods_package_ref
          dep.product_name = product_name
          zing_target.package_product_dependencies << dep
        end
        pods_project.save
      end
    rescue => e
      Pod::UI.warn "Failed to attach SPM products to ZingSdk: #{e.message}"
    end
`;

const withIosPodfilePostInstall = (config) =>
  withPodfile(config, (cfg) => {
    if (cfg.modResults.contents.includes(POD_POST_INSTALL_MARKER)) {
      return cfg;
    }
    const rnHook = /react_native_post_install\([\s\S]*?\)\s*\n/;
    if (!rnHook.test(cfg.modResults.contents)) {
      throw new Error('withZingSdk: could not find react_native_post_install anchor in Podfile');
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(rnHook, (match) => match + SPM_PATCH);
    return cfg;
  });

function addSwiftPackageToProject(project, projectName, { url, version, products }) {
  const pkgRefUuid = project.generateUuid();
  const pkgRefComment = `XCRemoteSwiftPackageReference "${packageNameFromUrl(url)}"`;

  const objects = project.hash.project.objects;

  if (!objects.XCRemoteSwiftPackageReference) {
    objects.XCRemoteSwiftPackageReference = {};
  }
  if (!objects.XCSwiftPackageProductDependency) {
    objects.XCSwiftPackageProductDependency = {};
  }

  objects.XCRemoteSwiftPackageReference[pkgRefUuid] = {
    isa: 'XCRemoteSwiftPackageReference',
    repositoryURL: `"${url}"`,
    requirement: {
      kind: 'exactVersion',
      version,
    },
  };
  objects.XCRemoteSwiftPackageReference[`${pkgRefUuid}_comment`] = pkgRefComment;

  const rootProjectUuid = project.getFirstProject().uuid;
  const rootProject = objects.PBXProject[rootProjectUuid];
  if (!rootProject.packageReferences) {
    rootProject.packageReferences = [];
  }
  if (!rootProject.packageReferences.some((r) => r.value === pkgRefUuid)) {
    rootProject.packageReferences.push({ value: pkgRefUuid, comment: pkgRefComment });
  }

  const appTargetUuid = findAppTargetUuid(objects, projectName);
  if (!appTargetUuid) {
    throw new Error(`Could not find app target for project "${projectName}"`);
  }
  const appTarget = objects.PBXNativeTarget[appTargetUuid];
  if (!appTarget.packageProductDependencies) {
    appTarget.packageProductDependencies = [];
  }

  const frameworksBuildPhaseUuid = appTarget.buildPhases.find(
    (bp) => bp.comment === 'Frameworks'
  )?.value;
  if (!frameworksBuildPhaseUuid) {
    throw new Error('Could not find Frameworks build phase for app target');
  }
  const frameworksBuildPhase = objects.PBXFrameworksBuildPhase[frameworksBuildPhaseUuid];

  for (const productName of products) {
    const productUuid = project.generateUuid();
    objects.XCSwiftPackageProductDependency[productUuid] = {
      isa: 'XCSwiftPackageProductDependency',
      package: pkgRefUuid,
      package_comment: pkgRefComment,
      productName,
    };
    objects.XCSwiftPackageProductDependency[`${productUuid}_comment`] = productName;

    appTarget.packageProductDependencies.push({ value: productUuid, comment: productName });

    const buildFileUuid = project.generateUuid();
    if (!objects.PBXBuildFile) objects.PBXBuildFile = {};
    objects.PBXBuildFile[buildFileUuid] = {
      isa: 'PBXBuildFile',
      productRef: productUuid,
      productRef_comment: productName,
    };
    objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${productName} in Frameworks`;

    frameworksBuildPhase.files.push({
      value: buildFileUuid,
      comment: `${productName} in Frameworks`,
    });
  }
}

function packageNameFromUrl(url) {
  const stripped = url.replace(/\.git$/, '');
  const parts = stripped.split('/');
  return parts[parts.length - 1];
}

function findAppTargetUuid(objects, projectName) {
  const targets = objects.PBXNativeTarget || {};
  for (const [uuid, target] of Object.entries(targets)) {
    if (typeof target !== 'object' || uuid.endsWith('_comment')) continue;
    if (target.productType === '"com.apple.product-type.application"' && target.name === projectName) {
      return uuid;
    }
  }
  for (const [uuid, target] of Object.entries(targets)) {
    if (typeof target !== 'object' || uuid.endsWith('_comment')) continue;
    if (target.productType === '"com.apple.product-type.application"') {
      return uuid;
    }
  }
  return null;
}

// SDK initialization happens in the ZingSdk Expo module (driven from JS via
// initialize()); MainApplication only needs the SdkApplication base class and Hilt.
const withAndroidMainApplication = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (!src.includes('import dagger.hilt.android.HiltAndroidApp')) {
      src = src.replace(
        /(package [^\n]+\n)/,
        `$1\nimport coach.zing.fitness.coach.SdkApplication\nimport dagger.hilt.android.HiltAndroidApp\n`
      );
    }

    src = src.replace(
      /class MainApplication\s*:\s*Application\(\)/,
      `@HiltAndroidApp\nclass MainApplication : SdkApplication()`
    );

    cfg.modResults.contents = src;
    return cfg;
  });

const withAndroidAppBuildGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (!src.includes('com.google.devtools.ksp')) {
      src = src.replace(
        /apply plugin:\s*["']com\.android\.application["']/,
        `apply plugin: "com.android.application"\napply plugin: "com.google.devtools.ksp"\napply plugin: "dagger.hilt.android.plugin"`
      );
    }

    if (!src.includes('hilt-android')) {
      src = src.replace(
        /dependencies\s*\{/,
        `dependencies {\n    implementation "com.google.dagger:hilt-android:2.56.2"\n    ksp "com.google.dagger:hilt-android-compiler:2.56.2"`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });

const withAndroidProjectBuildGradle = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    if (!src.includes('com.google.devtools.ksp')) {
      src = src.replace(
        /dependencies\s*\{/,
        `dependencies {\n        classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.1.20-1.0.32")\n        classpath("com.google.dagger:hilt-android-gradle-plugin:2.56.2")`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });

const GITHUB_PACKAGES_MARKER = '// ZingSdk: GitHub Packages for Muze-Fitness Android SDK';

const withAndroidSdkMavenRepo = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(GITHUB_PACKAGES_MARKER)) {
      return cfg;
    }

    const repoBlock = `
allprojects {
    repositories {
        ${GITHUB_PACKAGES_MARKER}
        maven {
            url = uri("https://maven.pkg.github.com/Muze-Fitness/fitness-coach-sdk-android")
            credentials {
                def props = new Properties()
                def localPropertiesFile = rootProject.file('local.properties')
                if (localPropertiesFile.exists()) {
                    props.load(new FileInputStream(localPropertiesFile))
                }
                username = props.getProperty('sdk_maven_read_username') ?: props.getProperty('zing_sdk_username') ?: System.getenv('ZING_SDK_MAVEN_USER')
                password = props.getProperty('sdk_maven_read_token') ?: props.getProperty('zing_sdk_token') ?: System.getenv('ZING_SDK_MAVEN_TOKEN')
            }
        }
    }
}
`;
    cfg.modResults.contents = src + repoBlock;
    return cfg;
  });

module.exports = function withZingSdk(config) {
  config = withIosInfoPlistPermissions(config);
  config = withIosHealthKitEntitlement(config);
  // SPM is attached only to the ZingSdk pod target (via the Podfile post_install
  // hook). The main app target does NOT link the SPM product — doing so would
  // statically re-absorb Swift source targets like DesignSystem and cause
  // duplicate-symbol errors. Instead, the build script added by
  // `withIosEmbedSpmFrameworks` copies the dynamic SPM-built frameworks into
  // the app bundle so they can be loaded at runtime.
  config = withIosPodfilePostInstall(config);
  config = withIosEmbedSpmFrameworks(config);
  config = withAndroidMainApplication(config);
  config = withAndroidAppBuildGradle(config);
  config = withAndroidProjectBuildGradle(config);
  config = withAndroidSdkMavenRepo(config);
  return config;
};
