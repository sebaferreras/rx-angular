import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AppRenderStrategy, ConfigService } from './config.service';

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  title = 'Tour of Heroes';

  constructor(
    private router: Router,
    private appRef: ApplicationRef,
    private configService: ConfigService
  ) {
    configService.setStrategy(AppRenderStrategy.local);
    router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => appRef.tick());
  }
}
