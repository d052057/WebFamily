import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ThaiAudioPlayerComponent } from './thai-audio-player/thai-audio-player.component';
import { RockRollComponent } from './rock-roll/rock-roll.component';

const routes: Routes = [
  {
    path: 'thaiaudio/:menu/:folder/:artist',
    component: ThaiAudioPlayerComponent
  },
  {
    path: 'songs/:menu/:folder/:artist',
    component: RockRollComponent,
    children: [{
      path: ':menu/:folder/:artish',
      component: ThaiAudioPlayerComponent
    }]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AudioPlayerRoutingModule { }
