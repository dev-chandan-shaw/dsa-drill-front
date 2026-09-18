import { FormControl, FormGroup } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';

import { createAutoSave } from './auto-save';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function makeForm(value = ''): FormGroup {
  return new FormGroup({ note: new FormControl(value) });
}

describe('createAutoSave', () => {
  it('should stay idle without changes', async () => {
    let saves = 0;
    const handle = createAutoSave(makeForm('hi'), {
      debounceMs: 5,
      shouldSave: () => true,
      save: () => {
        saves++;
        return of({ ok: true });
      },
    });
    await sleep(25);
    expect(handle.state()).toBe('idle');
    expect(saves).toBe(0);
    handle.destroy();
  });

  it('should coalesce rapid typing into a single save', async () => {
    const seen: unknown[] = [];
    const form = makeForm('');
    const handle = createAutoSave(form, {
      debounceMs: 10,
      shouldSave: () => true,
      save: (value: unknown) => {
        seen.push(value);
        return of({ ok: true });
      },
    });
    form.controls['note'].setValue('a');
    form.controls['note'].setValue('ab');
    form.controls['note'].setValue('abc');
    expect(handle.state()).toBe('dirty');
    await sleep(40);
    expect(seen).toHaveLength(1);
    expect(handle.state()).toBe('saved');
    expect(handle.savedAt()).toBeTruthy();
    handle.destroy();
  });

  it('should not save when the value reverts to the snapshot', async () => {
    let saves = 0;
    const form = makeForm('orig');
    const handle = createAutoSave(form, {
      debounceMs: 5,
      shouldSave: () => true,
      save: () => {
        saves++;
        return of({ ok: true });
      },
    });
    form.controls['note'].setValue('changed');
    form.controls['note'].setValue('orig');
    await sleep(25);
    expect(saves).toBe(0);
    expect(handle.state()).toBe('idle');
    handle.destroy();
  });

  it('should skip invalid values but keep them dirty', async () => {
    let saves = 0;
    const form = makeForm('');
    const handle = createAutoSave(form, {
      debounceMs: 5,
      shouldSave: () => (form.getRawValue() as { note: string }).note.length >= 3,
      save: () => {
        saves++;
        return of({ ok: true });
      },
    });
    form.controls['note'].setValue('ab');
    await sleep(25);
    expect(saves).toBe(0);
    expect(handle.state()).toBe('dirty');
    handle.destroy();
  });

  it('should surface errors and retry via flush', async () => {
    let attempts = 0;
    const form = makeForm('');
    const handle = createAutoSave(form, {
      debounceMs: 5,
      shouldSave: () => true,
      save: (): Observable<unknown> => {
        attempts++;
        return attempts === 1 ? throwError(() => new Error('offline')) : of({ ok: true });
      },
    });
    form.controls['note'].setValue('hello');
    await sleep(25);
    expect(attempts).toBe(1);
    expect(handle.state()).toBe('error');
    handle.flush();
    await sleep(10);
    expect(attempts).toBe(2);
    expect(handle.state()).toBe('saved');
    handle.destroy();
  });

  it('should flush immediately without waiting for debounce', async () => {
    let saves = 0;
    const form = makeForm('');
    const handle = createAutoSave(form, {
      debounceMs: 5000,
      shouldSave: () => true,
      save: () => {
        saves++;
        return of({ ok: true });
      },
    });
    form.controls['note'].setValue('typed');
    handle.flush();
    await sleep(10);
    expect(saves).toBe(1);
    expect(handle.state()).toBe('saved');
    handle.destroy();
  });

  it('should stop reacting after destroy', async () => {
    let saves = 0;
    const form = makeForm('');
    const handle = createAutoSave(form, {
      debounceMs: 5,
      shouldSave: () => true,
      save: () => {
        saves++;
        return of({ ok: true });
      },
    });
    handle.destroy();
    form.controls['note'].setValue('late');
    await sleep(25);
    expect(saves).toBe(0);
  });
});
