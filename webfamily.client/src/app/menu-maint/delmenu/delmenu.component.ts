import { Component, OnInit, inject } from '@angular/core';
import { AbstractControlOptions, FormsModule, ReactiveFormsModule, UntypedFormBuilder, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SnackService } from '../../shared/services/snack.service';
import { MediaService } from '../../shared/services/media.service';
import { MenuServiceService } from '../../shared/services/menu-service.service';
import { AccountService } from '../../account/account.service';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-delmenu',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatInputModule, MatSelectModule, MatIconModule],
  templateUrl: './delmenu.component.html',
  styleUrls: ['./delmenu.component.scss']
})

export class DelmenuComponent implements OnInit {
  private mediaService = inject(MediaService);
  private menuService = inject(MenuServiceService);
  private toastr = inject(SnackService);
  private formBuilder = inject(UntypedFormBuilder);

  menuDataSource = this.menuService.menu;
  titleDataSource: any;
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
    if (this.menuViewValue != 'links') {
      this.menuService.getDirectoryList(this.menuDataSource()[this.menuSelectedIndex].recordId);
      this.titleDataSource = this.menuService.directory;
    }
    else {
      this.titleDataSource = this.menuService.linkMenu;
    }
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
    this.menuService.reloadMenu();
   
  };

  // convenience getter for easy access to form fields
  get f(): any { return this.form.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }
    this.submitting = true;
    if (this.menuViewValue != 'links') {
      this.removeMenuItem();
    }
    else {
      this.removeLink();
    }
    this.submitted = false;
    this.submitting = false;
  }
  private removeLink() {
    this.mediaService.RemoveLink(this.titleViewValue)
      .subscribe({
        next: (data: any) => {
          this.toastr.openSnackBar("Link item has been completed successfully", "Deleting");
          this.mediaService.RemoveLink(this.titleDataSource()[this.menuTitleSelectedIndex].directory)
          this.loadRecords();
        },
        error: (err) => {
          this.toastr.openSnackBar(err, "Warning");
        }
      })
  }
  private removeMenuItem() {
    this.mediaService.deleteMenuItem(this.titleDataSource()[this.menuTitleSelectedIndex].recordId)
      .subscribe({
        next: (data: any) => {
          this.toastr.openSnackBar("Menu item has been completed successfully", "Deleting");
          this.mediaService.RemoveLink(this.titleDataSource()[this.menuTitleSelectedIndex].directory)
          this.loadRecords();
        },
        error: (err) => {
          this.toastr.openSnackBar(err, "Warning");
        }
      })
  }
}

