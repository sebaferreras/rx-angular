import { Directive, ElementRef, Input, OnInit, Optional } from '@angular/core';
import { BehaviorSubject, isObservable, Observable, of, Subject } from 'rxjs';
import { map, mergeAll, take, tap, withLatestFrom } from 'rxjs/operators';
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
export class ViewportPrioDirective implements OnInit {
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

  private observer: IntersectionObserver | null = observerSupported()
    ? new IntersectionObserver(entries => this.entriesSubject.next(entries), {
        threshold: 0
      })
    : null;

  visibilityEvents$ = this.entries$.pipe(
    map(entry => {
      if (entry.intersectionRatio > 0) {
        return 'visible';
      } else {
        return 'invisible';
      }
    })
  );

  constructor(
    private readonly el: ElementRef,
    @Optional() private letDirective: LetDirective<any>
  ) {}

  ngOnInit() {
    const visiblePrio$ = this.letDirective.renderAware.activeStrategy$.pipe(
      take(1),
      tap(v => console.log('v', v))
    );

    this.observer.observe(this.el.nativeElement);

    this.visibilityEvents$
      .pipe(
        tap(n => console.log('visibilityEvents: ', n)),
        withLatestFrom(
          visiblePrio$,
          this.invisiblePrio$.pipe(map(s => this.letDirective.strategies[s]))
        ),
        map(([visibility, visiblePrio, invisiblePrio]) =>
          visibility === 'visible' ? visiblePrio : invisiblePrio
        )
      )
      .subscribe(strategy => {
        this.letDirective.strategy = strategy.name;
        console.log('name: ', strategy.name);
        // render actual state on viewport enter
        // strategy.scheduleCD();
        // this.el.nativeElement.classList.add(strategyName);
      });
  }
}
