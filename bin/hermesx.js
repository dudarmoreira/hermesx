#!/usr/bin/env node

// This is the main executable that will be installed globally
// It simply imports and runs the compiled CLI from lib/cli.js

import("../lib/cli.js").catch((error) => {
  console.error("Failed to start hermesx:", error.message);
  process.exit(1);
});
