import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  Input,
  SimpleChanges,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-user-stats',
  imports: [CommonModule, MatTableModule, MatCardModule, MatSortModule],
  templateUrl: './user-stats.html',
  styleUrl: './user-stats.scss',
})
export class UserStats {
  @Input() userData: any[] = [];
  displayedColumns: string[] = [
    'user',
    'userId',
    'totalCommits',
    'totalPullRequests',
    'totalIssues',
  ];
  dataSource: any[] = [];

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['userData'] &&
      changes['userData'].currentValue !== changes['userData'].previousValue
    ) {
      this.dataSource = [...this.userData]; // clone to trigger change detection
      this.cdr.detectChanges();
    }
  }
}
