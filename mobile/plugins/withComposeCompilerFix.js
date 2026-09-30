/**
 * Config plugin — supprime l'erreur de compatibilité Compose Compiler / Kotlin.
 * expo-modules-core SDK 52 utilise Compose Compiler 1.5.14 (requiert Kotlin 1.9.24)
 * mais EAS Build tourne sur Kotlin 1.9.25. Ce plugin passe le flag de suppression.
 */
const { withAppBuildGradle } = require("@expo/config-plugins");

const COMPOSE_FIX = `
// >>> ImmoBF: suppress Compose Compiler / Kotlin version mismatch (SDK 52 + EAS)
android.kotlinOptions {
    freeCompilerArgs += [
        "-P",
        "plugin:androidx.compose.compiler.plugins.kotlin:suppressKotlinVersionCompatibilityCheck=1.9.25"
    ]
}
`;

module.exports = function withComposeCompilerFix(config) {
  return withAppBuildGradle(config, (config) => {
    if (
      !config.modResults.contents.includes(
        "suppressKotlinVersionCompatibilityCheck"
      )
    ) {
      config.modResults.contents += COMPOSE_FIX;
    }
    return config;
  });
};
