#!/usr/bin/env node

import { Command } from "commander";
import { HermesBinaryManager, HermesXError } from "./hermes-binary.js";
import { Bundler } from "./bundler.js";
import { HermesRunner } from "./hermes-runner.js";

const program = new Command();

async function runWithHermes(
  file: string,
  scriptArgs: string[]
): Promise<void> {
  const binaryManager = new HermesBinaryManager();
  const bundler = new Bundler();
  const runner = new HermesRunner();

  let bundlePath: string | null = null;

  try {
    // Ensure Hermes binary is available
    const hermesBinaryPath = await binaryManager.ensureHermesBinary();

    // Bundle TypeScript file with Metro
    bundlePath = await bundler.bundleTypeScript(file, scriptArgs);

    // Execute with Hermes
    await runner.executeBundle(hermesBinaryPath, bundlePath, scriptArgs);
  } catch (error) {
    if (error instanceof HermesXError) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    } else {
      console.error(
        `Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      process.exit(1);
    }
  } finally {
    // Cleanup temporary bundle file
    if (bundlePath) {
      await runner.cleanup(bundlePath);
    }
  }
}

program
  .name("hermesx")
  .description("Run TypeScript files with Hermes JS engine")
  .version("0.1.0")
  .argument("<file>", "TypeScript file to execute")
  .allowUnknownOption() // Pass through args to script
  .action(async (file: string, options: any, command: Command) => {
    // Get script arguments (everything after the file argument)
    const allArgs = process.argv.slice(2);
    const fileIndex = allArgs.indexOf(file);
    const scriptArgs = fileIndex >= 0 ? allArgs.slice(fileIndex + 1) : [];

    await runWithHermes(file, scriptArgs);
  });

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
