# hermesx

Run TypeScript files using the Hermes JavaScript engine with automatic transpilation. Similar to `tsx` but for Hermes.

It's useful especially if you want to profile code performance quickly on your computer without need to building whole React Native project. Problem with using Node is that it's much faster because of V8 (+JIT) engine so it doesn't give you accurate results for how code will perform in React Native app.

## Installation

```bash
# Install globally
bun install -g hermesx
# or
npm install -g hermesx

# Or use with bunx
bunx hermesx script.ts
# or
npx hermesx script.ts
```

## Usage

```bash
# Run a TypeScript file
hermesx script.ts

# Show help
hermesx --help

# Show version
hermesx --version
```

## Features

- ✅ **TypeScript Support**: Runs TypeScript code seamlessly
- ✅ **Hermes Engine**: Uses same engine as React Native
- ✅ **Automatic Setup**: Downloads and caches Hermes binary on first run
- ✅ **External Modules**: Import and use npm packages like lodash, axios, etc.

## Quick Test

```bash
# Run the test suite
bun run test

# Or run a quick manual test
./bin/hermesx.js test/quick-test.ts hello world
```

## How it works

1. **First run**: Downloads the appropriate Hermes binary for your platform and caches it in `~/.cache/hermesx/`
2. **Bundling**: Uses Bun's built-in bundler to transpile TypeScript and resolve external modules
3. **Globals Injection**: Polyfills some APIs that are not available in Hermes
4. **Execution**: Runs the bundled code using the Hermes JavaScript engine
5. **Cleanup**: Removes temporary files after execution

The execution environment is a lightweight JavaScript runtime with comprehensive language features but without I/O capabilities like file system or network access.

## Platform Support

- ✅ **macOS** (Intel and Apple Silicon)
- ✅ **Linux** (x86_64)

## Global APIs

HermesX provides a Node.js-compatible environment with the following APIs:

### ✅ Available APIs

**Console APIs:**

> [!NOTE]  
> **Enhanced Console**: Console methods are polyfilled using Hermes's native `print()` function with enhanced formatting via `JSON.stringify()` for objects and arrays. Advanced console features like `console.table()`, `console.group()`, `console.trace()`, etc. are not available. Timing functions use `Date.now()` with 1ms precision.

- `console.log()` - Standard logging
- `console.error()` - Error logging (prefixed with "ERROR:")
- `console.warn()` - Warning logging (prefixed with "WARN:")
- `console.time()` - Start a named timer for performance measurement
- `console.timeEnd()` - End a named timer and display duration
- `console.timeLog()` - Log intermediate timer duration

**Process APIs:**

- `process.argv` - Command line arguments array
- `process.env` - Environment variables object
- `process.exit()` - Exit the process (throws error in Hermes)

**JavaScript Built-ins:**

- **Core Objects**: `Object`, `Array`, `JSON`, `Math`, `Date`, `RegExp`, `Promise`, `Proxy`, `Reflect`
- **Primitive Types**: `String`, `Number`, `Boolean`, `BigInt`, `Symbol`
- **Functions**: `Function`, `eval`
- **Typed Arrays**: `ArrayBuffer`, `DataView`, `Int8Array`, `Int16Array`, `Int32Array`, `Uint8Array`, `Uint8ClampedArray`, `Uint16Array`, `Uint32Array`, `Float32Array`, `Float64Array`, `BigInt64Array`, `BigUint64Array`
- **Collections**: `Set`, `Map`, `WeakMap`, `WeakSet`
- **Error Types**: `Error`, `AggregateError`, `EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`, `URIError`

**Utility Functions:**

- `parseInt`, `parseFloat`, `isNaN`, `isFinite`
- `encodeURI`, `decodeURI`, `encodeURIComponent`, `decodeURIComponent`
- `escape`, `unescape`, `atob`, `btoa`
- `globalThis` - Global object reference

**Timer Functions:**

- `setTimeout`, `clearTimeout`, `setImmediate`,
- `setInterval`, `clearInterval` (polyfilled internally by HermesX)

**Text Processing:**

- `TextEncoder` - Encode strings to UTF-8 bytes
- `atob` - Decode base64 to string
- `btoa` - Encode string to base64
- `escape`, `unescape` - URL encoding/decoding

**Hermes-specific:**

- `print()` - Hermes native print function (used internally)
- `HermesInternal` - Hermes internal APIs
- `gc()` - Garbage collection trigger
- `quit()` - Exit the runtime
- `createHeapSnapshot()` - Create heap snapshot for debugging
- `loadSegment()` - Load code segments

### ❌ Not Available

The following APIs are **not available** in the Hermes environment:

**Node.js APIs:**

- `require`, `module`, `exports` (use ES6 imports instead)
- `__dirname`, `__filename` (not applicable in bundled environment)
- `Buffer` (use standard JavaScript alternatives like `ArrayBuffer`)
- `global` (use `globalThis` instead)
- File system APIs (`fs`, `path`, etc.)
- Network APIs (`http`, `https`, etc.)

**Web APIs:**

