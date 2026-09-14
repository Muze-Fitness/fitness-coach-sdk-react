const path = require('path');
const {
  withAndroidManifest,
  withAppBuildGradle,
  withMainActivity,
  withMainApplication,
  withProjectBuildGradle,
  withXcodeProject,
} = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const HILT_VERSION = '2.56.2';
const KSP_VERSION = '2.1.20-1.0.32';

function insertLines(src, tag, anchor, lines, offset = 1) {
  return mergeContents({ src, newSrc: lines.join('\n'), tag: `zing-sdk-${tag}`, anchor, offset, comment: '//' })
    .contents;
}

const withEmbedFrameworksPhase = (config) =>
  withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const name = '[ZingSdk] Embed frameworks';
    if (!project.pbxItemByComment(name, 'PBXShellScriptBuildPhase')) {
      const { buildPhase } = project.addBuildPhase([], 'PBXShellScriptBuildPhase', name, project.getFirstTarget().uuid, {
        shellPath: '/bin/sh',
        shellScript: `sh "$SRCROOT/${path.relative(cfg.modRequest.platformProjectRoot, path.join(__dirname, 'ios/embed-frameworks.sh'))}"`,
      });
      buildPhase.alwaysOutOfDate = 1;
    }
    return cfg;
  });

const withProjectGradle = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = insertLines(src, 'classpath', 'dependencies {', [
      `    classpath("com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:${KSP_VERSION}")`,
      `    classpath("com.google.dagger:hilt-android-gradle-plugin:${HILT_VERSION}")`,
    ]);
    src = insertLines(src, 'maven', 'allprojects {', [
      '  repositories {',
      '    maven {',
      '      url = uri("https://maven.pkg.github.com/Muze-Fitness/fitness-coach-sdk-android")',
      '      credentials {',
      '        def properties = new Properties()',
      '        properties.load(rootProject.file("local.properties").newInputStream())',
      '        username = properties.getProperty("sdk_maven_read_username")',
      '        password = properties.getProperty("sdk_maven_read_token")',
      '      }',
      '    }',
      '  }',
    ]);
    cfg.modResults.contents = src;
    return cfg;
  });

const withAppGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = insertLines(src, 'plugins', 'apply plugin: "com.android.application"', [
      'apply plugin: "com.google.devtools.ksp"',
      'apply plugin: "dagger.hilt.android.plugin"',
    ]);
    src = insertLines(src, 'dependencies', '^dependencies {', [
      `    implementation "com.google.dagger:hilt-android:${HILT_VERSION}"`,
      `    ksp "com.google.dagger:hilt-android-compiler:${HILT_VERSION}"`,
    ]);
    cfg.modResults.contents = src;
    return cfg;
  });

const withSdkApplication = (config) =>
  withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = insertLines(src, 'imports', '^package ', [
      'import coach.zing.fitness.coach.SdkApplication',
      'import dagger.hilt.android.HiltAndroidApp',
    ]);
    src = insertLines(src, 'annotation', '^class MainApplication', ['@HiltAndroidApp'], 0);
    cfg.modResults.contents = src.replace('class MainApplication : Application()', 'class MainApplication : SdkApplication()');
    return cfg;
  });

const withHiltActivity = (config) =>
  withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = insertLines(src, 'imports', '^package ', ['import dagger.hilt.android.AndroidEntryPoint']);
    cfg.modResults.contents = insertLines(src, 'annotation', '^class MainActivity', ['@AndroidEntryPoint'], 0);
    return cfg;
  });

const withoutWorkManagerInitializer = (config) =>
  withAndroidManifest(config, (cfg) => {
    const { manifest } = cfg.modResults;
    const application = manifest.application[0];
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    application.provider = (application.provider ?? []).filter(
      (provider) => provider.$['android:name'] !== 'androidx.startup.InitializationProvider'
    );
    application.provider.push({
      $: {
        'android:name': 'androidx.startup.InitializationProvider',
        'android:authorities': '${applicationId}.androidx-startup',
        'android:exported': 'false',
        'tools:node': 'merge',
      },
      'meta-data': [{ $: { 'android:name': 'androidx.work.WorkManagerInitializer', 'tools:node': 'remove' } }],
    });
    return cfg;
  });

module.exports = (config) =>
  [
    withEmbedFrameworksPhase,
    withProjectGradle,
    withAppGradle,
    withSdkApplication,
    withHiltActivity,
    withoutWorkManagerInitializer,
  ].reduce((result, plugin) => plugin(result), config);
