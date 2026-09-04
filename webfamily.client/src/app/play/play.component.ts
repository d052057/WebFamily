import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
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

  message = signal<string | undefined>(undefined);

  ngOnInit(): void {
    this.playService.getPlayers().subscribe({
      next: (respose: any) => this.message.set(respose.value.message),
      error: error => console.log(error)
    })
  }

}
