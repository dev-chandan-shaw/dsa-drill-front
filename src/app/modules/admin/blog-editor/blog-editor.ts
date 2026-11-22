import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { concatMap, finalize, Observable, take } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MarkdownNoteEditor } from '../../../shared/components/markdown-note-editor/markdown-note-editor';
import { CoverUploader } from '../../../shared/components/cover-uploader/cover-uploader';
import { AdminBlogSectionService } from '../services/admin-blog-section';
import { AdminBlogPostService } from '../services/admin-blog-post';
import { ToastService } from '../../../shared/services/toast-service';
import { ConfirmDialogService } from '../../../shared/services/confirm-dialog.service';
import { IBlogSection } from '../../../shared/models/blog-section';
import { IBlogPost, IBlogPostDto } from '../../../shared/models/blog-post';
import { slugify } from '../../../shared/utils/slugify';

/**
 * Dedicated Add/Edit Blog page: markdown body on the left, publishing
 * metadata on the right. Slugs auto-fill from the title while blank and lock
 * once the post is published so public links never break.
 */
@Component({
  selector: 'app-blog-editor',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MarkdownNoteEditor,
    CoverUploader,
  ],
  templateUrl: './blog-editor.html',
  styleUrl: './blog-editor.scss',
})
export class BlogEditor implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly adminSectionService = inject(AdminBlogSectionService);
  private readonly adminBlogPostService = inject(AdminBlogPostService);
  private readonly toastService = inject(ToastService);
  private readonly confirmationService = inject(ConfirmDialogService);

  readonly sections = signal<IBlogSection[]>([]);
  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly isPublishing = signal(false);
  readonly loadError = signal(false);
  readonly notFound = signal(false);
  readonly editingPostId = signal<number | null>(null);
  readonly published = signal(false);

  private activeEditId: number | null | undefined = undefined;
  private routeSubscribed = false;

  readonly blogForm = this.fb.group({
    title: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(2)]),
    slug: this.fb.nonNullable.control(''),
    sectionId: this.fb.control<number | null>(null, [Validators.required]),
    excerpt: this.fb.nonNullable.control(''),
    content: this.fb.nonNullable.control('', [Validators.required, Validators.minLength(5)]),
    coverImageUrl: this.fb.control<string | null>(null),
  });

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.blogForm.controls.title.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((title) => {
        const slug = this.blogForm.controls.slug;
        if (!slug.disabled && !slug.value.trim()) {
          slug.setValue(slugify(title), { emitEvent: false });
        }
      });

    this.adminSectionService
      .getAll()
      .pipe(take(1))
      .subscribe({
        next: (sections) => {
          this.sections.set(sections);
          this.subscribeToRoute();
        },
        error: () => {
          this.loadError.set(true);
          this.isLoading.set(false);
          this.toastService.showError('Unable to load sections');
        },
      });
  }

  save(): void {
    if (!this.canSave()) {
      return;
    }
    this.savePost()
      .pipe(take(1))
      .subscribe({
        next: () => this.toastService.showSuccess('Post saved'),
        error: () => this.toastService.showError('Unable to save post'),
      });
  }

  togglePublish(): void {
    if (this.isSaving() || this.isPublishing()) {
      return;
    }
    const editingId = this.editingPostId();

    if (editingId !== null && this.published()) {
      this.isPublishing.set(true);
      this.adminBlogPostService
        .unpublish(editingId)
        .pipe(
          finalize(() => this.isPublishing.set(false)),
          take(1),
        )
        .subscribe({
          next: (post) => {
            this.applyPublishState(post);
            this.toastService.showSuccess('Post unpublished');
          },
          error: () => this.toastService.showError('Unable to unpublish post'),
        });
      return;
    }

    if (!this.canSave()) {
      return;
    }
    this.isPublishing.set(true);
    const request$: Observable<IBlogPost> =
      editingId === null
        ? this.savePost().pipe(
            concatMap((saved) => this.adminBlogPostService.publish(saved.id)),
          )
        : this.blogForm.dirty
          ? this.savePost().pipe(
              concatMap(() => this.adminBlogPostService.publish(editingId)),
            )
          : this.adminBlogPostService.publish(editingId);
    request$.pipe(finalize(() => this.isPublishing.set(false)), take(1)).subscribe({
      next: (post) => {
        this.applyPublishState(post);
        this.blogForm.markAsPristine();
        this.toastService.showSuccess('Post published');
      },
      error: () => this.toastService.showError('Unable to publish post'),
    });
  }

  back(): void {
    if (this.blogForm.dirty) {
      this.confirmationService
        .confirm({
          title: 'Discard unsaved changes?',
          message: 'You have unsaved changes that will be lost.',
          confirmLabel: 'Discard',
        })
        .pipe(take(1))
        .subscribe((accepted) => {
          if (accepted) {
            this.goBackToList();
          }
        });
      return;
    }
    this.goBackToList();
  }

  private canSave(): boolean {
    if (this.blogForm.invalid) {
      this.blogForm.markAllAsTouched();
      return false;
    }
    if (this.isSaving()) {
      return false;
    }
    return true;
  }

  private savePost(): Observable<IBlogPost> {
    const value = this.blogForm.getRawValue();
    if (value.sectionId == null) {
      throw new Error('Choose a section');
    }
    const editingId = this.editingPostId();
    const payload: IBlogPostDto = {
      ...(editingId !== null ? { id: editingId } : {}),
      sectionId: value.sectionId,
      title: value.title,
      slug: value.slug || undefined,
      excerpt: value.excerpt || null,
      content: value.content,
      coverImageUrl: value.coverImageUrl || null,
    };

    this.isSaving.set(true);
    return this.adminBlogPostService.save(payload).pipe(
      finalize(() => this.isSaving.set(false)),
      concatMap((saved) => {
        this.blogForm.controls.slug.setValue(saved.slug, { emitEvent: false });
        this.blogForm.markAsPristine();
        this.published.set(saved.published);
        if (saved.published) {
          this.blogForm.controls.slug.disable({ emitEvent: false });
        }
        if (this.editingPostId() === null) {
          this.editingPostId.set(saved.id);
          this.activeEditId = saved.id;
          this.router.navigate(['/admin/blogs', saved.id, 'edit'], {
            replaceUrl: true,
          });
        }
        return [saved];
      }),
    );
  }

  private applyPublishState(post: IBlogPost): void {
    this.published.set(post.published);
    if (post.published) {
      this.blogForm.controls.slug.disable({ emitEvent: false });
    } else {
      this.blogForm.controls.slug.enable({ emitEvent: false });
    }
  }

  private subscribeToRoute(): void {
    if (this.routeSubscribed) {
      return;
    }
    this.routeSubscribed = true;
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawId = params.get('id');
      if (rawId === null) {
        this.enterNewMode();
        return;
      }
      const id = Number(rawId);
      if (!Number.isInteger(id)) {
        this.notFound.set(true);
        this.isLoading.set(false);
        return;
      }
      this.enterEditMode(id);
    });
  }

  private enterNewMode(): void {
    if (this.activeEditId === null) {
      return;
    }
    this.activeEditId = null;
    this.editingPostId.set(null);
    this.published.set(false);
    this.notFound.set(false);
    this.isLoading.set(false);
    this.blogForm.enable({ emitEvent: false });
    this.blogForm.reset({
      title: '',
      slug: '',
      sectionId: this.sections()[0]?.id ?? null,
      excerpt: '',
      content: '',
      coverImageUrl: null,
    });
  }

  private enterEditMode(id: number): void {
    if (this.activeEditId === id) {
      return;
    }
    this.isLoading.set(true);
    this.adminBlogPostService
      .getOne(id)
      .pipe(take(1))
      .subscribe({
        next: (post) => {
          this.activeEditId = id;
          this.editingPostId.set(id);
          this.published.set(post.published);
          this.notFound.set(false);
          this.blogForm.enable({ emitEvent: false });
          this.blogForm.reset({
            title: post.title,
            slug: post.slug,
            sectionId: post.sectionId,
            excerpt: post.excerpt ?? '',
            content: post.content,
            coverImageUrl: post.coverImageUrl,
          });
          if (post.published) {
            this.blogForm.controls.slug.disable({ emitEvent: false });
          }
          this.isLoading.set(false);
        },
        error: (err) => {
          if (err?.status === 404) {
            this.notFound.set(true);
          } else {
            this.loadError.set(true);
            this.toastService.showError('Unable to load post');
          }
          this.isLoading.set(false);
        },
      });
  }

  private goBackToList(): void {
    this.router.navigate(['/admin'], { queryParams: { tab: 'blogs' } });
  }
}
