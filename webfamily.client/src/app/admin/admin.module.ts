import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { AddEditMemberComponent } from './add-edit-member/add-edit-member.component';
import { SharedModule } from '../shared/shared.module';
import { SeoAdminComponent } from './seo-admin/seo-admin.component';


@NgModule({
    imports: [
        CommonModule,
        AdminRoutingModule,
        SharedModule,
        AdminComponent,
        AddEditMemberComponent,
        SeoAdminComponent
    ]
})
export class AdminModule { }
