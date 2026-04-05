export interface ISubmission {
  problemId: number;
  languageId: string;
  sourceCode: string;
}

export interface ISubmissionResult {
  passedTestCases: number;
  runtimeMs: number;
  status: string;
  submissionId: number | null;
  submittedAt: string | null;
  testCaseResults: ISubmissionTestCaseResult[];
  totalTestCases: number;
}

export interface ISubmissionTestCaseResult {
  index: number;
  stdin: string | null;
  expectedOutput: string | null;
  actualOutput: string | null;
  passed: boolean;
  runtimeMs: number;
  status: string;
  stderr: string | null;
  sample: boolean;
}
