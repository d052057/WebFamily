import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotFoundComponent } from './components/errors/not-found/not-found.component';
import { ValidationMessagesComponent } from './components/errors/validation-messages/validation-messages.component';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NotificationComponent } from './components/modals/notification/notification.component';
import { ModalModule } from 'ngx-bootstrap/modal';
import { UserHasRoleDirective } from './directives/user-has-role.directive';
import { SocialMediaComponent } from './components/social-media/social-media.component';


@NgModule({
    exports: [
        RouterModule,
        ReactiveFormsModule,
        ValidationMessagesComponent,
        UserHasRoleDirective,
        SocialMediaComponent
    ],
    imports: [
        CommonModule,
        RouterModule,
        ReactiveFormsModule,
        ModalModule.forRoot(),
        NotFoundComponent,
        ValidationMessagesComponent,
        NotificationComponent,
        UserHasRoleDirective,
        SocialMediaComponent
    ], providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class SharedModule { }
