import { Component, input } from '@angular/core';

@Component({
    selector: 'app-add-series',
    imports: [],
    templateUrl: './add-series.component.html',
    styleUrl: './add-series.component.scss'
})
export class AddSeriesComponent {
  series = input<any[]>([]);
}
