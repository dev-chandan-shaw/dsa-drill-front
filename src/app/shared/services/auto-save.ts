import { Signal, signal } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { debounceTime, merge, Observable, Subject, Subscription, tap } from 'rxjs';

export type AutoSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface AutoSaveHandle {
  readonly state: Signal<AutoSaveState>;
  readonly savedAt: Signal<Date | null>;
  /** Save now if there are savable changes (used on close + Retry). */
  flush: () => void;
  /** Tear down the value subscription. In-flight saves still settle. */
  destroy: () => void;
}

export interface AutoSaveOptions {
  /** Ms of quiet time before a save fires. Defaults to 1000. */
  debounceMs?: number;
  /** Gate: form valid, target id present, etc. Skipped saves stay dirty. */
  shouldSave: (value: unknown) => boolean;
  save: (value: unknown) => Observable<unknown>;
  onSaved?: (value: unknown, response: unknown) => void;
  onError?: (err: unknown) => void;
}

// Debounced auto-save driver shared by notes + pattern add/edit.
// - Captures the form snapshot on creation: untouched opens stay idle.
// - Typing marks dirty; quiet time triggers one save per burst.
// - Unchanged/invalid values never hit the network.
// - Overlapping saves can't run: the completion handler re-fires when newer
//   changes arrived mid-flight.
// - flush() saves synchronously (no debounce) for close/Retry; destroy()
//   never cancels an in-flight request, so close-flushes always land.
export function createAutoSave(
  // FormGroup is invariant in its controls type; any keeps every call site
  // (typed and untyped groups) assignable. Values are only stringified here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: FormGroup<any>,
  options: AutoSaveOptions,
): AutoSaveHandle {
  const state = signal<AutoSaveState>('idle');
  const savedAt = signal<Date | null>(null);
  const manual$ = new Subject<void>();

  const keyOf = (value: unknown): string => JSON.stringify(value);
  let lastSavedKey = keyOf(form.getRawValue());
  let saving = false;

  const runSave = (value: unknown, key: string): void => {
    saving = true;
    state.set('saving');
    options.save(value).subscribe({
      next: (response: unknown) => {
        saving = false;
        lastSavedKey = key;
        savedAt.set(new Date());
        state.set('saved');
        options.onSaved?.(value, response);
        // Newer keystrokes landed mid-flight: save again immediately.
        const latest = form.getRawValue();
        if (options.shouldSave(latest) && keyOf(latest) !== lastSavedKey) {
          manual$.next();
        }
      },
      error: (err: unknown) => {
        saving = false;
        state.set('error');
        options.onError?.(err);
      },
    });
  };

  const maybeSave = (): void => {
    const value = form.getRawValue();
    if (!options.shouldSave(value) || keyOf(value) === lastSavedKey || saving) {
      return;
    }
    runSave(value, keyOf(value));
  };

  const subscription = new Subscription();
  subscription.add(
    merge(
      form.valueChanges.pipe(
        tap(() => {
          if (state() === 'saving') {
            return;
          }
          if (keyOf(form.getRawValue()) !== lastSavedKey) {
            state.set('dirty');
          } else if (state() === 'dirty') {
            state.set(savedAt() ? 'saved' : 'idle');
          }
        }),
        debounceTime(options.debounceMs ?? 1000),
      ),
      manual$,
    ).subscribe(() => maybeSave()),
  );

  return {
    state: state.asReadonly(),
    savedAt: savedAt.asReadonly(),
    flush: () => maybeSave(),
    destroy: () => {
      subscription.unsubscribe();
      manual$.complete();
    },
  };
}
