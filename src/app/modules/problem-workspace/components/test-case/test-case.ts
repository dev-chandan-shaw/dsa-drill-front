import { Component, computed, input } from '@angular/core';
import { IQuestionTestCase } from '../../../home/models/Question';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TabsModule } from 'primeng/tabs';
import { ISubmissionResult, ISubmissionTestCaseResult } from '../../models/submission';

@Component({
  selector: 'app-test-case',
  imports: [CardModule, TagModule, TabsModule],
  templateUrl: './test-case.html',
  styleUrl: './test-case.scss',
})
export class TestCaseComponent {
  testCases = input<IQuestionTestCase[]>([]);
  submissionResult = input<ISubmissionResult | null>(null);

  orderedTestCases = computed(() => {
    return [...this.testCases()].sort((a, b) => a.orderIndex - b.orderIndex);
  });

  resultsByIndex = computed(() => {
    const result = this.submissionResult();
    const mappedResults = new Map<number, ISubmissionTestCaseResult>();

    if (!result) {
      return mappedResults;
    }

    for (const testCaseResult of result.testCaseResults) {
      mappedResults.set(testCaseResult.index, testCaseResult);
    }

    return mappedResults;
  });

  summaryTag = computed(() => {
    const result = this.submissionResult();
    if (!result) {
      return null;
    }

    return `${result.status} ${result.passedTestCases}/${result.totalTestCases}`;
  });

  getResultForTestCase(orderIndex: number, tabPosition: number) {
    const result = this.submissionResult();
    if (!result) {
      return null;
    }

    const byIndex = this.resultsByIndex().get(orderIndex);
    if (byIndex) {
      return byIndex;
    }

    // Fallback for APIs where index is positional (1-based) rather than orderIndex.
    return result.testCaseResults[tabPosition] ?? null;
  }
}
