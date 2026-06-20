import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { PlayService } from './play.service';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-play',
    templateUrl: './play.component.html',
    styleUrls: ['./play.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule]
})
export class PlayComponent implements OnInit{
  private playService = inject(PlayService);

  message: string | undefined;

  ngOnInit(): void {
    this.playService.getPlayers().subscribe({
      next: (respose: any) => this.message = respose.value.message,
      error: error => console.log(error)
    })
  }

}
