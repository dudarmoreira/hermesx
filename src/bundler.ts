import { resolve, join, dirname, basename } from "node:path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { rspack } from "@rspack/core";
import type { RspackOptions } from "@rspack/core";
import { HermesXError } from "./hermes-binary.js";

export class Bundler {
  async bundleTypeScript(
    filePath: string,
    scriptArgs: string[] = []
  ): Promise<string> {
    const require = createRequire(import.meta.url);
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
      console.log(`Bundling ${basename(filePath)} with rspack...`);

      // Use rspack for TypeScript compilation and bundling
      const hermesSrcDir = dirname(fileURLToPath(import.meta.url));
      console.log("hermesSrcDir", hermesSrcDir);

      const npxDir = hermesSrcDir.split("/node_modules/")[0];
      const nodeModulesDir = npxDir + "/node_modules";
      const hermesPackageRoot = join(hermesSrcDir, "..");

      const rspackConfig: RspackOptions = {
        context: hermesPackageRoot,
        entry: {
          main: absolutePath,
        },
        output: {
          path: dirname(outputPath),
          filename: basename(outputPath),

          chunkFormat: "commonjs",
        },
        mode: "development",
        target: ["es5"],
        resolve: {
          extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
          modules: [
            npxDir,
            nodeModulesDir,
            join(hermesPackageRoot, "node_modules"),
            "node_modules",
          ],
        },
        resolveLoader: {
          modules: [
            npxDir,
            nodeModulesDir,
            join(hermesPackageRoot, "node_modules"),
            "node_modules",
          ],
        },
        module: {
          rules: [
            {
              test: /\.(ts|tsx|js|jsx|mjs|cjs)$/,
              // Don't exclude node_modules - we need to transform external libraries too
              use: [
                {
                  loader: "babel-loader",
                  options: {
                    configFile: join(hermesPackageRoot, "babel.config.cjs"),
                    babelrc: false,
                    root: hermesPackageRoot,
                    cwd: hermesPackageRoot,
                    // Force transformation of all files including node_modules
                    ignore: [],
                  },
                },
              ],
              type: "javascript/auto",
            },
          ],
        },
        optimization: {
          minimize: false,
          splitChunks: false,
        },
        devtool: false,
      };

      console.log("outputPath", outputPath);

      // Create a promise-based wrapper for rspack compilation
      const result = await new Promise<{ hasErrors: boolean; errors?: any[] }>(
        (resolve, reject) => {
          const compiler = rspack(rspackConfig);

          compiler.run((err, stats) => {
            compiler.close((closeErr) => {
              if (closeErr) {
                reject(
                  new HermesXError(
                    `Rspack close error: ${closeErr.message}`,
                    "COMPILATION_FAILED"
                  )
                );
                return;
              }

              if (err) {
                reject(
                  new HermesXError(
                    `Rspack compilation error: ${err.message}`,
                    "COMPILATION_FAILED"
                  )
                );
                return;
              }

              if (!stats) {
                reject(
                  new HermesXError(
                    "No stats returned from rspack compilation",
                    "COMPILATION_FAILED"
                  )
                );
                return;
              }

              const hasErrors = stats.hasErrors();
              if (hasErrors) {
                const info = stats.toJson();
                resolve({ hasErrors: true, errors: info.errors });
              } else {
                resolve({ hasErrors: false });
              }
            });
          });
        }
      );

      if (result.hasErrors && result.errors) {
        const errorMessages = result.errors
          .map((err: any) => `${err.message || err}`)
          .join("\n");
        throw new HermesXError(
          `Rspack compilation failed:\n${errorMessages}`,
          "COMPILATION_FAILED"
        );
      }

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
