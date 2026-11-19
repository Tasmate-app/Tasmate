const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @tasmate-release-signing';
const RELEASE_SIGNING_VARIABLE = 'System.getenv("TASMATE_UPLOAD_STORE_FILE")';

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language !== 'groovy') {
      throw new Error('withAndroidReleaseSigning supports only Groovy build.gradle');
    }

    let contents = config.modResults.contents;
    if (contents.includes(MARKER)) {
      return config;
    }

    const signingConfigsPattern = /(signingConfigs\s*\{)/;
    if (!signingConfigsPattern.test(contents)) {
      throw new Error('Could not find signingConfigs in android/app/build.gradle');
    }

    const releaseSigningConfig = `
        ${MARKER}
        if (${RELEASE_SIGNING_VARIABLE}) {
            release {
                storeFile file(${RELEASE_SIGNING_VARIABLE})
                storePassword System.getenv("TASMATE_UPLOAD_STORE_PASSWORD")
                keyAlias System.getenv("TASMATE_UPLOAD_KEY_ALIAS")
                keyPassword System.getenv("TASMATE_UPLOAD_KEY_PASSWORD")
            }
        }`;

    contents = contents.replace(
      signingConfigsPattern,
      `$1${releaseSigningConfig}`
    );

    const releaseBuildTypePattern =
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/;
    if (!releaseBuildTypePattern.test(contents)) {
      throw new Error('Could not find release signingConfig in android/app/build.gradle');
    }

    contents = contents.replace(
      releaseBuildTypePattern,
      `$1signingConfig ${RELEASE_SIGNING_VARIABLE} ? signingConfigs.release : signingConfigs.debug`
    );

    config.modResults.contents = contents;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
