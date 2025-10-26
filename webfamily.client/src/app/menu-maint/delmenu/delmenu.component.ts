import { Component, OnInit, inject } from '@angular/core';
import { AbstractControlOptions, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
//import { MediaService } from '../../shared/services/media.service';
import { MenuService } from '../../shared/services/menu.service';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-delmenu',
  imports: [FormsModule, ReactiveFormsModule, MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './delmenu.component.html',
  styleUrls: ['./delmenu.component.scss']
})

export class DelmenuComponent implements OnInit {
/*  private mediaService = inject(MediaService);*/
  private mService = inject(MenuService);
  private toastr = inject(SnackService);
  private formBuilder = inject(UntypedFormBuilder);

  menuDataSource = this.mService.getAvailableMenus();
  titleDataSource: any = [];
  menuSelectedIndex: number = -1;
  menuTitleSelectedIndex: number = -1;
  menuViewValue!: string;
  titleViewValue!: string;
  onTitleSelected(event: MatSelectChange): void {
    this.titleViewValue = event.source.triggerValue;
  }
  onMenuSelected(event: MatSelectChange): void {
    /*let value = event.value;*/
    this.menuViewValue = event.source.triggerValue;
    this.titleDataSource = this.mService.getMenuItems(this.menuViewValue);
  }

  form!: UntypedFormGroup;
  ftitle = new UntypedFormControl(null, [Validators.required]);
  fmenu = new UntypedFormControl(null, [Validators.required]);
  submitted: boolean = false;
  submitting: boolean = false;
  ngOnInit() {
    this.form = this.formBuilder.group({
      menuId: this.fmenu,
      titleId: this.ftitle
    } as AbstractControlOptions
    );
    this.loadRecords();
  }
  // Get employees list
  async loadRecords(): Promise<void> {
    this.form.reset();
    this.mService.refreshAllMenus();
   
  };

  // convenience getter for easy access to form fields
  get f(): any { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;
    this.deleteMenuItem();
    this.submitted = false;
    this.submitting = false;
  }
  async deleteMenuItem(): Promise<void> {
    const menuId = this.titleDataSource[this.menuTitleSelectedIndex].title;
    const success = await this.mService.removeMenuItem(this.menuViewValue, menuId);
    console.log('Remove book item result:', success);
    if (success) {
      this.menuTitleSelectedIndex = -1;
      this.titleDataSource = this.mService.getMenuItems(this.menuViewValue);
    }
  }
}

