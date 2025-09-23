import { resolve, join, dirname, basename } from "node:path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "node:url";
import { HermesXError } from "./hermes-binary.js";

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
      console.log(`Bundling ${basename(filePath)} with Bun...`);

      // Use Bun's built-in bundler for proper module resolution
      return new Promise((resolve, reject) => {
        const bunProcess = spawn(
          "bun",
          [
            "build",
            absolutePath,
            "--outfile",
            outputPath,
            "--target",
            "node",
            "--format",
            "iife",
            "--no-splitting",
          ],
          {
            stdio: "pipe",
          }
        );

        let stderr = "";
        bunProcess.stderr?.on("data", (data) => {
          stderr += data.toString();
        });

        bunProcess.on("close", async (code) => {
          if (code === 0) {
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
              resolve(outputPath);
            } catch (error) {
              reject(
                new HermesXError(
                  `Failed to combine globals: ${
                    error instanceof Error ? error.message : "Unknown error"
                  }`,
                  "GLOBALS_COMBINE_FAILED"
                )
              );
            }
          } else {
            reject(
              new HermesXError(
                `Bun bundling failed: ${stderr}`,
                "COMPILATION_FAILED"
              )
            );
          }
        });

        bunProcess.on("error", (error) => {
          reject(
            new HermesXError(
              `Failed to start Bun bundler: ${error.message}`,
              "BUNDLER_START_FAILED"
            )
          );
        });
      });
    } catch (error) {
      throw new HermesXError(
        `Bundling failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "COMPILATION_FAILED"
      );
    }
  }
}
