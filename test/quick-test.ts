// Quick manual test for HermesX
import _ from "lodash";

interface TestResult {
  name: string;
  passed: boolean;
}

const results: TestResult[] = [];

// Test 1: Basic console output
console.log("🧪 Running quick HermesX test...");

// Test 2: TypeScript types
const message: string = "TypeScript works!";
console.log(`✅ ${message}`);

// Test 3: Modern JS features
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map((n) => n * 2);
console.log(`✅ Array operations: [${doubled.join(", ")}]`);

// Test 4: Template literals
const toolName = "HermesX";
console.log(`✅ Template literals: Hello from ${toolName}!`);

// Test 5: Destructuring
const { length: arrayLength } = numbers;
console.log(`✅ Destructuring: Array has ${arrayLength} elements`);

// Test 6: External modules (lodash)
const shuffled = _.shuffle([...numbers]);
const sum = _.sum(numbers);
console.log(
  `✅ External modules: Sum=${sum}, Shuffled length=${shuffled.length}`
);

// Test 7: Command line args
if (process.argv.length > 2) {
  console.log(`✅ CLI args: ${process.argv.slice(2).join(" ")}`);
} else {
  console.log("✅ No CLI args provided");
}

// Test 9: Async/await
async function asyncTest(): Promise<void> {
  const result = await new Promise<string>((resolve) => {
    setTimeout(() => resolve("Async completed!"), 50);
  });
  console.log(`✅ ${result}`);
}

asyncTest().then(() => {
  // Test setInterval polyfill
  console.log("✅ Testing setInterval...");
  let intervalCount = 0;
  const intervalId = setInterval(() => {
    intervalCount++;
    if (intervalCount >= 2) {
      clearInterval(intervalId);
      console.log("✅ setInterval works!");
      console.log("🎉 All quick tests completed successfully!");
    }
  }, 100);
});
