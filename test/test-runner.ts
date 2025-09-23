#!/usr/bin/env bun

import { spawn, type ChildProcess } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const HERMESX_BIN = "./bin/hermesx.js";
const TEST_DIR = "./test";

interface TestResult {
  code: number;
  stdout: string;
  stderr: string;
}

class TestRunner {
  private passed = 0;
  private failed = 0;

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    process.stdout.write(`Testing ${name}... `);
    try {
      await testFn();
      console.log("✅ PASS");
      this.passed++;
    } catch (error) {
      console.log("❌ FAIL");
      console.log(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      this.failed++;
    }
  }

  async runHermesX(file: string, args: string[] = []): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const process = spawn(HERMESX_BIN, [file, ...args], {
        stdio: "pipe",
      });

      let stdout = "";
      let stderr = "";

      process.stdout?.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr?.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        resolve({ code: code ?? 1, stdout, stderr });
      });

      process.on("error", (error) => {
        reject(error);
      });
    });
  }

  createTestFile(filename: string, content: string): string {
    const filepath = join(TEST_DIR, filename);
    writeFileSync(filepath, content);
    return filepath;
  }

  cleanupTestFile(filepath: string): void {
    try {
      unlinkSync(filepath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async runAllTests(): Promise<void> {
    console.log("🚀 Running HermesX Test Suite\n");

    // Test 1: Basic TypeScript execution
    await this.runTest("Basic TypeScript execution", async () => {
      const testFile = this.createTestFile(
        "basic.ts",
        `
        const message: string = 'Hello from TypeScript!';
        console.log(message);
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Hello from TypeScript!")) {
        throw new Error("Expected output not found");
      }

      this.cleanupTestFile(testFile);
    });

    // Test 2: Command line arguments
    await this.runTest("Command line arguments", async () => {
      const testFile = this.createTestFile(
        "args.ts",
        `
        console.log('Args:', process.argv.slice(2).join(' '));
      `
      );

      const result = await this.runHermesX(testFile, ["hello", "world"]);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Args: hello world")) {
        throw new Error("Command line arguments not passed correctly");
      }

      this.cleanupTestFile(testFile);
    });

    // Test 3: Modern JavaScript features
    await this.runTest("Modern JavaScript features", async () => {
      const testFile = this.createTestFile(
        "modern.ts",
        `
        const numbers = [1, 2, 3, 4, 5];
        const doubled = numbers.map(n => n * 2);
        const evens = numbers.filter(n => n % 2 === 0);
        console.log('Doubled:', doubled.join(','));
        console.log('Evens:', evens.join(','));
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Doubled: 2,4,6,8,10")) {
        throw new Error("Array map not working");
      }

      if (!result.stdout.includes("Evens: 2,4")) {
        throw new Error("Array filter not working");
      }

      this.cleanupTestFile(testFile);
    });

    // Test 4: Async/await support
    await this.runTest("Async/await support", async () => {
      const testFile = this.createTestFile(
        "async.ts",
        `
        async function test(): Promise<string> {
          return new Promise(resolve => {
            setTimeout(() => resolve('Async works!'), 50);
          });
        }
        
        test().then(result => console.log(result));
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Async works!")) {
        throw new Error("Async/await not working");
      }

      this.cleanupTestFile(testFile);
    });

    // Test 5: TypeScript interfaces
    await this.runTest("TypeScript interfaces", async () => {
      const testFile = this.createTestFile(
        "interface.ts",
        `
        interface Person {
          name: string;
          age: number;
        }
        
        const person: Person = { name: 'John', age: 25 };
        console.log(\`Person: \${person.name}, \${person.age}\`);
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Person: John, 25")) {
        throw new Error("TypeScript interfaces not working");
      }

      this.cleanupTestFile(testFile);
    });

    // Test 6: Error handling (file not found)
    await this.runTest("Error handling", async () => {
      const result = await this.runHermesX("nonexistent.ts");

      if (result.code === 0) {
        throw new Error("Expected process to fail for nonexistent file");
      }

      if (!result.stderr.includes("TypeScript file not found")) {
        throw new Error("Expected error message not found");
      }
    });

    // Test 7: CLI help
    await this.runTest("CLI help option", async () => {
      const result = await this.runHermesX("--help");

      if (result.code !== 0) {
        throw new Error(`Help command failed with code ${result.code}`);
      }

      if (
        !result.stdout.includes("Run TypeScript files with Hermes JS engine")
      ) {
        throw new Error("Help text not found");
      }
    });

    // Test 8: CLI version
    await this.runTest("CLI version option", async () => {
      const result = await this.runHermesX("--version");

      if (result.code !== 0) {
        throw new Error(`Version command failed with code ${result.code}`);
      }

      if (!result.stdout.includes("0.1.0")) {
        throw new Error("Version not found");
      }
    });

    // Test 9: External module imports
    await this.runTest("External module imports", async () => {
      const testFile = this.createTestFile(
        "modules.ts",
        `
        import _ from 'lodash';
        
        const numbers = [1, 2, 3, 4, 5];
        const doubled = _.map(numbers, n => n * 2);
        const evens = _.filter(numbers, n => n % 2 === 0);
        
        console.log('Lodash map:', doubled.join(','));
        console.log('Lodash filter:', evens.join(','));
        
        // Test chunk function
        const chunks = _.chunk(numbers, 2);
        console.log('Chunks:', chunks.length);
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("Lodash map: 2,4,6,8,10")) {
        throw new Error("Lodash map function not working");
      }

      if (!result.stdout.includes("Lodash filter: 2,4")) {
        throw new Error("Lodash filter function not working");
      }

      if (!result.stdout.includes("Chunks: 3")) {
        throw new Error("Lodash chunk function not working");
      }

      this.cleanupTestFile(testFile);
    });

    // Test setInterval polyfill
    await this.runTest("Testing setInterval polyfill", async () => {
      const testContent = `
let count = 0;

const intervalId = setInterval(() => {
  count++;
  console.log("Tick:", count);
  
  if (count >= 3) {
    clearInterval(intervalId);
    console.log("setInterval test passed");
  }
}, 200);
`;

      const testFile = this.createTestFile("test-interval.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("setInterval test passed")) {
        throw new Error(
          "Expected 'setInterval test passed' in output, got: " + result.stdout
        );
      }

      this.cleanupTestFile(testFile);
    });

    // Test enhanced console formatting
    await this.runTest("Testing enhanced console formatting", async () => {
      const testContent = `
// Test console formatting with objects
const obj = { name: "test", value: 123, nested: { key: "value" } };
const arr = [1, 2, { item: "test" }];

console.log("Object:", obj);
console.log("Array:", arr);
console.log("Multiple:", "text", 42, { key: "value" });

console.log("console formatting test passed");
`;

      const testFile = this.createTestFile("test-console.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("console formatting test passed")) {
        throw new Error(
          "Expected 'console formatting test passed' in output, got: " +
            result.stdout
        );
      }

      // Check that objects are properly formatted with JSON.stringify
      if (
        !result.stdout.includes('"name": "test"') ||
        !result.stdout.includes('"value": 123')
      ) {
        throw new Error(
          "Expected JSON-formatted objects in output, got: " + result.stdout
        );
      }

      this.cleanupTestFile(testFile);
    });

    // Test performance measurement APIs
    await this.runTest("Testing performance measurement APIs", async () => {
      const testContent = `
// Test console.time/timeEnd
console.time("test");
for (let i = 0; i < 10000; i++) { Math.sqrt(i); }
console.timeEnd("test");

// Test performance.now()
const start = performance.now();
for (let i = 0; i < 10000; i++) { Math.sqrt(i); }
const end = performance.now();
console.log("performance.now test:", (end - start) >= 0 ? "passed" : "failed");

// Test performance.mark/measure
performance.mark("start");
for (let i = 0; i < 10000; i++) { Math.sqrt(i); }
performance.mark("end");
performance.measure("benchmark", "start", "end");

// Test benchmark utility
benchmark("Math operations", () => { for (let i = 0; i < 1000; i++) Math.sqrt(i); }, 2);

console.log("performance APIs test passed");
`;

      const testFile = this.createTestFile("test-performance.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("performance APIs test passed")) {
        throw new Error(
          "Expected 'performance APIs test passed' in output, got: " +
            result.stdout
        );
      }

      if (!result.stdout.includes("test:") || !result.stdout.includes("ms")) {
        throw new Error(
          "Expected console.time output with timing information, got: " +
            result.stdout
        );
      }

      this.cleanupTestFile(testFile);
    });

    // Summary
    console.log("\n📊 Test Results:");
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`📈 Total: ${this.passed + this.failed}`);

    if (this.failed > 0) {
      console.log("\n❌ Some tests failed!");
      process.exit(1);
    } else {
      console.log("\n🎉 All tests passed!");
      process.exit(0);
    }
  }
}

// Run tests
const runner = new TestRunner();
runner.runAllTests().catch((error) => {
  console.error(
    "Test runner failed:",
    error instanceof Error ? error.message : "Unknown error"
  );
  process.exit(1);
});
