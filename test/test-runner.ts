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
    console.log("🚀 Running hermesx Test Suite\n");

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

    // Test 6: ES6 Classes transpilation
    await this.runTest("ES6 Classes transpilation", async () => {
      const testFile = this.createTestFile(
        "classes.ts",
        `
        class Animal {
          name: string;
          
          constructor(name: string) {
            this.name = name;
          }
          
          speak(): string {
            return \`\${this.name} makes a sound\`;
          }
        }
        
        class Dog extends Animal {
          breed: string;
          
          constructor(name: string, breed: string) {
            super(name);
            this.breed = breed;
          }
          
          speak(): string {
            return \`\${this.name} the \${this.breed} barks\`;
          }
          
          getInfo(): string {
            return \`Name: \${this.name}, Breed: \${this.breed}\`;
          }
        }
        
        const animal = new Animal("Generic Animal");
        const dog = new Dog("Rex", "German Shepherd");
        
        console.log(animal.speak());
        console.log(dog.speak());
        console.log(dog.getInfo());
        
        // Test instanceof
        console.log("Is dog instance of Animal:", dog instanceof Animal);
        console.log("Is dog instance of Dog:", dog instanceof Dog);
      `
      );

      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      // Check all expected outputs
      const expectedOutputs = [
        "Generic Animal makes a sound",
        "Rex the German Shepherd barks",
        "Name: Rex, Breed: German Shepherd",
        "Is dog instance of Animal: true",
        "Is dog instance of Dog: true",
      ];

      for (const expected of expectedOutputs) {
        if (!result.stdout.includes(expected)) {
          throw new Error(
            `Expected "${expected}" in output, got: ${result.stdout}`
          );
        }
      }

      this.cleanupTestFile(testFile);
    });

    // Test 7: Error handling (file not found)
    await this.runTest("Error handling", async () => {
      const result = await this.runHermesX("nonexistent.ts");

      if (result.code === 0) {
        throw new Error("Expected process to fail for nonexistent file");
      }

      if (!result.stderr.includes("TypeScript file not found")) {
        throw new Error("Expected error message not found");
      }
    });

    // Test 8: CLI help
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

    // Test 9: CLI version
    await this.runTest("CLI version option", async () => {
      const result = await this.runHermesX("--version");

      if (result.code !== 0) {
        throw new Error(`Version command failed with code ${result.code}`);
      }

      if (!result.stdout.includes("0.1.0")) {
        throw new Error("Version not found");
      }
    });

    // Test 10: External module imports
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

    // Test 11: setInterval polyfill
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

    // Test 12: enhanced console formatting
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

    // Test 13: performance measurement APIs
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

    // Test 14: Superstruct data validation
    await this.runTest("Testing Superstruct data validation", async () => {
      const testContent = `
import { object, string, number, boolean, array, assert, is, validate } from 'superstruct';

// Define schemas
const UserSchema = object({
  id: number(),
  name: string(),
  email: string(),
  active: boolean(),
  tags: array(string())
});

const PersonSchema = object({
  firstName: string(),
  lastName: string(),
  age: number()
});

// Test valid data
const validUser = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  active: true,
  tags: ["admin", "user"]
};

try {
  assert(validUser, UserSchema);
  console.log("✅ Valid user assertion passed");
} catch (error) {
  console.log("❌ Valid user assertion failed:", error.message);
}

// Test is() function
const isValidUser = is(validUser, UserSchema);
console.log("✅ is() validation:", isValidUser ? "passed" : "failed");

// Test validate() function
const [validationError, validatedUser] = validate(validUser, UserSchema);
if (!validationError) {
  console.log("✅ validate() function passed");
} else {
  console.log("❌ validate() function failed:", validationError.message);
}

// Test invalid data
const invalidUser = {
  id: "not-a-number",
  name: "Jane Doe",
  email: "jane@example.com",
  active: true,
  tags: ["user"]
};

const isInvalidUser = is(invalidUser, UserSchema);
console.log("✅ Invalid user detection:", !isInvalidUser ? "passed" : "failed");

// Test nested validation
const validPerson = { firstName: "Alice", lastName: "Smith", age: 30 };
const isValidPerson = is(validPerson, PersonSchema);
console.log("✅ Nested schema validation:", isValidPerson ? "passed" : "failed");

console.log("superstruct test passed");
`;

      const testFile = this.createTestFile("test-superstruct.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("superstruct test passed")) {
        throw new Error(
          "Expected 'superstruct test passed' in output, got: " + result.stdout
        );
      }

      // Verify specific validation results
      const expectedOutputs = [
        "✅ Valid user assertion passed",
        "✅ is() validation: passed",
        "✅ validate() function passed",
        "✅ Invalid user detection: passed",
        "✅ Nested schema validation: passed",
      ];

      for (const expected of expectedOutputs) {
        if (!result.stdout.includes(expected)) {
          throw new Error(
            `Expected "${expected}" in output, got: ${result.stdout}`
          );
        }
      }

      this.cleanupTestFile(testFile);
    });

    // Test 15: Date-fns date manipulation
    await this.runTest("Testing date-fns date manipulation", async () => {
      const testContent = `
import { format, addDays, subDays, differenceInDays, isAfter, isBefore, parseISO } from 'date-fns';

// Test date formatting
const now = new Date(2024, 0, 15); // January 15, 2024
const formattedDate = format(now, 'yyyy-MM-dd');
console.log("✅ Date formatting:", formattedDate === "2024-01-15" ? "passed" : "failed");

// Test date arithmetic
const futureDate = addDays(now, 7);
const pastDate = subDays(now, 3);

const futureDiff = differenceInDays(futureDate, now);
const pastDiff = differenceInDays(now, pastDate);

console.log("✅ Add days:", futureDiff === 7 ? "passed" : "failed");
console.log("✅ Subtract days:", pastDiff === 3 ? "passed" : "failed");

// Test date comparisons
const isAfterTest = isAfter(futureDate, now);
const isBeforeTest = isBefore(pastDate, now);

console.log("✅ isAfter comparison:", isAfterTest ? "passed" : "failed");
console.log("✅ isBefore comparison:", isBeforeTest ? "passed" : "failed");

// Test ISO parsing
const isoString = "2024-03-15T10:30:00Z";
const parsedDate = parseISO(isoString);
const parsedFormatted = format(parsedDate, 'yyyy-MM-dd HH:mm:ss');

console.log("✅ ISO parsing:", parsedFormatted.includes("2024-03-15") ? "passed" : "failed");

// Test complex formatting
const complexFormat = format(now, 'EEEE, MMMM do, yyyy');
console.log("✅ Complex formatting:", complexFormat.includes("January") ? "passed" : "failed");

console.log("date-fns test passed");
`;

      const testFile = this.createTestFile("test-date-fns.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("date-fns test passed")) {
        throw new Error(
          "Expected 'date-fns test passed' in output, got: " + result.stdout
        );
      }

      // Verify specific date operations
      const expectedOutputs = [
        "✅ Date formatting: passed",
        "✅ Add days: passed",
        "✅ Subtract days: passed",
        "✅ isAfter comparison: passed",
        "✅ isBefore comparison: passed",
        "✅ ISO parsing: passed",
        "✅ Complex formatting: passed",
      ];

      for (const expected of expectedOutputs) {
        if (!result.stdout.includes(expected)) {
          throw new Error(
            `Expected "${expected}" in output, got: ${result.stdout}`
          );
        }
      }

      this.cleanupTestFile(testFile);
    });

    // Test 16: Zod schema validation
    await this.runTest("Testing Zod schema validation", async () => {
      const testContent = `
import { z } from 'zod';

// Define schemas
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120),
  tags: z.array(z.string()),
  isActive: z.boolean().optional()
});

const ProductSchema = z.object({
  name: z.string(),
  price: z.number().positive(),
  category: z.enum(['electronics', 'clothing', 'books'])
});

// Test valid data parsing
const validUser = {
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  tags: ["admin", "user"],
  isActive: true
};

try {
  const parsedUser = UserSchema.parse(validUser);
  console.log("✅ Valid user parsing: passed");
} catch (error) {
  console.log("❌ Valid user parsing failed:", error.message);
}

// Test safeParse
const safeResult = UserSchema.safeParse(validUser);
console.log("✅ SafeParse success:", safeResult.success ? "passed" : "failed");

// Test invalid data
const invalidUser = {
  id: "not-a-number",
  name: "",
  email: "invalid-email",
  age: -5,
  tags: ["user"]
};

const invalidResult = UserSchema.safeParse(invalidUser);
console.log("✅ Invalid data detection:", !invalidResult.success ? "passed" : "failed");

// Test enum validation
const validProduct = {
  name: "Laptop",
  price: 999.99,
  category: "electronics"
};

try {
  ProductSchema.parse(validProduct);
  console.log("✅ Enum validation: passed");
} catch (error) {
  console.log("❌ Enum validation failed:", error.message);
}

// Test schema transformation
const NumberStringSchema = z.string().transform((val) => parseInt(val, 10));
const transformed = NumberStringSchema.parse("123");
console.log("✅ Schema transformation:", transformed === 123 ? "passed" : "failed");

// Test optional fields
const UserWithOptional = z.object({
  name: z.string(),
  nickname: z.string().optional()
});

const userWithoutOptional = { name: "Alice" };
const userWithOptional = { name: "Bob", nickname: "Bobby" };

const result1 = UserWithOptional.safeParse(userWithoutOptional);
const result2 = UserWithOptional.safeParse(userWithOptional);

console.log("✅ Optional fields:", (result1.success && result2.success) ? "passed" : "failed");

console.log("zod test passed");
`;

      const testFile = this.createTestFile("test-zod.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("zod test passed")) {
        throw new Error(
          "Expected 'zod test passed' in output, got: " + result.stdout
        );
      }

      // Verify specific validation results
      const expectedOutputs = [
        "✅ Valid user parsing: passed",
        "✅ SafeParse success: passed",
        "✅ Invalid data detection: passed",
        "✅ Enum validation: passed",
        "✅ Schema transformation: passed",
        "✅ Optional fields: passed",
      ];

      for (const expected of expectedOutputs) {
        if (!result.stdout.includes(expected)) {
          throw new Error(
            `Expected "${expected}" in output, got: ${result.stdout}`
          );
        }
      }

      this.cleanupTestFile(testFile);
    });

    // Test 17: Ramda functional programming
    await this.runTest("Testing Ramda functional programming", async () => {
      const testContent = `
import * as R from 'ramda';

// Test basic array operations
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Test map and filter
const doubled = R.map(R.multiply(2), numbers);
const evens = R.filter(R.modulo(R.__, 2), numbers);

console.log("✅ Ramda map:", R.equals(doubled, [2, 4, 6, 8, 10, 12, 14, 16, 18, 20]) ? "passed" : "failed");
console.log("✅ Ramda filter:", evens.length === 5 ? "passed" : "failed");

// Test composition
const addOne = R.add(1);
const multiplyByTwo = R.multiply(2);
const addOneThenDouble = R.compose(multiplyByTwo, addOne);

const result = addOneThenDouble(5); // (5 + 1) * 2 = 12
console.log("✅ Function composition:", result === 12 ? "passed" : "failed");

// Test pipe (reverse composition)
const processNumber = R.pipe(
  R.add(1),
  R.multiply(2),
  R.subtract(R.__, 4)
);

const pipeResult = processNumber(3); // ((3 + 1) * 2) - 4 = 4
console.log("✅ Pipe operation:", pipeResult === 4 ? "passed" : "failed");

// Test curry
const add = R.curry((a, b, c) => a + b + c);
const addFive = add(5);
const addFiveAndTwo = addFive(2);
const finalResult = addFiveAndTwo(3); // 5 + 2 + 3 = 10

console.log("✅ Currying:", finalResult === 10 ? "passed" : "failed");

// Test object operations
const person = { name: "John", age: 30, city: "New York" };
const getName = R.prop('name');
const getAge = R.prop('age');

console.log("✅ Object property access:", getName(person) === "John" ? "passed" : "failed");

// Test lens operations
const ageLens = R.lensProp('age');
const updatedPerson = R.set(ageLens, 31, person);

console.log("✅ Lens operations:", R.view(ageLens, updatedPerson) === 31 ? "passed" : "failed");

// Test array utilities
const users = [
  { name: "Alice", score: 85 },
  { name: "Bob", score: 92 },
  { name: "Charlie", score: 78 }
];

const sortedByScore = R.sortBy(R.prop('score'), users);
const highestScore = R.last(sortedByScore);

console.log("✅ Array sorting:", highestScore.name === "Bob" ? "passed" : "failed");

// Test groupBy
const groupedByFirstLetter = R.groupBy(R.pipe(R.prop('name'), R.head), users);
const hasAliceGroup = R.has('A', groupedByFirstLetter);

console.log("✅ GroupBy operation:", hasAliceGroup ? "passed" : "failed");

console.log("ramda test passed");
`;

      const testFile = this.createTestFile("test-ramda.ts", testContent);
      const result = await this.runHermesX(testFile);

      if (result.code !== 0) {
        throw new Error(
          `Process failed with code ${result.code}: ${result.stderr}`
        );
      }

      if (!result.stdout.includes("ramda test passed")) {
        throw new Error(
          "Expected 'ramda test passed' in output, got: " + result.stdout
        );
      }

      // Verify specific functional programming operations
      const expectedOutputs = [
        "✅ Ramda map: passed",
        "✅ Ramda filter: passed",
        "✅ Function composition: passed",
        "✅ Pipe operation: passed",
        "✅ Currying: passed",
        "✅ Object property access: passed",
        "✅ Lens operations: passed",
        "✅ Array sorting: passed",
        "✅ GroupBy operation: passed",
      ];

      for (const expected of expectedOutputs) {
        if (!result.stdout.includes(expected)) {
          throw new Error(
            `Expected "${expected}" in output, got: ${result.stdout}`
          );
        }
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
