import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

function normalizeOutput(str) {
  if (typeof str !== "string") return "";
  return str.replace(/\r\n/g, "\n").trim();
}

export function areOutputsEqual(actual, expected) {
  const normActual = normalizeOutput(actual);
  const normExpected = normalizeOutput(expected);
  if (normActual === normExpected) return true;

  // Numeric comparison fallback
  if (normActual !== "" && normExpected !== "" && !isNaN(Number(normActual)) && !isNaN(Number(normExpected))) {
    if (Number(normActual) === Number(normExpected)) return true;
  }

  // JSON comparison fallback
  try {
    const jsonActual = JSON.parse(normActual);
    const jsonExpected = JSON.parse(normExpected);
    if (JSON.stringify(jsonActual) === JSON.stringify(jsonExpected)) {
      return true;
    }
  } catch {}

  return false;
}

function runSubProcess(cmd, args, input = "", cwd, timeout = 3000) {
  return new Promise((resolve) => {
    let proc;
    try {
      proc = spawn(cmd, args, { cwd, shell: false });
    } catch (err) {
      return resolve({
        exitCode: -1,
        stdout: "",
        stderr: `Failed to spawn process ${cmd}: ${err.message}`,
        timedOut: false
      });
    }

    let stdout = "";
    let stderr = "";
    let isKilled = false;

    const timer = setTimeout(() => {
      isKilled = true;
      try {
        proc.kill("SIGKILL");
      } catch {}
      resolve({
        exitCode: -1,
        stdout,
        stderr: "Time Limit Exceeded (3000ms)",
        timedOut: true
      });
    }, timeout);

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (input) {
      try {
        proc.stdin.write(input);
      } catch {}
    }
    try {
      proc.stdin.end();
    } catch {}

    proc.on("close", (exitCode) => {
      clearTimeout(timer);
      if (!isKilled) {
        resolve({
          exitCode: exitCode ?? 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut: false
        });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      if (!isKilled) {
        resolve({
          exitCode: -1,
          stdout,
          stderr: err.message,
          timedOut: false
        });
      }
    });
  });
}

/**
 * Executes code against test cases in an isolated subprocess.
 * Supported languages: javascript, python, java, c, cpp
 */
export async function executeCode({ language, sourceCode, testCases = [], timeLimit = 3000 }) {
  const normLang = String(language || "javascript").toLowerCase().trim();
  const supported = ["javascript", "python", "java", "c", "cpp"];

  if (!supported.includes(normLang)) {
    throw new Error(`Language '${language}' is not supported. Please choose from: JavaScript, Python, Java, C, C++`);
  }

  if (!sourceCode || !sourceCode.trim()) {
    return {
      results: testCases.map(tc => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: "",
        passed: false,
        error: "No source code provided"
      })),
      passedCount: 0,
      totalCount: testCases.length
    };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `synthora-exec-${normLang}-`));

  try {
    let runCommand = "";
    let runArgs = [];

    const isWindows = process.platform === "win32";
    const exeName = isWindows ? "solution.exe" : "solution";
    const exePath = path.join(tempDir, exeName);

    // 1. Language preparation & compilation
    if (normLang === "javascript") {
      const filePath = path.join(tempDir, "solution.js");
      await fs.writeFile(filePath, sourceCode, "utf8");
      runCommand = "node";
      runArgs = [filePath];
    } else if (normLang === "python") {
      const filePath = path.join(tempDir, "solution.py");
      await fs.writeFile(filePath, sourceCode, "utf8");
      runCommand = isWindows ? "python" : (process.env.PYTHON_CMD || "python3");
      runArgs = [filePath];
    } else if (normLang === "java") {
      const filePath = path.join(tempDir, "Solution.java");
      await fs.writeFile(filePath, sourceCode, "utf8");
      const compileRes = await runSubProcess("javac", ["Solution.java"], "", tempDir, 8000);
      if (compileRes.exitCode !== 0) {
        let errorMsg = compileRes.stderr || compileRes.stdout || "Compilation Failed";
        if (errorMsg.includes("ENOENT") || compileRes.exitCode === -1) {
          errorMsg = "Java compiler (javac) is not installed on this server host. Please install Java JDK or use JavaScript, Python, C, or C++.";
        }
        return {
          results: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            error: `Compilation Error:\n${errorMsg}`
          })),
          passedCount: 0,
          totalCount: testCases.length,
          compilationError: errorMsg
        };
      }
      runCommand = "java";
      runArgs = ["Solution"];
    } else if (normLang === "c") {
      const filePath = path.join(tempDir, "solution.c");
      await fs.writeFile(filePath, sourceCode, "utf8");
      const compileRes = await runSubProcess("gcc", ["solution.c", "-o", exeName], "", tempDir, 8000);
      if (compileRes.exitCode !== 0) {
        let errorMsg = compileRes.stderr || compileRes.stdout || "Compilation Failed";
        if (errorMsg.includes("ENOENT") || compileRes.exitCode === -1) {
          errorMsg = "C compiler (gcc) is not installed on this server host. Please install GCC or use JavaScript or Python.";
        }
        return {
          results: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            error: `Compilation Error:\n${errorMsg}`
          })),
          passedCount: 0,
          totalCount: testCases.length,
          compilationError: errorMsg
        };
      }
      runCommand = exePath;
      runArgs = [];
    } else if (normLang === "cpp") {
      const filePath = path.join(tempDir, "solution.cpp");
      await fs.writeFile(filePath, sourceCode, "utf8");
      const compileRes = await runSubProcess("g++", ["solution.cpp", "-o", exeName], "", tempDir, 8000);
      if (compileRes.exitCode !== 0) {
        let errorMsg = compileRes.stderr || compileRes.stdout || "Compilation Failed";
        if (errorMsg.includes("ENOENT") || compileRes.exitCode === -1) {
          errorMsg = "C++ compiler (g++) is not installed on this server host. Please install GCC/G++ or use JavaScript or Python.";
        }
        return {
          results: testCases.map(tc => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: "",
            passed: false,
            error: `Compilation Error:\n${errorMsg}`
          })),
          passedCount: 0,
          totalCount: testCases.length,
          compilationError: errorMsg
        };
      }
      runCommand = exePath;
      runArgs = [];
    }

    // 2. Execute against all test cases
    const results = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      const exec = await runSubProcess(runCommand, runArgs, testCase.input, tempDir, timeLimit);

      let actualOutput = exec.stdout;
      let error = null;
      let passed = false;

      if (exec.timedOut) {
        error = "Time Limit Exceeded";
      } else if (exec.exitCode !== 0 && !actualOutput) {
        error = exec.stderr || `Runtime Error (exit code ${exec.exitCode})`;
      } else {
        if (areOutputsEqual(actualOutput, testCase.expectedOutput)) {
          passed = true;
          passedCount++;
        } else {
          error = exec.stderr || `Output mismatch: expected '${testCase.expectedOutput}', got '${actualOutput}'`;
        }
      }

      results.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
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
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}
