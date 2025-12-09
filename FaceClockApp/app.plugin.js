const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix react-native-face-detection compileSdkVersion issue
 * This ensures all subprojects use SDK 35 by modifying the root build.gradle
 */
const withFaceDetectionFix = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const rootBuildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'build.gradle'
      );

      // 1. Fix root build.gradle to set compileSdkVersion for all subprojects
      if (fs.existsSync(rootBuildGradlePath)) {
        let buildGradle = fs.readFileSync(rootBuildGradlePath, 'utf-8');
        
        // Check if we already have the subprojects configuration
        const hasSubprojectsConfig = buildGradle.includes('subprojects {') && 
                                     buildGradle.includes('compileSdkVersion = 35');
        
        if (!hasSubprojectsConfig) {
          // Find the allprojects block
          if (buildGradle.includes('allprojects {')) {
            // Add subprojects block inside allprojects
            const allprojectsRegex = /(allprojects\s*\{[^}]*?)(\n\s*repositories\s*\{)/;
            if (allprojectsRegex.test(buildGradle)) {
              buildGradle = buildGradle.replace(
                allprojectsRegex,
                `$1
    subprojects {
        afterEvaluate { project ->
            if (project.hasProperty('android')) {
                project.android {
                    compileSdkVersion = 35
                }
            }
        }
    }
$2`
              );
            } else {
              // Add at the end of allprojects block
              buildGradle = buildGradle.replace(
                /(allprojects\s*\{[^}]*)(\})/,
                `$1
    subprojects {
        afterEvaluate { project ->
            if (project.hasProperty('android')) {
                project.android {
                    compileSdkVersion = 35
                }
            }
        }
    }
$2`
              );
            }
          } else {
            // Add allprojects block with subprojects configuration
            // Find a good place to insert it (after buildscript block)
            const buildscriptRegex = /(buildscript\s*\{[^}]*\})/;
            if (buildscriptRegex.test(buildGradle)) {
              buildGradle = buildGradle.replace(
                buildscriptRegex,
                `$1

allprojects {
    repositories {
        google()
        mavenCentral()
    }
    subprojects {
        afterEvaluate { project ->
            if (project.hasProperty('android')) {
                project.android {
                    compileSdkVersion = 35
                }
            }
        }
    }
}`
              );
            } else {
              // Append at the end if we can't find buildscript
              buildGradle += `

allprojects {
    subprojects {
        afterEvaluate { project ->
            if (project.hasProperty('android')) {
                project.android {
                    compileSdkVersion = 35
                }
            }
        }
    }
}`;
            }
          }
          
          fs.writeFileSync(rootBuildGradlePath, buildGradle, 'utf-8');
        }
      }

      // 2. Also directly patch react-native-face-detection module's build.gradle as fallback
      const faceDetectionModulePath = path.join(
        config.modRequest.platformProjectRoot,
        'node_modules',
        'react-native-face-detection',
        'android',
        'build.gradle'
      );

      if (fs.existsSync(faceDetectionModulePath)) {
        let moduleBuildGradle = fs.readFileSync(faceDetectionModulePath, 'utf-8');
        
        // Check if compileSdkVersion is already set to 35
        if (!moduleBuildGradle.includes('compileSdkVersion 35') && 
            !moduleBuildGradle.includes('compileSdkVersion = 35')) {
          // Add or update compileSdkVersion in android block
          if (moduleBuildGradle.includes('android {')) {
            // Try to find and replace existing compileSdkVersion
            if (moduleBuildGradle.match(/compileSdkVersion\s+\d+/)) {
              moduleBuildGradle = moduleBuildGradle.replace(
                /compileSdkVersion\s+\d+/,
                'compileSdkVersion 35'
              );
            } else {
              // Add compileSdkVersion after android {
              moduleBuildGradle = moduleBuildGradle.replace(
                /(android\s*\{)/,
                `$1
    compileSdkVersion 35`
              );
            }
            fs.writeFileSync(faceDetectionModulePath, moduleBuildGradle, 'utf-8');
          }
        }
      }
      
      return config;
    },
  ]);
};

module.exports = withFaceDetectionFix;