- `fetch`, `Request`, `Response`, `Headers` (no network access)
- `URL`, `URLSearchParams` (not available)
- `FormData`, `AbortController` (not available)
- `TextDecoder` (not available, use alternatives)

**Performance APIs:**

> [!WARNING]  
> **Limited Timing Precision**: Hermes does not support `performance.now()` natively. All timing functions are polyfilled using `Date.now()` which provides **whole millisecond precision only** (1ms resolution). Native `performance.now()` provides **microsecond precision** (0.001ms resolution) with fractional milliseconds. Libraries expecting sub-millisecond timing precision may not work correctly.

- `performance.now()` - Polyfilled using `Date.now()` (returns whole milliseconds, not fractional)
- `performance.mark()` - Create named performance marks
- `performance.measure()` - Measure time between marks
- `benchmark()` - Custom utility for running performance benchmarks

**Limited Timer APIs:**

- None (all basic timer APIs are now available)

## Requirements

- Bun runtime
- Internet connection for first-time Hermes binary download

## Examples

### Basic TypeScript

```typescript
// hello.ts
const message: string = "Hello from HermesX!";
const user = { name: "Alice", age: 30, active: true };
const items = [1, 2, { type: "example" }];

console.log(message);
console.log("User object:", user);
console.log("Items array:", items);
```

```bash
hermesx hello.ts
# Output: Hello from HermesX!
# User object: {
#   "name": "Alice",
#   "age": 30,
#   "active": true
# }
# Items array: [
#   1,
#   2,
#   {
#     "type": "example"
#   }
# ]
```

### With Command Line Arguments

```typescript
// args.ts
console.log("Arguments:", process.argv.slice(2));
```

```bash
hermesx args.ts foo bar
# Output: Arguments: [ 'foo', 'bar' ]
```

### Async/Await

```typescript
// async.ts
async function fetchData(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve("Data loaded!"), 1000);
  });
}

fetchData().then(console.log);
```

```bash
hermesx async.ts
# Output: Data loaded!
```

### With External Modules

```typescript
// modules.ts
import _ from "lodash";

const numbers = [1, 2, 3, 4, 5];
const doubled = _.map(numbers, (n) => n * 2);
const sum = _.sum(doubled);

console.log(`Doubled: ${doubled}`);
console.log(`Sum: ${sum}`);
```

```bash
bun add lodash @types/lodash
hermesx modules.ts
# Output: Doubled: 2,4,6,8,10
# Output: Sum: 30
```

### Performance Measurement

```typescript
// benchmark.ts
// Note: All timing functions use Date.now() internally (millisecond precision only)
function fibonacciRecursive(n: number): number {
  if (n <= 1) return n;
  return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

function fibonacciIterative(n: number): number {
  if (n <= 1) return n;
  let a = 0,
    b = 1;
  for (let i = 2; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

// Method 1: Using console.time/timeEnd (most common)
console.time("recursive");
const result1 = fibonacciRecursive(30);
console.timeEnd("recursive");

console.time("iterative");
const result2 = fibonacciIterative(30);
console.timeEnd("iterative");

// Method 2: Using performance API (returns floating point milliseconds)
performance.mark("start");
fibonacciIterative(30);
performance.mark("end");
const measure = performance.measure("fibonacci-iterative", "start", "end");
console.log(`Duration: ${measure?.duration}ms`);

// Method 3: Using performance.now() (limited precision warning)
const start = performance.now(); // Returns whole milliseconds (not fractional like native)
fibonacciIterative(30);
const end = performance.now();
console.log(`Performance.now timing: ${end - start}ms`); // May show 0ms for fast operations

// Method 4: Using benchmark utility (multiple iterations with stats)
benchmark("Fibonacci Recursive", () => fibonacciRecursive(25), 5);
benchmark("Fibonacci Iterative", () => fibonacciIterative(25), 5);

// Method 5: Manual timing with Date.now() (lowest level)
const manualStart = Date.now();
fibonacciIterative(30);
const manualEnd = Date.now();
console.log(`Manual timing: ${manualEnd - manualStart}ms`);
```

```bash
hermesx benchmark.ts
# Output:
# recursive: 45ms
# iterative: 1ms
# fibonacci-iterative: 0ms
# Duration: 0ms
# Performance.now timing: 1ms
# Benchmark: Fibonacci Recursive
#   Iterations: 5
#   Total: 23ms
#   Average: 4.60ms
#   Min: 4ms
#   Max: 6ms
# Benchmark: Fibonacci Iterative
#   Iterations: 5
#   Total: 2ms
#   Average: 0.40ms
#   Min: 0ms
#   Max: 1ms
# Manual timing: 0ms
```

## Development

```bash
# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun run test

# Development with watch mode
bun run dev
```

## Architecture

- **`bin/hermesx.js`**: Main CLI executable
- **`src/cli.ts`**: Command-line interface and orchestration
- **`src/hermes-binary.ts`**: Hermes binary download and caching
- **`src/bundler.ts`**: TypeScript bundling with Bun
- **`src/hermes-runner.ts`**: Hermes execution wrapper
- **`hermes-globals.js`**: Node.js compatibility layer

## License

MIT
