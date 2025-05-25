import { Component, OnInit } from '@angular/core';
import { TodoListComponent } from '../../todo/todo-list/todo-list.component';
import { fadeInOut } from '../../shared/services/animations';
import { NgFor } from '@angular/common';
@Component({
  selector: 'app-hero',
  templateUrl: './hero.component.html',
  styleUrls: ['./hero.component.scss'],
  animations: [fadeInOut],
  imports: [NgFor, TodoListComponent]
})
export class HeroComponent implements OnInit {

  dayName!: string;
  dayNumber!: string;
  monthName!: string;
  order!: string;

  items: any[] = ['/images/family/yitong.jpg',
    '/images/family/sotheary.jpg',
    '/images/family/keith.jpg',
    '/images/family/langley.jpg',
    '/images/family/kody.jpg',
    '/images/family/calida.jpg'
  ]
  constructor() { }

  ngOnInit(): void {
    this.setupCalendar();
  }

  setupCalendar() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    var _order = 'th';
    switch (new Date().getDate()) {
      case 1:
      case 11:
      case 21:
      case 31:
        _order = 'st';
        break;
      case 2:
      case 12:
      case 22:
        _order = 'nd';
        break;
      case 3:
      case 13:
        _order = 'rd';
        break;
    }
    this.order = _order;
    this.dayName = dayNames[new Date().getDay()];
    this.dayNumber = new Date().getDate().toString();
    this.monthName = monthNames[new Date().getMonth()];
  }

}
