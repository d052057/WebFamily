import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HomeComponent } from './home.component';
import { HeroComponent } from './hero/hero.component';
import { RouterModule } from '@angular/router';
import { TodoListComponent } from '../todo/todo-list/todo-list.component';
@NgModule({
    imports: [
        CommonModule,
        TodoListComponent,
        RouterModule.forChild([
            { path: '', component: HomeComponent }
        ]),
        HomeComponent,
        HeroComponent
    ]
})
export class HomeModule { }
