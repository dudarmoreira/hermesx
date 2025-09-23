// Hermes globals to provide Node.js-like environment
// Helper function to format console arguments
function formatConsoleArgs(...args) {
  return args
    .map((arg) => {
      if (arg === null) return "null";
      if (arg === undefined) return "undefined";
      if (typeof arg === "string") return arg;
      if (typeof arg === "number" || typeof arg === "boolean")
        return String(arg);
      if (typeof arg === "function")
        return `[Function: ${arg.name || "anonymous"}]`;
      if (typeof arg === "object") {
        try {
          // Handle circular references and format objects nicely
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          // Fallback for circular references
          return "[object Object]";
        }
      }
      return String(arg);
    })
    .join(" ");
}

globalThis.console = {
  log: function (...args) {
    print(formatConsoleArgs(...args));
  },
  error: function (...args) {
    print("ERROR: " + formatConsoleArgs(...args));
  },
  warn: function (...args) {
    print("WARN: " + formatConsoleArgs(...args));
  },
  time: function (label) {
    if (!globalThis._timers) {
      globalThis._timers = new Map();
    }
    globalThis._timers.set(label || "default", Date.now());
  },
  timeEnd: function (label) {
    if (!globalThis._timers) {
      globalThis._timers = new Map();
    }
    const key = label || "default";
    const startTime = globalThis._timers.get(key);
    if (startTime !== undefined) {
      const duration = Date.now() - startTime;
      print(`${key}: ${duration}ms`);
      globalThis._timers.delete(key);
    } else {
      print(`Timer '${key}' does not exist`);
    }
  },
  timeLog: function (label, ...data) {
    if (!globalThis._timers) {
      globalThis._timers = new Map();
    }
    const key = label || "default";
    const startTime = globalThis._timers.get(key);
    if (startTime !== undefined) {
      const duration = Date.now() - startTime;
      const message = data.length > 0 ? ` ${data.join(" ")}` : "";
      print(`${key}: ${duration}ms${message}`);
    } else {
      print(`Timer '${key}' does not exist`);
    }
  },
};

// Basic process object
globalThis.process = {
  argv: ["hermes", "script.js"], // Will be updated by the runner
  env: {},
  exit: function (code) {
    throw new Error("Process exit: " + (code || 0));
  },
};

// Polyfill for setInterval using setTimeout
globalThis._intervals = new Map();
globalThis._intervalId = 1;

globalThis.setInterval = function (callback, delay, ...args) {
  const id = globalThis._intervalId++;
  let active = true;

  function repeat() {
    if (active) {
      try {
        callback(...args);
      } catch (error) {
        console.error("Error in setInterval callback:", error);
      }
      // Schedule next execution
      if (active) {
        setTimeout(repeat, delay);
      }
    }
  }

  // Store the active flag so we can stop it
  globalThis._intervals.set(id, {
    stop: () => {
      active = false;
    },
  });

  // Start the first execution
  setTimeout(repeat, delay);

  return id;
};

globalThis.clearInterval = function (id) {
  if (globalThis._intervals.has(id)) {
    const interval = globalThis._intervals.get(id);
    interval.stop();
    globalThis._intervals.delete(id);
  }
};

// Performance measurement utilities for Hermes
// Since performance.now() is not available, we use Date.now() as fallback
// WARNING: This provides millisecond precision only, not the microsecond precision of native performance.now()
globalThis.performance = {
  // Native performance.now() returns milliseconds with microsecond precision (e.g., 1234.567890)
  // Date.now() only provides whole millisecond precision (e.g., 1234)
  // We return Date.now() as-is since we cannot add precision we don't have
  now: function () {
    // Note: This returns whole milliseconds, not fractional like native performance.now()
    // Libraries expecting sub-millisecond precision may not work correctly
    return Date.now();
  },
  mark: function (name) {
    if (!globalThis._performanceMarks) {
      globalThis._performanceMarks = new Map();
    }
    globalThis._performanceMarks.set(name, Date.now());
  },
  measure: function (name, startMark, endMark) {
    if (!globalThis._performanceMarks) {
      globalThis._performanceMarks = new Map();
    }
    const start = globalThis._performanceMarks.get(startMark);
    const end = globalThis._performanceMarks.get(endMark);
    if (start !== undefined && end !== undefined) {
      const duration = end - start;
      console.log(`${name}: ${duration}ms`);
      // Return object compatible with PerformanceMeasure interface
      return {
        name: name,
        duration: duration, // milliseconds as number
        startTime: start,
        entryType: "measure",
        detail: null,
      };
    } else {
      console.error(
        `Performance marks '${startMark}' or '${endMark}' not found`
      );
      return null;
    }
  },
  // Add getEntries method for compatibility with performance API
  getEntries: function () {
    return []; // Simple implementation - could be enhanced
  },
  getEntriesByType: function (type) {
    return []; // Simple implementation - could be enhanced
  },
  getEntriesByName: function (name) {
    return []; // Simple implementation - could be enhanced
  },
};

// Simple benchmark utility function
globalThis.benchmark = function (name, fn, iterations = 1) {
  const results = [];

  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    fn();
    const end = Date.now();
    results.push(end - start);
  }

  const total = results.reduce((sum, time) => sum + time, 0);
  const average = total / iterations;
  const min = Math.min(...results);
  const max = Math.max(...results);

  console.log(`Benchmark: ${name}`);
  console.log(`  Iterations: ${iterations}`);
  console.log(`  Total: ${total}ms`);
  console.log(`  Average: ${average.toFixed(2)}ms`);
  console.log(`  Min: ${min}ms`);
  console.log(`  Max: ${max}ms`);

  return { name, iterations, total, average, min, max, results };
};
