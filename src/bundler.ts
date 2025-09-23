import { resolve, join, dirname, basename } from "node:path";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
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
      console.log(`Bundling ${basename(filePath)} with esbuild...`);

      // Use esbuild for TypeScript compilation and bundling
      const result = await esbuild.build({
        entryPoints: [absolutePath],
        outfile: outputPath,
        bundle: true,
        format: "iife",
        target: "es2020",
        platform: "neutral",
        write: true,
        minify: false,
        sourcemap: false,
        treeShaking: true,
        metafile: false,
      });

      if (result.errors.length > 0) {
        const errorMessages = result.errors
          .map(
            (err: esbuild.Message) =>
              `${err.location?.file}:${err.location?.line}:${err.location?.column}: ${err.text}`
          )
          .join("\n");
        throw new HermesXError(
          `esbuild compilation failed:\n${errorMessages}`,
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
