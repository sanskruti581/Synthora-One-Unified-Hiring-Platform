import CodingQuestion from "../models/CodingQuestion.js";

const questions = [{
  "title": "Two Sum",
  "slug": "two-sum",
  "difficulty": "Easy",
  "description": "Given an array of integers nums and an integer target, return the indices of the two numbers whose sum equals target. Each input has exactly one solution, and you may not use the same element twice. Return the indices in any order.\n\nInput: The first line contains a JSON array of integers. The second line contains target.\nOutput: Print a JSON array containing the two indices.",
  "constraints": [
    "2 <= nums.length <= 10^4",
    "-10^9 <= nums[i], target <= 10^9",
    "Exactly one valid answer exists."
  ],
  "examples": [
    {
      "input": "[2, 7, 11, 15]\n9",
      "output": "[0,1]",
      "explanation": "nums[0] + nums[1] = 9."
    },
    {
      "input": "[3, 2, 4]\n6",
      "output": "[1,2]",
      "explanation": "nums[1] + nums[2] = 6."
    }
  ],
  "starterCode": {
    "javascript": "function twoSum(nums, target) {\n  // Return the two indices\n}\nconst fs = require('fs');\nconst lines = fs.readFileSync(0, 'utf8').trim().split(/\\r?\\n/);\nconsole.log(JSON.stringify(twoSum(JSON.parse(lines[0]), Number(lines[1]))));",
    "python": "def two_sum(nums, target):\n    # Return the two indices\n    pass\nif __name__ == '__main__':\n    import sys, json\n    lines = sys.stdin.read().strip().splitlines()\n    print(json.dumps(two_sum(json.loads(lines[0]), int(lines[1]))))",
    "java": "import java.util.*;\npublic class Solution {\n  static int[] twoSum(int[] nums, int target) { return new int[]{}; }\n  public static void main(String[] args) { Scanner s=new Scanner(System.in); String line=s.nextLine().replaceAll(\"[\\\\[\\\\] ]\", \"\"); int[] a=Arrays.stream(line.split(\",\")).mapToInt(Integer::parseInt).toArray(); int t=Integer.parseInt(s.nextLine()); System.out.println(Arrays.toString(twoSum(a,t)).replace(\" \",\"\")); }\n}",
    "cpp": "#include <bits/stdc++.h>\nusing namespace std;\nint main(){ string line; getline(cin,line); for(char &c:line) if(c=='['||c==']'||c==',') c=' '; stringstream ss(line); vector<int> a; int x; while(ss>>x)a.push_back(x); int t; cin>>t; // Implement and print the pair of indices\n}"
  },
  "testCases": [
    {
      "input": "[2, 7, 11, 15]\n9",
      "expectedOutput": "[0,1]",
      "isHidden": false
    },
    {
      "input": "[3, 2, 4]\n6",
      "expectedOutput": "[1,2]",
      "isHidden": false
    },
    {
      "input": "[3, 3]\n6",
      "expectedOutput": "[0,1]",
      "isHidden": true
    },
    {
      "input": "[-1, -2, -3, -4, -5]\n-8",
      "expectedOutput": "[2,4]",
      "isHidden": true
    }
  ],
  "marks": 10,
  "timeLimit": 2000,
  "memoryLimit": 256
}];

export async function seedCodingQuestions() {
  try {
    await CodingQuestion.deleteMany({});
    for (const q of questions) await CodingQuestion.findOneAndUpdate({ slug: q.slug }, { $set: q }, { upsert: true, new: true });
    console.log(`Seeded ${questions.length} coding question(s) successfully`);
  } catch (err) {
    console.error("Error seeding coding questions:", err);
  }
}
