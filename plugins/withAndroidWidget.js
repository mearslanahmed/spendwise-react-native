const {
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withStringsXml,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// 1. Register the Widget Receiver and App Shortcuts
const withWidgetManifest = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    
    // Inject Shortcuts into MainActivity
    const mainActivity = mainApplication.activity.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    if (mainActivity) {
      if (!mainActivity['meta-data']) mainActivity['meta-data'] = [];
      const hasShortcuts = mainActivity['meta-data'].some(
        (m) => m.$['android:name'] === 'android.app.shortcuts'
      );
      if (!hasShortcuts) {
        mainActivity['meta-data'].push({
          $: {
            'android:name': 'android.app.shortcuts',
            'android:resource': '@xml/shortcuts',
          },
        });
      }
    }
    const widgetReceiver = {
      $: {
        'android:name': '.SpendWiseWidgetReceiver',
        'android:exported': 'true',
      },
      'intent-filter': [
        { action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }] },
      ],
      'meta-data': [
        {
          $: {
            'android:name': 'android.appwidget.provider',
            'android:resource': '@xml/spendwise_widget_info',
          },
        },
      ],
    };

    if (!mainApplication.receiver) mainApplication.receiver = [];
    mainApplication.receiver.push(widgetReceiver);
    return config;
  });
};

// 2. Inject Jetpack Glance
const withWidgetGradle = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes('org.jetbrains.kotlin.plugin.compose')) {
      config.modResults.contents = config.modResults.contents.replace(
        /apply plugin: "com\.android\.application"/,
        `apply plugin: "com.android.application"\napply plugin: "org.jetbrains.kotlin.plugin.compose"`
      );
    }
    
    config.modResults.contents += `
dependencies {
    implementation "androidx.glance:glance-appwidget:1.1.0"
}
android {
    buildFeatures { compose true }
}
`;
    return config;
  });
};

// 3. Automate copying the files from targets/ to android/
const withWidgetSourceCode = (config) => {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidSrc = path.join(projectRoot, 'android/app/src/main');
      const targetSrc = path.join(projectRoot, 'targets/widget/android');

      // Copy XML Info and Shortcuts
      const xmlDir = path.join(androidSrc, 'res/xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.copyFileSync(path.join(targetSrc, 'spendwise_widget_info.xml'), path.join(xmlDir, 'spendwise_widget_info.xml'));
      fs.copyFileSync(path.join(targetSrc, 'shortcuts.xml'), path.join(xmlDir, 'shortcuts.xml'));

      // Copy Drawable Icons
      const drawableDir = path.join(androidSrc, 'res/drawable');
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.copyFileSync(path.join(targetSrc, 'ic_add.xml'), path.join(drawableDir, 'ic_add.xml'));
      fs.copyFileSync(path.join(targetSrc, 'ic_shortcut_add.xml'), path.join(drawableDir, 'ic_shortcut_add.xml'));

      // Copy Kotlin
      const packageFolder = config.android.package.replace(/\./g, '/');
      const ktDir = path.join(androidSrc, 'java', packageFolder);
      fs.mkdirSync(ktDir, { recursive: true });
      
      fs.copyFileSync(path.join(targetSrc, 'SpendWiseWidget.kt'), path.join(ktDir, 'SpendWiseWidget.kt'));
      fs.copyFileSync(path.join(targetSrc, 'SpendWiseWidgetReceiver.kt'), path.join(ktDir, 'SpendWiseWidgetReceiver.kt'));

      return config;
    },
  ]);
};

// 4. Inject Strings for Shortcuts
const withWidgetStrings = (config) => {
  return withStringsXml(config, (config) => {
    config.modResults = config.modResults || { resources: { string: [] } };
    const strings = config.modResults.resources.string || [];
    
    const addString = (name, value) => {
      if (!strings.some(s => s.$.name === name)) {
        strings.push({ $: { name }, _: value });
      }
    };

    addString('shortcut_add_transaction_short', 'Add Transaction');
    addString('shortcut_add_transaction_long', 'New Transaction');

    return config;
  });
};

module.exports = (config) => {
  config = withWidgetManifest(config);
  config = withWidgetGradle(config);
  config = withWidgetSourceCode(config);
  config = withWidgetStrings(config);
  return config;
};
