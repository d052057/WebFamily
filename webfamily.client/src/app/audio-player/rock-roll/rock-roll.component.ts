import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterOutlet } from '@angular/router';
import { AmericanMusicsDirectoryViews } from '../../models';
import { RockRollService } from './rock-roll.service';
import { environment } from '../../../environments/environment';
import { languages } from '../../../app/models/languages'
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BehaviorSubject, finalize, Subject, Subscription, takeUntil } from 'rxjs';
import { NgxPaginationModule } from 'ngx-pagination';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input'
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { SvgIconService } from '../../shared/services/svg-icon.service';

@Component({
  selector: 'app-rock-roll',
  imports: [CommonModule, VoiceDirective, MatIconModule, MatSelectModule, MatInputModule, RouterOutlet, FormsModule, NgxPaginationModule, ReactiveFormsModule],
  templateUrl: './rock-roll.component.html',
  styleUrl: './rock-roll.component.scss'
})
export class RockRollComponent implements OnInit, OnDestroy {
  public isUserSpeaking: boolean = false;
  private svgIconService = inject(SvgIconService);
  router = inject(Router);
  activatedRouter = inject(ActivatedRoute);
  service = inject(RockRollService);
  langData = languages;
  langSelected: number = 1;
  langSearch: string = this.langData[1].search;
  fileDir!: string;
  medias = environment.mediaConfig.medias;
  menuFolder!: string;
  menuSubFolder!: string;
  currentFolderIndex: number = -1;
  searchVal = signal('');
  currentPage = signal(1);
  itemsPerPage = signal(10);
  private destroy$ = new Subject<void>();
  artist!: string;
  
  resource = this.service.rockDirectoryResource;
  filteredData = computed(() => {
    const searchStr = (this.searchVal() || '').toLowerCase();
    const allData = this.resource.value() || [];
    return allData ? allData.filter((item: any) => {
      return item.directory?.toLowerCase().includes(searchStr); // Return true or false based on condition
    }) : [];
  });
  ngOnInit(): void {
    this.activatedRouter.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(
        (params: any) => {
          this.menuFolder = params.get('menu');
          this.menuSubFolder = params.get('folder');
          this.artist = params.get('artist');
          this.fileDir = this.medias + "/" + this.menuFolder + "/" + this.menuSubFolder + "/";
        }
      );
  }
  playRock(folder: string, index: number) {
    this.currentFolderIndex = index;
    let f = folder.split("\\");
    let ff = f.join("/");
    let fileFolder = encodeURIComponent(this.menuSubFolder + "/" + ff);
    this.router.navigate([this.menuFolder, fileFolder, this.artist],
      {
        relativeTo: this.activatedRouter
      })
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  onLangSelectChange(event: any) {
    this.langSearch = this.langData[this.langSelected].search;
  }

  /*Voice Recognation*/
  onSearch(searchStr: string) {
    this.searchVal.set(searchStr);
    this.currentPage.set(1);
  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.searchVal() + ' ' + transcript;
    this.searchVal.set(currentText.trim());
  }
  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }
}
