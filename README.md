# hermesx

Run TypeScript files using the Hermes JavaScript engine with automatic transpilation. Basically `tsx` but with Hermes as engine.

It's useful especially if you want to do performance profiling of your code quickly on your computer without need to building whole React Native project. Problem with using Node/Bun is that it's engine V8/JSC (+JIT) is much faster so it doesn't give you accurate results for how code will perform in React Native app.

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
bunx hermesx script.ts
# or
npx hermesx script.ts

# Show help
npx hermesx --help

# Show version
npx hermesx --version
```

## Features

- ✅ **TypeScript Support**: Runs TypeScript code seamlessly
- ✅ **Metro Bundler**: Uses Rspack + Babel with React Native preset, so it's similar to how React Native bundles code
- ✅ **Hermes Engine**: Uses same engine as React Native
- ✅ **Automatic Setup**: Downloads and caches latest Hermes binary on first run
- ✅ **External Modules**: Import and use npm packages like lodash, date-fns, etc. from current project

## Limitations

Hermes has very limited APIs, so some features are not available (for example `fetch`). Please check [Limitations](#limitations) section for more details.

## Examples

### Basic TypeScript

```typescript
// hello.ts
const message: string = "Hello from hermesx!";
const user = { name: "Alice", age: 30, active: true };
const items = [1, 2, { type: "example" }];

console.log(message);
console.log("User object:", user);
console.log("Items array:", items);
```

```bash
hermesx hello.ts
# Output: Hello from hermesx!
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

## Platform Support

- ✅ **macOS** (Intel and Apple Silicon)
- ✅ **Linux** (x86_64)

## Available APIs

We are limited with Hermes's APIs, but we try to polyfill some basic ones.

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
- `setInterval`, `clearInterval` (polyfilled internally by `hermesx`)

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

**Performance APIs:**

> [!WARNING]  
> **Limited Timing Precision**: Hermes does not support `performance.now()` natively. All timing functions are polyfilled using `Date.now()` which provides **whole millisecond precision only** (1ms resolution). Native `performance.now()` provides **microsecond precision** (0.001ms resolution) with fractional milliseconds. Libraries expecting sub-millisecond timing precision may not work correctly.

- `performance.now()` - Polyfilled using `Date.now()` (returns whole milliseconds, not fractional)
- `performance.mark()` - Create named performance marks
- `performance.measure()` - Measure time between marks
- `benchmark()` - Custom utility for running performance benchmarks

### ❌ Not Available

The following APIs are **not available** in the Hermes environment:

**Node.js APIs:**

- `Buffer` (use standard JavaScript alternatives like `ArrayBuffer`)
- `global` (use `globalThis` instead)
- Node.js APIs (`fs`, `path`, `http`, `https`, etc.)

**Web APIs:**

- `fetch`, `Request`, `Response`, `Headers` (no network access)
- `URL`, `URLSearchParams` (not available)
- `FormData`, `AbortController` (not available)
- `TextDecoder` (not available, use alternatives)

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

### Quick Test

```bash
# Run the test suite
bun run test

# Or run a quick manual test
./bin/hermesx.js test/quick-test.ts hello world
```

### How it works

1. **First run**: Downloads the appropriate Hermes binary for your platform and caches it in `~/.cache/hermesx/`
2. **Bundling**: Uses Metro bundler to transpile TypeScript and resolve external modules
3. **Globals Injection**: Polyfills some APIs that are not available in Hermes
4. **Execution**: Runs the bundled code using the Hermes JavaScript engine
5. **Cleanup**: Removes temporary files after execution

The execution environment is a lightweight JavaScript runtime with comprehensive language features but without I/O capabilities like file system or network access.
