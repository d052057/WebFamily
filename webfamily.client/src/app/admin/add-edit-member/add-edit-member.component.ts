import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AdminService } from '../admin.service';
import { SharedService } from '../../shared/shared.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MemberAddEdit } from '../../shared/models/admin/memberAddEdit';
import { NgIf, NgFor } from '@angular/common';
import { ValidationMessagesComponent } from '../../shared/components/errors/validation-messages/validation-messages.component';

@Component({
    selector: 'app-add-edit-member',
    templateUrl: './add-edit-member.component.html',
    styleUrls: ['./add-edit-member.component.css'],
    imports: [NgIf, ReactiveFormsModule, NgFor, ValidationMessagesComponent, RouterLink]
})
export class AddEditMemberComponent implements OnInit {
  private adminService = inject(AdminService);
  private sharedService = inject(SharedService);
  private formBuilder = inject(FormBuilder);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);

  memberForm: FormGroup = new FormGroup({});
  formInitialized = false;
  addNew = true;
  submitted = false;
  errorMessages: string[] = [];
  applicationRoles: string[] = [];
  existingMemberRoles: string[] = [];


  ngOnInit(): void {
    const id = this.activatedRoute.snapshot.paramMap.get('id');
    if (id) {
      this.addNew = false; // this means we are editing a member
      this.getMember(id);
    } else {
      this.initializeForm(undefined);
    }

    this.getRoles();
  }

  getMember(id: string) {
    this.adminService.getMember(id).subscribe({
      next: member => {
        this.initializeForm(member);
      }
    })
  }

  getRoles() {
    this.adminService.getApplicationRoles().subscribe({
      next: roles => this.applicationRoles = roles
    });
  }

  initializeForm(member: MemberAddEdit | undefined) {
    if (member) {
      // form for editing an existing member
      this.memberForm = this.formBuilder.group({
        id: [member.id],
        firstName: [member.firstName, Validators.required],
        lastName: [member.lastName, Validators.required],
        userName: [member.userName, Validators.required],
        password: [''],
        roles: [member.roles, Validators.required]
      });

      this.existingMemberRoles = member.roles.split(',');
    } else {
      // form for creating a member
      this.memberForm = this.formBuilder.group({
        id: [''],
        firstName: ['', Validators.required],
        lastName: ['', Validators.required],
        userName: ['', Validators.required],
        password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(15)]],
        roles: ['', Validators.required]
      });
    }

    this.formInitialized = true;
  }

  passwordOnChange() {
    if (this.addNew == false) {
      if (this.memberForm.get('password')?.value) {
        this.memberForm.controls['password'].setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(15)]);
      } else {
        this.memberForm.get('password')?.clearValidators();
      }

      this.memberForm.controls['password'].updateValueAndValidity();
    }
  }

  roleOnChange(selectedRole: string) {
    let roles = this.memberForm.get('roles')?.value.split(',');
    const index = roles.indexOf(selectedRole);
    index !== -1 ? roles.splice(index, 1) : roles.push(selectedRole);

    if (roles[0] === "") {
      roles.splice(0, 1);
    }

    this.memberForm.controls['roles'].setValue(roles.join(','));
  }

  submit() {
    this.submitted = true;
    this.errorMessages = [];


    if (this.memberForm.valid) {
      this.adminService.addEditMember(this.memberForm.value).subscribe({
        next: (response: any) => {
          this.sharedService.showNotification(true, response.value.titile, response.value.message);
          this.router.navigateByUrl('/admin');
        },
        error: error => {
          if (error.error.errors) {
            this.errorMessages = error.error.errors;
          } else {
            this.errorMessages.push(error.error);
          }
        }
      })
    }
  }
}
