import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { concat, interval, NEVER, Observable, Subject, timer } from 'rxjs';
import { getStrategies } from '@rx-angular/template';
import { RxState } from '@rx-angular/state';
import { map, mapTo } from 'rxjs/operators';

@Component({
  selector: 'demo-basics',
  template: `
    <button unpatch (click)="reset.next()">Reset</button>
    <button unpatch (click)="next.next()">Next</button>
    <button unpatch (click)="error.next()">Error</button>
    <button unpatch (click)="complete.next()">Complete</button>
    <rx-angular-num-render></rx-angular-num-render>
    <br />

    {{ value$ | push: 'local' | json }}

    <ng-container
      *rxLet="
        value$;
        let value;
        let e = error;
        let c = complete;
        suspense: suspenseView;
        error: errorView;
        complete: completeView
      "
    >
      next: {{ value | json }}<br />
    </ng-container>

    <ng-template #suspenseView>
      <ngx-skeleton-loader></ngx-skeleton-loader>
      <ngx-skeleton-loader></ngx-skeleton-loader>
    </ng-template>

    <ng-template #errorView>
      <mat-icon>delete</mat-icon>
    </ng-template>

    <ng-template #completeView>
      <mat-icon>check</mat-icon>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RxState]
})
export class MemoizedViewsComponent {
  reset = new Subject();
  next = new Subject();
  error = new Subject();
  complete = new Subject();

  strategy$ = new Subject();
  strategies = Object.keys(getStrategies({ cdRef: { context: {} } } as any));

  value$ = new Subject();

  constructor(private s: RxState<any>, cdRef: ChangeDetectorRef) {
    this.s.hold(this.reset, () => {
      this.value$ = new Subject();
      cdRef.detectChanges();
    });

    this.s.hold(this.next, () => {
      this.value$.next({ name: 42, age: Math.random() });
    });

    this.s.hold(this.error, () => {
      this.value$.error(new Error('Boom!!!'));
    });

    this.s.hold(this.complete, () => {
      this.value$.complete();
    });
  }
}
