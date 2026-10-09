import vm from "vm";

/**
 * Execute code against test cases.
 * V1: Uses a sandboxed eval approach for JavaScript only.
 * The provider interface is designed to be replaced with Judge0 or similar.
 */
export async function executeCode({ language, sourceCode, testCases, timeLimit = 2000 }) {
  if (language === "python") {
    return {
      results: testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: "",
        passed: false,
        error: "Python execution requires a sandboxed runtime. Please use JavaScript for V1."
      })),
      passedCount: 0,
      totalCount: testCases.length
    };
  }

  if (language !== "javascript") {
    throw new Error(`Language ${language} not supported`);
  }

  const results = [];
  let passedCount = 0;

  for (const testCase of testCases) {
    const { input, expectedOutput } = testCase;
    
    // We will capture console.log output
    let outputLogs = [];
    const sandbox = {
      console: {
        log: (...args) => {
          outputLogs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(" "));
        }
      },
      // Provide a mock fs module for the stdin reading hack in our starter code
      require: (mod) => {
        if (mod === 'fs') {
          return {
            readFileSync: (fd, enc) => {
              if (fd === 0) return input;
              return "";
            }
          };
        }
        throw new Error(`Cannot require module ${mod}`);
      },
      JSON,
      parseInt,
      parseFloat,
      String,
      Number,
      Boolean,
      Array,
      Object,
      Math
    };

    let actualOutput = "";
    let error = null;
    let passed = false;

    try {
      const script = new vm.Script(sourceCode);
      const context = vm.createContext(sandbox);
      script.runInContext(context, { timeout: timeLimit });
      
      actualOutput = outputLogs.join("\n").trim();
      // Simple string comparison for equality, trimming whitespace
      if (actualOutput === expectedOutput.trim()) {
        passed = true;
        passedCount++;
      }
    } catch (err) {
      error = err.message || "Execution error";
    }

    results.push({
      input,
      expectedOutput,
      actualOutput,
      passed,
      error
    });
  }

  return {
    results,
    passedCount,
    totalCount: testCases.length
  };
}
