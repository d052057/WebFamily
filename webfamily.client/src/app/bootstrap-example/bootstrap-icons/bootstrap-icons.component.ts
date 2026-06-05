
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
@Component({
  selector: 'app-bootstrap-icons',
  imports: [],
  templateUrl: './bootstrap-icons.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './bootstrap-icons.component.scss'
})
export class BootstrapIconsComponent implements OnInit {
  private http = inject(HttpClient);
  icons: any = [];
  ngOnInit(): void {
    this.getIcons()
      .subscribe({
        next: (data: any) => {
          for (var i in data) {
            this.icons.push([i]);
          }
        },
        error: (err: Error) => { console.error(err) }
      });
  }
  getIcons(): any {
    return this.http.get<any>("/assets/bootstrap-icons.json")
  }
}
