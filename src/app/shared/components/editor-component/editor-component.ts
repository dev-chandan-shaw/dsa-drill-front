import { isPlatformBrowser } from '@angular/common';
import {
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  linkedSignal,
  Output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';
import { ButtonModule } from 'primeng/button';
import { IQuestion } from '../../../modules/home/models/Question';
import { Select } from 'primeng/select';
import { ISubmission } from '../../../modules/problem-workspace/models/submission';
import { CardModule } from 'primeng/card';
@Component({
  selector: 'app-editor-component',
  imports: [FormsModule, MonacoEditorModule, ButtonModule, Select, CardModule],
  templateUrl: './editor-component.html',
  styleUrl: './editor-component.scss',
})
export class EditorComponent {
  question = input.required<IQuestion>();
  isSubmitting = input<boolean>(false);
  @Output() submitCode = new EventEmitter<ISubmission>();

  languageId = signal<string>('63');
  code = linkedSignal(() => this.languageStarterCode());
  platformId = inject(PLATFORM_ID);
  isBrowser = isPlatformBrowser(this.platformId);
  private editorInstance: any;
  language = computed(() => {
    switch (this.languageId()) {
      case '62':
        return 'java';
      case '63':
        return 'javascript';
      case '71':
        return 'python';
      case '54':
        return 'cpp';
      default:
        return 'java';
    }
  });

  languageStarterCode = computed(() => {
    const template = this.question().template;
    switch (this.language()) {
      case 'java':
        return template.javaStarter;
      case 'javascript':
        return template.jsStarter;
      case 'python':
        return template.pythonStarter;
      case 'cpp':
        return template.cppStarter;
      default:
        return template.javaStarter;
    }
  });

  languageOptions = [
    {
      label: 'JavaScript',
      value: '63',
    },
    {
      label: 'Python',
      value: '71',
    },
    {
      label: 'C++',
      value: '54',
    },
    {
      label: 'Java',
      value: '62',
    },
  ];
  editorOptions = computed(() => {
    return {
      theme: 'vs-dark',
      language: this.language(),

      // --- Font Settings ---
      fontSize: 16, // Change size in pixels
      fontFamily: "'JetBrains Mono', monospace",
      fontWeight: '400', // 'normal', 'bold', or numeric weights like '400', '600'
      fontLigatures: true, // Great if you use a font like Fira Code that supports coding ligatures (like turning !== into a single symbol)

      // --- Tab & Spacing Settings ---
      tabSize: 4, // Number of spaces a tab represents (usually 2 or 4)
      insertSpaces: true, // true = spaces, false = actual \t character

      // --- Layout Settings ---
      minimap: { enabled: false },
      automaticLayout: true,
      wordWrap: 'on',
      readOnly: false,
    };
  });

  runCode() {
    const data: ISubmission = {
      problemId: this.question().id,
      languageId: this.languageId(),
      sourceCode: this.code(),
    };
    this.submitCode.emit(data);
  }

  onEditorInit(editor: any) {
    this.editorInstance = editor;
  }

  formatCode() {
    if (this.editorInstance) {
      // Triggers the built-in "Format Document" action
      this.editorInstance.getAction('editor.action.formatDocument').run();
    }
  }
}
