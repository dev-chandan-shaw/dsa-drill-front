import { Injectable, TemplateRef } from '@angular/core';

export interface RightPaneContext {
  title: string;
  data: any;
}

export enum RightPaneSize {
  MOBILE = 'mobile',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
}

export enum PaneSide {
  RIGHT = 'right',
  LEFT = 'left',
}

@Injectable({
  providedIn: 'root',
})
export class RightPaneService {
  template?: TemplateRef<any>;
  context?: any;
  isOpen = false;
  title = '';
  size: RightPaneSize = RightPaneSize.MEDIUM;
  side: PaneSide = PaneSide.RIGHT;
  /**
   * When true the sidenav ignores backdrop clicks and Escape, so unsaved
   * editor content (notes, patterns) can't be dismissed accidentally.
   * Explicit Save/Cancel buttons keep working.
   */
  disableClose = false;

  open(
    template: TemplateRef<any>,
    size?: RightPaneSize,
    options?: {
      title?: string;
      context?: any;
      side?: PaneSide;
      disableClose?: boolean;
    },
  ) {
    this.template = template;
    this.title = options?.title ?? '';
    this.context = options?.context ?? {};
    this.isOpen = true;
    this.size = size ?? RightPaneSize.SMALL;
    this.side = options?.side ?? PaneSide.RIGHT;
    this.disableClose = options?.disableClose ?? false;
  }

  /**
   * Starts closing the pane. Presentation state (template, side, title) is
   * deliberately kept so the slide-out animation runs from the correct edge
   * with its content intact. The host calls {@link completeClose} once the
   * animation finishes.
   */
  close(): void {
    this.isOpen = false;
  }

  /** Clears pane state after the close animation completes. Safe to call twice. */
  completeClose(): void {
    if (this.isOpen) {
      return;
    }
    this.template = undefined;
    this.context = undefined;
    this.title = '';
    this.side = PaneSide.RIGHT;
    this.disableClose = false;
  }
}
