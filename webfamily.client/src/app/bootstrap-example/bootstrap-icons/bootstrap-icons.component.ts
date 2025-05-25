import { NgFor } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
@Component({
  selector: 'app-bootstrap-icons',
  imports: [NgFor],
  templateUrl: './bootstrap-icons.component.html',
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
    return this.http.get<any>("/json/bootstrap-icons.json")
  }
}
