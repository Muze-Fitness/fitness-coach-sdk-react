const fs = require('fs');
const path = require('path');
const { IOSConfig, withAppDelegate, withInfoPlist, withXcodeProject } = require('expo/config-plugins');

// iOS 27 refuses to launch apps without the UIScene life cycle, and the Expo SDK 57 template
// starts React Native from AppDelegate. This ports the SDK 58 template; delete it after upgrading.

const SCENE_DELEGATE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {}
`;

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    const src = cfg.modResults.contents
      .replace('class AppDelegate: ExpoAppDelegate {', 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {')
      .replace(/#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/, '');
    if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame:')) {
      throw new Error('withSceneLifecycle: unexpected AppDelegate template; upgrade to Expo SDK 58 and remove this plugin');
    }
    cfg.modResults.contents = src;
    return cfg;
  });

const withSceneDelegateFile = (config) =>
  withXcodeProject(config, (cfg) => {
    const { platformProjectRoot, projectName } = cfg.modRequest;
    fs.writeFileSync(path.join(platformProjectRoot, projectName, 'SceneDelegate.swift'), SCENE_DELEGATE);
    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SceneDelegate.swift`,
      groupName: projectName,
      project: cfg.modResults,
    });
    return cfg;
  });

module.exports = (config) => withSceneDelegateFile(withSceneAppDelegate(withSceneManifest(config)));
