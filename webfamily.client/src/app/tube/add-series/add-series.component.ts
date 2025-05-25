import { Component, input, Input } from '@angular/core';
import { CommonModule } from '@angular/common'
@Component({
    selector: 'app-add-series',
    imports: [CommonModule],
    templateUrl: './add-series.component.html',
    styleUrl: './add-series.component.scss'
})
export class AddSeriesComponent {
  series = input<any[]>([]);
}
