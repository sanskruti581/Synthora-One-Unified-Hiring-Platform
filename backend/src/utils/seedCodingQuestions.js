import CodingQuestion from "../models/CodingQuestion.js";

const questions = [
  {
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\nYou can return the answer in any order.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    examples: [
      {
        input: "[2, 7, 11, 15]\n9",
        output: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "[3, 2, 4]\n6",
        output: "[1, 2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Write your code here\n  \n}\n\n// Read from stdin to handle inputs\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim().split('\\n');\nif(input.length >= 2) {\n  const nums = JSON.parse(input[0]);\n  const target = parseInt(input[1], 10);\n  console.log(JSON.stringify(twoSum(nums, target)));\n}`,
      python: `def two_sum(nums, target):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    import sys, json\n    input_data = sys.stdin.read().strip().split('\\n')\n    if len(input_data) >= 2:\n        nums = json.loads(input_data[0])\n        target = int(input_data[1])\n        print(json.dumps(two_sum(nums, target)))`
    },
    testCases: [
      { input: "[2, 7, 11, 15]\n9", expectedOutput: "[0,1]", isHidden: false },
      { input: "[3, 2, 4]\n6", expectedOutput: "[1,2]", isHidden: false },
      { input: "[3, 3]\n6", expectedOutput: "[0,1]", isHidden: true },
      { input: "[1, 2, 3, 4, 5]\n9", expectedOutput: "[3,4]", isHidden: true },
      { input: "[-1, -2, -3, -4, -5]\n-8", expectedOutput: "[2,4]", isHidden: true }
    ],
    marks: 10,
    timeLimit: 2000,
    memoryLimit: 256
  },
  {
    title: "Palindrome Check",
    slug: "palindrome-check",
    difficulty: "Easy",
    description: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.\nGiven a string s, return true if it is a palindrome, or false otherwise.",
    constraints: [
      "1 <= s.length <= 2 * 10^5",
      "s consists only of printable ASCII characters."
    ],
    examples: [
      {
        input: '"A man, a plan, a canal: Panama"',
        output: "true",
        explanation: '"amanaplanacanalpanama" is a palindrome.'
      },
      {
        input: '"race a car"',
        output: "false",
        explanation: '"raceacar" is not a palindrome.'
      }
    ],
    starterCode: {
      javascript: `function isPalindrome(s) {\n  // Write your code here\n  \n}\n\n// Read from stdin to handle inputs\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif(input) {\n  const s = JSON.parse(input);\n  console.log(isPalindrome(s));\n}`,
      python: `def is_palindrome(s):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    import sys, json\n    input_data = sys.stdin.read().strip()\n    if input_data:\n        s = json.loads(input_data)\n        print(str(is_palindrome(s)).lower())`
    },
    testCases: [
      { input: '"A man, a plan, a canal: Panama"', expectedOutput: "true", isHidden: false },
      { input: '"race a car"', expectedOutput: "false", isHidden: false },
      { input: '" "', expectedOutput: "true", isHidden: true },
      { input: '"0P"', expectedOutput: "false", isHidden: true },
      { input: '"ab_a"', expectedOutput: "true", isHidden: true }
    ],
    marks: 10,
    timeLimit: 2000,
    memoryLimit: 256
  },
  {
    title: "FizzBuzz Variant",
    slug: "fizzbuzz-variant",
    difficulty: "Medium",
    description: "Given an integer n, return a string array answer (1-indexed) where:\nanswer[i] == \"FizzBuzz\" if i is divisible by 3 and 5.\nanswer[i] == \"Fizz\" if i is divisible by 3.\nanswer[i] == \"Buzz\" if i is divisible by 5.\nanswer[i] == i (as a string) if none of the above conditions are true.",
    constraints: [
      "1 <= n <= 10^4"
    ],
    examples: [
      {
        input: "3",
        output: '["1","2","Fizz"]',
        explanation: ""
      },
      {
        input: "5",
        output: '["1","2","Fizz","4","Buzz"]',
        explanation: ""
      }
    ],
    starterCode: {
      javascript: `function fizzBuzz(n) {\n  // Write your code here\n  \n}\n\n// Read from stdin to handle inputs\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif(input) {\n  const n = parseInt(input, 10);\n  console.log(JSON.stringify(fizzBuzz(n)));\n}`,
      python: `def fizz_buzz(n):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    import sys, json\n    input_data = sys.stdin.read().strip()\n    if input_data:\n        n = int(input_data)\n        print(json.dumps(fizz_buzz(n)))`
    },
    testCases: [
      { input: "3", expectedOutput: '["1","2","Fizz"]', isHidden: false },
      { input: "5", expectedOutput: '["1","2","Fizz","4","Buzz"]', isHidden: false },
      { input: "15", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz"]', isHidden: true },
      { input: "1", expectedOutput: '["1"]', isHidden: true },
      { input: "10", expectedOutput: '["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz"]', isHidden: true }
    ],
    marks: 15,
    timeLimit: 2000,
    memoryLimit: 256
  },
  {
    title: "Maximum Subarray",
    slug: "maximum-subarray",
    difficulty: "Medium",
    description: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\nA subarray is a contiguous part of an array.",
    constraints: [
      "1 <= nums.length <= 10^5",
      "-10^4 <= nums[i] <= 10^4"
    ],
    examples: [
      {
        input: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]",
        output: "6",
        explanation: "[4,-1,2,1] has the largest sum = 6."
      },
      {
        input: "[1]",
        output: "1",
        explanation: "The subarray [1] has the largest sum 1."
      }
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n  // Write your code here\n  \n}\n\n// Read from stdin to handle inputs\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif(input) {\n  const nums = JSON.parse(input);\n  console.log(maxSubArray(nums));\n}`,
      python: `def max_sub_array(nums):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    import sys, json\n    input_data = sys.stdin.read().strip()\n    if input_data:\n        nums = json.loads(input_data)\n        print(max_sub_array(nums))`
    },
    testCases: [
      { input: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", expectedOutput: "6", isHidden: false },
      { input: "[1]", expectedOutput: "1", isHidden: false },
      { input: "[5, 4, -1, 7, 8]", expectedOutput: "23", isHidden: true },
      { input: "[-1]", expectedOutput: "-1", isHidden: true },
      { input: "[-2, -1]", expectedOutput: "-1", isHidden: true }
    ],
    marks: 15,
    timeLimit: 2000,
    memoryLimit: 256
  },
  {
    title: "Balanced Parentheses",
    slug: "balanced-parentheses",
    difficulty: "Hard",
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.",
    constraints: [
      "1 <= s.length <= 10^4",
      "s consists of parentheses only '()[]{}'."
    ],
    examples: [
      {
        input: '"()"',
        output: "true",
        explanation: "Valid because it's a simple balanced pair."
      },
      {
        input: '"()[]{}"',
        output: "true",
        explanation: "Valid because all pairs are matched and balanced."
      }
    ],
    starterCode: {
      javascript: `function isValid(s) {\n  // Write your code here\n  \n}\n\n// Read from stdin to handle inputs\nconst fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nif(input) {\n  const s = JSON.parse(input);\n  console.log(isValid(s));\n}`,
      python: `def is_valid(s):\n    # Write your code here\n    pass\n\nif __name__ == "__main__":\n    import sys, json\n    input_data = sys.stdin.read().strip()\n    if input_data:\n        s = json.loads(input_data)\n        print(str(is_valid(s)).lower())`
    },
    testCases: [
      { input: '"()"', expectedOutput: "true", isHidden: false },
      { input: '"()[]{}"', expectedOutput: "true", isHidden: false },
      { input: '"(]"', expectedOutput: "false", isHidden: true },
      { input: '"([)]"', expectedOutput: "false", isHidden: true },
      { input: '"{[]}"', expectedOutput: "true", isHidden: true },
      { input: '"]"', expectedOutput: "false", isHidden: true }
    ],
    marks: 20,
    timeLimit: 2000,
    memoryLimit: 256
  }
];

export async function seedCodingQuestions() {
  try {
    for (const q of questions) {
      await CodingQuestion.findOneAndUpdate(
        { slug: q.slug },
        { $set: q },
        { upsert: true, new: true }
      );
    }
    console.log("✅ Seeded coding questions successfully");
  } catch (err) {
    console.error("❌ Error seeding coding questions:", err);
  }
}
