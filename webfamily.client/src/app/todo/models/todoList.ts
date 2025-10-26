export class todoList {
  recordId: any;
  dueDate!: Date;
  note!: string;
  assigned!: string;
  dateTime: Date
  constructor() {
    this.dueDate = new Date();
    this.note = '';
    this.assigned = '';
    this.dateTime = new Date();
  }
}
export interface ItodoList {
  recordId: string;
  dueDate: string;
  note: string;
  assigned: string | null;
  dateTime: string;
}
export class todoDisplay {
  recordId: any;
  dueDate!: Date;
  note!: string;
  assigned!: string;
  dateTime: Date
  displayDueDate: string;
  displayTime: string;
  constructor(v: any) {
    this.recordId = v.recordId;
    this.dueDate = v.dueDate;
    this.note = v.note;
    this.assigned = v.assigned;
    this.dateTime = v.dateTime;
    this.displayDueDate = new Date(v.dueDate).toLocaleDateString();
    this.displayTime = new Date(v.dueDate).toLocaleTimeString();
  }
}
