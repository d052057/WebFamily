import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideZoneChangeDetection, provideBrowserGlobalErrorListeners } from '@angular/core';
import { FacebookService } from './shared/services/facebook.service';
import { routes } from './app.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withXhr } from '@angular/common/http';
import { BrowserModule, DomSanitizer } from '@angular/platform-browser';
import { SharedModule } from './shared/shared.module';
import { HomeModule } from './home/home.module';
import { TodoModule } from './todo/todo.module';
import { NgxExtendedPdfViewerModule } from 'ngx-extended-pdf-viewer';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MessageService } from './shared/services/message.service';
import { JwtInterceptor } from './shared/interceptors/jwt.interceptor';
import { LoadingInterceptor } from './shared/interceptors/loading.interceptor';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTimepickerModule } from '@angular/material/timepicker';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { MenuService } from './shared/services/menu.service';
import { provideRouter, withPreloading, NoPreloading } from '@angular/router';
import { ModalModule } from 'ngx-bootstrap/modal';
export function initializeApp(menuService: MenuService): () => Promise<void> {
  return () => new Promise<void>((resolve) => {
    // Give the service a moment to initialize
    setTimeout(() => resolve(), 100);
  });
}
function initializeIcons() {

  const iconRegistry = inject(MatIconRegistry);
  const sanitizer = inject(DomSanitizer);

  iconRegistry.addSvgIcon('kh', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/4x3/kh.svg'));
  iconRegistry.addSvgIcon('us', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/4x3/us.svg'));
  iconRegistry.addSvgIcon('logo', sanitizer.bypassSecurityTrustResourceUrl('assets/svg-icons/logo.svg'),
    { viewBox: '0 0 120 120' }
  );

}
export function initializeFacebookSdk() {
  return () => {
    const fb = inject(FacebookService);
    fb.loadSdk()
  };
}
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withPreloading(NoPreloading)),
    provideHttpClient(withXhr(),  withInterceptorsFromDi()),
    provideAppInitializer((initializeFacebookSdk)()),
    provideAppInitializer(initializeIcons),
    importProvidersFrom(
      ModalModule,
      BrowserModule,
      SharedModule,
      HomeModule,
      TodoModule,
      NgxExtendedPdfViewerModule,
      FormsModule, // Only once
      ReactiveFormsModule,
      MatDatepickerModule,
      MatNativeDateModule,
      MatFormFieldModule,
      MatInputModule,
      MatTimepickerModule,
      MatIconModule
    ),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: LoadingInterceptor,
      multi: true
    },
    MessageService,
    MenuService
  ]
};

