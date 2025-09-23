import { createWriteStream, existsSync, mkdirSync, chmodSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import fetch from "node-fetch";
import { extract } from "tar";

export class HermesXError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "HermesXError";
  }
}

export class HermesBinaryManager {
  private readonly cacheDir: string;
  private readonly hermesVersion = "0.13.0";

  constructor() {
    // Use XDG Base Directory standard: ~/.cache/hermesx/
    this.cacheDir = join(homedir(), ".cache", "hermesx", "binaries");
  }

  private detectArchitecture(): string {
    const platform = process.platform;

    if (platform === "darwin") {
      return "darwin";
    }

    if (platform === "linux") {
      return "linux";
    }

    throw new HermesXError(
      `Unsupported platform: ${platform}. Only macOS (darwin) and Linux are supported.`,
      "UNSUPPORTED_PLATFORM"
    );
  }

  private getBinaryPath(arch: string): string {
    return join(this.cacheDir, `hermes-${arch}`);
  }

  private async downloadOfficialBinary(
    arch: string,
    targetPath: string
  ): Promise<void> {
    const url = `https://github.com/facebook/hermes/releases/download/v${this.hermesVersion}/hermes-cli-${arch}.tar.gz`;

    console.log(`Downloading Hermes binary for ${arch}...`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Ensure cache directory exists
      mkdirSync(dirname(targetPath), { recursive: true });

      // Create temporary file for download
      const tempFile = `${targetPath}.tmp.tar.gz`;
      const fileStream = createWriteStream(tempFile);

      if (!response.body) {
        throw new Error("No response body");
      }

      // Download the file
      await new Promise<void>((resolve, reject) => {
        response.body!.pipe(fileStream);
        response.body!.on("error", reject);
        fileStream.on("finish", () => resolve());
        fileStream.on("error", reject);
      });

      // Extract the hermes binary from the tar.gz
      await extract({
        file: tempFile,
        cwd: dirname(targetPath),
        filter: (path: string) => path.endsWith("/hermes") || path === "hermes",
        strip: 1, // Remove the top-level directory
      });

      // Move the extracted hermes binary to the target path
      const extractedPath = join(dirname(targetPath), "hermes");
      if (existsSync(extractedPath)) {
        const fs = await import("fs/promises");
        await fs.rename(extractedPath, targetPath);
      }

      // Make binary executable
      chmodSync(targetPath, 0o755);

      // Clean up temp file
      const fs = await import("fs/promises");
      await fs.unlink(tempFile);

      console.log(`Hermes binary cached at: ${targetPath}`);
    } catch (error) {
      throw new HermesXError(
        `Failed to download Hermes binary: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "DOWNLOAD_FAILED"
      );
    }
  }

  async ensureHermesBinary(): Promise<string> {
    const arch = this.detectArchitecture();
    const binaryPath = this.getBinaryPath(arch);

    if (!existsSync(binaryPath)) {
      await this.downloadOfficialBinary(arch, binaryPath);
    }

    return binaryPath;
  }
}
