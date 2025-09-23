import { resolve, join, dirname, basename } from "node:path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import * as Metro from "metro";
import { HermesXError } from "./hermes-binary.js";

const require = createRequire(import.meta.url);

export class Bundler {
  async bundleTypeScript(
    filePath: string,
    scriptArgs: string[] = []
  ): Promise<string> {
    const absolutePath = resolve(filePath);

    if (!existsSync(absolutePath)) {
      throw new HermesXError(
        `TypeScript file not found: ${filePath}`,
        "FILE_NOT_FOUND"
      );
    }

    // Create temporary output file
    const tempDir = tmpdir();
    const randomSuffix = randomBytes(8).toString("hex");
    const outputPath = join(tempDir, `hermesx-bundle-${randomSuffix}.js`);

    try {
      console.log(`Bundling ${basename(filePath)} with Metro...`);

      // Load Metro config with Hermes-optimized settings
      const baseConfig = await Metro.loadConfig();

      // Create Hermes-compatible config
      const metroConfig = {
        ...baseConfig,
        resolver: {
          ...baseConfig.resolver,
          sourceExts: ["js", "jsx", "ts", "tsx", "json"],
          assetExts: [],
        },
        transformer: {
          ...baseConfig.transformer,
          babelTransformerPath: require.resolve(
            "@react-native/metro-babel-transformer"
          ),
          getTransformOptions: async () => ({
            transform: {
              experimentalImportSupport: false,
              inlineRequires: true,
            },
          }),
        },
      };

      // Bundle with Metro
      await Metro.runBuild(metroConfig, {
        entry: absolutePath,
        out: outputPath,
        dev: false,
        minify: false,
        platform: "android", // Use android platform which targets Hermes
      });

      // Prepend globals to the bundled file
      try {
        const fs = await import("fs/promises");
        // Get the path to hermes-globals.js relative to the built lib directory
        const currentFile = fileURLToPath(import.meta.url);
        const currentDir = dirname(currentFile);
        const globalsPath = join(currentDir, "..", "hermes-globals.js");
        const globalsContent = await fs.readFile(globalsPath, "utf8");
        const bundledContent = await fs.readFile(outputPath, "utf8");

        // Inject command line arguments
        const argsInjection = `
// Inject command line arguments
if (globalThis.process && globalThis.process.argv) {
  globalThis.process.argv = ['hermes', '${basename(
    filePath
  )}'].concat(${JSON.stringify(scriptArgs)});
}
`;

        // Combine globals, args injection, and bundled code
        const combinedContent =
          globalsContent + "\n" + argsInjection + "\n" + bundledContent;
        await fs.writeFile(outputPath, combinedContent, "utf8");

        console.log(`Bundled to: ${outputPath}`);
        return outputPath;
      } catch (error) {
        throw new HermesXError(
          `Failed to combine globals: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          "GLOBALS_COMBINE_FAILED"
        );
      }
    } catch (error) {
      if (error instanceof HermesXError) {
        throw error;
      }
      throw new HermesXError(
        `Bundling failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "COMPILATION_FAILED"
      );
    }
  }
}
