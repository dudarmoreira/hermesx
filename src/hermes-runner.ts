import { spawn } from "child_process";
import { resolve, join, dirname } from "path";
import { HermesXError } from "./hermes-binary.js";

export class HermesRunner {
  async executeBundle(
    hermesBinaryPath: string,
    bundlePath: string,
    scriptArgs: string[] = []
  ): Promise<void> {
    console.log(`Executing with Hermes...`);

    return new Promise((resolve, reject) => {
      const hermesProcess = spawn(hermesBinaryPath, [bundlePath], {
        stdio: "inherit", // Pass through stdin, stdout, stderr
        env: process.env,
      });

      hermesProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new HermesXError(
              `Hermes execution failed with exit code ${code}`,
              "EXECUTION_FAILED"
            )
          );
        }
      });

      hermesProcess.on("error", (error) => {
        reject(
          new HermesXError(
            `Failed to start Hermes process: ${error.message}`,
            "PROCESS_START_FAILED"
          )
        );
      });

      // Handle process termination signals
      process.on("SIGINT", () => {
        hermesProcess.kill("SIGINT");
      });

      process.on("SIGTERM", () => {
        hermesProcess.kill("SIGTERM");
      });
    });
  }

  async cleanup(bundlePath: string): Promise<void> {
    try {
      const fs = await import("fs/promises");
      await fs.unlink(bundlePath);
    } catch (error) {
      // Ignore cleanup errors - they're not critical
      console.warn(`Warning: Could not clean up temporary file: ${bundlePath}`);
    }
  }
}
