import { CommonModule } from '@angular/common';
import { Component, computed, input, viewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableModule} from '@angular/material/table'
@Component({
    selector: 'app-mattable-view',
    imports: [CommonModule, MatTableModule],
    templateUrl: './mattable-view.component.html',
    styleUrl: './mattable-view.component.scss'
})
export class MattableViewComponent {
  readonly sort = viewChild.required(MatSort);
  data = input.required<any>();
  columns = input.required<any>();
  displayedColumns = computed(() => { this.columns().map((col: any) => col.name) })
}
