import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RightPaneContainer } from './right-pane-container';

describe('RightPaneContainer', () => {
  let component: RightPaneContainer;
  let fixture: ComponentFixture<RightPaneContainer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RightPaneContainer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RightPaneContainer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
