import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
@Component({
  selector: 'app-github-oauth',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
  ],
  templateUrl: './github-oauth.html',
  styleUrls: ['./github-oauth.scss'],
  providers: [DatePipe],
})
export class GithubOauth {
  isAuthenticated = false;
  loading = false;

  userData: any = null;
  userStats: any = null;

  rowData = [
    // Example data structure, replace with actual GitHub project data
    { name: 'Project A', repo: 'github.com/user/project-a' },
    { name: 'Project B', repo: 'github.com/user/project-b' },
  ];

  columnDefs = [
    { field: 'name', headerName: 'Project Name' },
    { field: 'repo', headerName: 'Repository URL' },
  ];
  displayedColumns: string[] = ['select', 'name', 'repo'];
  dataSource = new MatTableDataSource(this.rowData);
  selection: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  toggleSelection(row: any) {
    const index = this.selection.indexOf(row);
    if (index >= 0) {
      this.selection.splice(index, 1);
    } else {
      this.selection.push(row);
    }
  }

  isAllSelected() {
    return this.selection.length === this.rowData.length;
  }

  isIndeterminate() {
    return this.selection.length > 0 && !this.isAllSelected();
  }

  toggleAll(event: any) {
    if (event.checked) {
      this.selection = [...this.rowData];
    } else {
      this.selection = [];
    }
  }
  login() {
    // GitHub OAuth login logic
  }

  removeGithub() {
    // Logic to disconnect GitHub
  }

  onGridReady(event: any) {
    // Handle grid ready
  }

  onCellValueChanged(event: any) {
    // Handle row selection change
  }
}
