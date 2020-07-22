import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  Optional
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  isObservable,
  Observable,
  of,
  Subject,
  Subscription
} from 'rxjs';
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  map,
  mergeAll,
  take,
  tap
} from 'rxjs/operators';
import { getZoneUnPatchedApi } from '../../core';
import { LetDirective } from '../../let';

/**
 *
 * @description
 *
 * This function takes an elem and event and re-applies the listeners from the passed event to the
 * passed element with the zone un-patched version of it.
 *
 * @param elem {HTMLElement} - The elem to re-apply the listeners to.
 * @param event {string} - The name of the event from which to re-apply the listeners.
 *
 * @returns void
 */
function unpatchEventListener(elem: HTMLElement, event: string): void {
  const eventListeners = (elem as any).eventListeners(event);
  // Return if no event listeners are present
  if (!eventListeners) {
    return;
  }

  const addEventListener = getZoneUnPatchedApi('addEventListener', elem).bind(
    elem
  );
  eventListeners.forEach(listener => {
    // Remove and reapply listeners with patched API
    elem.removeEventListener(event, listener);
    // Reapply listeners with un-patched API
    addEventListener(event, listener);
  });
}

function intersectionObserver(
  options?: object
): {
  observe: (target: Element) => void;
  unobserve: (target: Element) => void;
  entries$: Observable<any>;
} {
  const subject = new Subject();
  const observer = observerSupported()
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => subject.next(entry));
      }, options)
    : null;

  const entries$ = new Observable(subscriber => {
    subject.subscribe(subscriber);
    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  return {
    entries$,
    observe: observer.observe,
    unobserve: observer.unobserve
  };
}

const observerSupported = () =>
  typeof window !== 'undefined'
    ? !!(window as any).IntersectionObserver
    : false;

@Directive({
  // tslint:disable-next-line:directive-selector
  selector: '[viewport-prio]'
})
export class ViewportPrioDirective implements OnInit, OnDestroy {
  entriesSubject = new Subject<IntersectionObserverEntry[]>();
  entries$: Observable<IntersectionObserverEntry> = this.entriesSubject.pipe(
    mergeAll()
  );

  visiblePrio$ = this.letDirective.renderAware.activeStrategy$.pipe(take(1));
  invisiblePrioSubject = new BehaviorSubject(of('noop'));
  invisiblePrio$ = this.invisiblePrioSubject.pipe(mergeAll());

  _viewportPrio = 'noop';
  @Input('viewport-prio')
  set viewportPrio(prio) {
    if (prio) {
      this.invisiblePrioSubject.next(isObservable(prio) ? prio : of(prio));
      this._viewportPrio = prio || 'noop';
    }
  }

  // tslint:disable-next-line:no-input-rename
  @Input('viewport-prio-root') rootElement: HTMLElement | null;

  private observer: IntersectionObserver | null;

  visibilityEvents$ = this.entries$.pipe(
    // TODO: investigate more
    // tap(console.log),
    // TODO: IntersectionObserver has to be configured correctly, otherwise this will fire A LOT
    filter(entry => !!entry.rootBounds),
    map(entry => {
      if (entry.intersectionRatio > 0) {
        return 'visible';
      } else {
        return 'invisible';
      }
    }),
    distinctUntilChanged()
  );

  private eventSub = Subscription.EMPTY;
  private prioChanged = false;

  constructor(
    private readonly el: ElementRef,
    @Optional() private letDirective: LetDirective<any>
  ) {}

  ngOnInit() {
    this.observer = observerSupported()
      ? new IntersectionObserver(entries => this.entriesSubject.next(entries), {
          threshold: 0,
          root: this.rootElement
        })
      : null;

    if (this.observer) {
      this.observer.observe(this.el.nativeElement);

      this.eventSub = combineLatest([
        this.visibilityEvents$.pipe(
          tap(n => console.log('visibilityEvents: ', n))
        ),
        this.letDirective.renderAware.activeStrategy$.pipe(
          filter(() => !this.prioChanged),
          tap(n => console.log('activeStrategy: ', n))
        ),
        this.invisiblePrio$.pipe(
          tap(n => console.log('invisiblePrio: ', n)),
          map(s => this.letDirective.strategies[s])
        )
      ])
        .pipe(
          map(([visibility, visiblePrio, invisiblePrio]) =>
            visibility === 'visible' ? visiblePrio : invisiblePrio
          ),
          distinctUntilKeyChanged('name')
        )
        .subscribe(strategy => {
          // TODO: this is kind of hacky, but works
          this.prioChanged = true;
          this.letDirective.strategy = strategy.name;
          this.prioChanged = false;
          console.log('name: ', strategy.name);
          // render actual state on viewport enter
          // strategy.scheduleCD();
          // this.el.nativeElement.classList.add(strategyName);
        });
    }
  }

  ngOnDestroy() {
    this.eventSub.unsubscribe();
  }
}
