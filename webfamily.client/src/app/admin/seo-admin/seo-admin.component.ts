import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SeoAdminService, SeoData } from '../../shared/services/seo-admin';

@Component({
  selector: 'app-seo-admin',
  templateUrl: './seo-admin.component.html',
  styleUrls: ['./seo-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ReactiveFormsModule]
})
export class SeoAdminComponent implements OnInit {
  seoAdminService = inject(SeoAdminService);
  seoDataList: any = {};
  seoKeys: string[] = [];

  selectedKey: string = '';
  isEditing: boolean = false;
  isCreating: boolean = false;

  seoForm: FormGroup;

  loading: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' = 'success';

  constructor(
    private fb: FormBuilder
  ) {
    this.seoForm = this.fb.group({
      key: ['', Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      keywords: ['', Validators.required],
      image: [''],
      type: ['website'],
      languagesJson: ['']
    });
  }

  ngOnInit() {
    this.loadAllSeoData();
  }

  loadAllSeoData() {
    this.loading = true;
    this.seoAdminService.getAllSeoData().subscribe({
      next: (data) => {
        this.seoDataList = data;
        this.seoKeys = Object.keys(data);
        this.loading = false;
        this.showMessage('SEO data loaded successfully', 'success');
      },
      error: (error) => {
        console.error('Error loading SEO data:', error);
        this.loading = false;
        this.showMessage('Error loading SEO data', 'error');
      }
    });
  }

  selectKey(key: string) {
    this.selectedKey = key;
    this.isEditing = false;
    this.isCreating = false;

    const data = this.seoDataList[key];
    if (data) {
      this.seoForm.patchValue({
        key: key,
        title: data.title,
        description: data.description,
        keywords: data.keywords,
        image: data.image || '',
        type: data.type || 'website',
        languagesJson: data.languages ? JSON.stringify(data.languages, null, 2) : ''
      });
    }
  }

  startEdit() {
    if (!this.selectedKey) {
      this.showMessage('Please select an entry to edit', 'error');
      return;
    }
    this.isEditing = true;
    this.isCreating = false;
  }

  startCreate() {
    this.isCreating = true;
    this.isEditing = false;
    this.selectedKey = '';
    this.seoForm.reset({
      key: '',
      title: '',
      description: '',
      keywords: '',
      image: '',
      type: 'website',
      languagesJson: ''
    });
  }

  cancelEdit() {
    this.isEditing = false;
    this.isCreating = false;
    if (this.selectedKey) {
      this.selectKey(this.selectedKey);
    } else {
      this.seoForm.reset();
    }
  }

  saveSeoData() {
    if (this.seoForm.invalid) {
      this.showMessage('Please fill all required fields', 'error');
      return;
    }

    const formValue = this.seoForm.value;
    const seoData: SeoData = {
      title: formValue.title,
      description: formValue.description,
      keywords: formValue.keywords,
      image: formValue.image,
      type: formValue.type
    };

    // Parse languages JSON if provided
    if (formValue.languagesJson) {
      try {
        seoData.languages = JSON.parse(formValue.languagesJson);
      } catch (e) {
        this.showMessage('Invalid JSON format for languages', 'error');
        return;
      }
    }

    this.loading = true;

    if (this.isCreating) {
      // Create new entry
      this.seoAdminService.createSeoData(formValue.key, seoData).subscribe({
        next: (response) => {
          this.showMessage('SEO entry created successfully', 'success');
          this.loading = false;
          this.isCreating = false;
          this.loadAllSeoData();
          this.clearSeoCache();
        },
        error: (error) => {
          console.error('Error creating SEO data:', error);
          this.showMessage('Error creating SEO entry', 'error');
          this.loading = false;
        }
      });
    } else {
      // Update existing entry
      this.seoAdminService.updateSeoData(formValue.key, seoData).subscribe({
        next: (response) => {
          this.showMessage('SEO entry updated successfully', 'success');
          this.loading = false;
          this.isEditing = false;
          this.loadAllSeoData();
          this.clearSeoCache();
        },
        error: (error) => {
          console.error('Error updating SEO data:', error);
          this.showMessage('Error updating SEO entry', 'error');
          this.loading = false;
        }
      });
    }
  }

  deleteSeoData() {
    if (!this.selectedKey) {
      this.showMessage('Please select an entry to delete', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to delete SEO entry: ${this.selectedKey}?`)) {
      return;
    }

    this.loading = true;
    this.seoAdminService.deleteSeoData(this.selectedKey).subscribe({
      next: (response) => {
        this.showMessage('SEO entry deleted successfully', 'success');
        this.loading = false;
        this.selectedKey = '';
        this.seoForm.reset();
        this.loadAllSeoData();
        this.clearSeoCache();
      },
      error: (error) => {
        console.error('Error deleting SEO data:', error);
        this.showMessage('Error deleting SEO entry', 'error');
        this.loading = false;
      }
    });
  }

  backupSeoData() {
    this.loading = true;
    this.seoAdminService.backupSeoData().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `seo-data-backup-${new Date().toISOString()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.showMessage('Backup downloaded successfully', 'success');
        this.loading = false;
      },
      error: (error) => {
        console.error('Error backing up SEO data:', error);
        this.showMessage('Error creating backup', 'error');
        this.loading = false;
      }
    });
  }

  clearSeoCache() {
  }

  showMessage(message: string, type: 'success' | 'error') {
    this.message = message;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}
