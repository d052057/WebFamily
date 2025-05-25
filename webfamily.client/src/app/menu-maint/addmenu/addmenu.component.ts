import { Component, OnDestroy, OnInit, Signal, ViewEncapsulation, inject, linkedSignal, signal } from '@angular/core';
import { AbstractControl, AbstractControlOptions, FormControl, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
import { MediaService } from '../../shared/services/media.service';
import { AccountService } from '../../account/account.service';
import { MenuServiceService } from '../../shared/services/menu-service.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { languages } from '../../../app/models/languages';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { rxResource } from '@angular/core/rxjs-interop';
import { menuType } from '../../models';
import { VoiceDirective } from '../../../app/shared/directives/voice.directive';
import { SvgIconService } from '../../shared/services/svg-icon.service';

@Component({
  selector: 'app-addmenu',
  imports: [CommonModule, VoiceDirective, FormsModule, ReactiveFormsModule, MatSelectModule, MatInputModule, MatIconModule],
  templateUrl: './addmenu.component.html',
  styleUrls: ['./addmenu.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AddmenuComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private toastr = inject(SnackService);
  private accountService = inject(AccountService);
  private menuService = inject(MenuServiceService);
  private formBuilder = inject(UntypedFormBuilder);
  svgIconService = inject(SvgIconService);
  menuSelectedIndex: number = -1;
  menuViewValue!: string;
  langData = languages;
  langSelected: number = 0;
  langPlaceHolder: string = this.langData[this.langSelected].search;
  isUserSpeaking: boolean = false;

  photoMenu = this.menuService.photoMenu;
  bookMenu = this.menuService.bookMenu;
  linkMenu = this.menuService.linkMenu;
  videoMenu = this.menuService.videoMenu;
  movieMenu = this.menuService.movieMenu;
  musicMenu = this.menuService.musicMenu;
  menu = this.menuService.menu;
  menuData: Signal<any | undefined> = signal(undefined);
  form!: UntypedFormGroup;
  submitted: boolean = false;
  submitting: boolean = false;
  ftitle = new UntypedFormControl(null, [Validators.required, this.validateTitle()]);
  fmenu = new UntypedFormControl(null, [Validators.required]);
  fparam = new UntypedFormControl(null, [Validators.required, this.validateFolder()]);
  fdata = new UntypedFormControl([]);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      menu: this.fmenu,
      menuTitle: this.ftitle,
      param: this.fparam
    } as AbstractControlOptions
    );

  };
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  onMenuSelected(event: MatSelectChange): void {
    this.menuViewValue = event.source.triggerValue;
    switch (this.menuViewValue) {
      case 'movies':
        this.menuData = this.menuService.movieMenu;
        break;
      case 'musics':
        this.menuData = this.menuService.musicMenu;
        break;
      case 'books':
        this.menuData = this.menuService.bookMenu;
        break;
      case 'photos':
        this.menuData = this.menuService.photoMenu;
        break;
      case 'videos':
        this.menuData = this.menuService.videoMenu;
        break;
      case 'links':
        this.menuData = this.menuService.linkMenu;
        break;
      default:
        /* this.menuData = [];*/
        break;
    }
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      this.submitted = false;
      return;
    }
    if (this.menuViewValue == 'links') {
      this.submitting = true;
      let record = {
        Id: 0,
        title: this.form.value.menuTitle,
        param: this.form.value.param
      }

      this.mediaService.AddLink(record)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data: any) => {
            this.toastr.openSnackBar("has been completed successfully", "adding");
            this.form.reset();
          },
          error: (err) => {
            this.toastr.openSnackBar(err, "Warning");
          }
        })
    }
    else {
      this.submitting = true;
      let record = {
        recordId: this.menu()?.[this.menuSelectedIndex]?.recordId,
        title: this.form.value.menuTitle,
        param: this.form.value.param
      }

      this.mediaService.createMenuItem(record)
        .pipe(takeUntil(this.destroy$))
        .subscribe(
          {
            next: (data: any) => {
              this.toastr.openSnackBar("has been completed successfully", "adding");
              this.form.reset();
            },
            error: (err) => {
              this.toastr.openSnackBar("Error adding", "adding");
            }
          })
    }
    this.submitted = false;
    this.submitting = false;
  };

  // convenience getter for easy access to form fields
  get f(): any { return this.form.controls; }

  validateTitle(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      if (control.value != null && this.menuData()?.length) {

        let i: number = 0;
        for (i = 0; i < this.menuData()?.length; i++) {
          let m = this.menuData()[i]?.title;
          if (m.toLowerCase() === control.value.toLowerCase()) {
            return { 'existed': true }
          }
        }
      }
      return null;
    }
  }
  validateFolder(): ValidatorFn {
    return (control: AbstractControl): { [key: string]: boolean } | null => {
      if (control.value != null && this.menuData()?.length) {

        let i: number = 0;
        for (i = 0; i < this.menuData()?.length; i++) {
          let m = this.menuData()[i]?.param;
          if (m.toLowerCase() === control.value.toLowerCase()) {
            return { 'existed': true }
          }
        }
      }
      return null;
    }
  }

  onLangSelectChange(event: any) {
    this.langPlaceHolder = this.langData[this.langSelected].search;
  }
  checkMic(): void {
    this.isUserSpeaking = !this.isUserSpeaking;
  }
  onVoiceInput(transcript: string | any) {
    let currentText = this.form.value.menuTitle ?? '' + ' ' + transcript;
    this.form.patchValue({
      menuTitle: currentText.trim()
    });
  }
}
