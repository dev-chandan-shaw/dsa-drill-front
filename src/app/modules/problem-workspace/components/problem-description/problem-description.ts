import { Component, computed, input } from '@angular/core';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { Tag } from 'primeng/tag';
import { IQuestion, IQuestionExample, IQuestionTestCase } from '../../../home/models/Question';

@Component({
  selector: 'app-problem-description',
  imports: [CardModule, DividerModule, Tag],
  templateUrl: './problem-description.html',
  styleUrl: './problem-description.scss',
})
export class ProblemDescriptionComponent {
  question = input.required<IQuestion>();

  sampleTestCases = computed<IQuestionTestCase[]>(() => {
    return this.question()
      .testCases.filter((testCase) => testCase.sample)
      .sort((left, right) => left.orderIndex - right.orderIndex);
  });

  examples = computed<IQuestionExample[]>(() => {
    const questionExamples = this.question().examples;
    if (questionExamples && questionExamples.length > 0) {
      return questionExamples;
    }

    return this.sampleTestCases().map((testCase) => ({
      inputDescription: testCase.stdin,
      outputDescription: testCase.expectedOutput,
      explanation: testCase.description || 'Sample example from test case.',
      imageUrl: null,
    }));
  });

  difficultySeverity = computed(() => {
    const difficulty = this.question().difficulty;
    if (difficulty === 'EASY') {
      return 'success';
    }

    if (difficulty === 'MED') {
      return 'warn';
    }

    return 'danger';
  });

  description = computed(() => {
    const problemDescription = this.question().description?.trim();
    return problemDescription || 'Problem statement is not available for this question yet.';
  });
}
