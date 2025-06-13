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
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
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
  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient
  ) {}
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
  organizations: any[] = [];
  repos: any[] = [];

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
    this.authService.login();
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      const userId = params['userId'];
      if (userId) {
        this.authService.checkAuthStatus(userId).subscribe(
          (response) => {
            this.isAuthenticated = response.isAuthenticated;
            this.userData = response.user;
            if (this.isAuthenticated) {
              this.loadOrganizations();
            }
          },
          (error) => {
            console.error('Error checking auth status:', error);
            this.isAuthenticated = false;
          }
        );
      } else {
        this.isAuthenticated = false;
      }
    });
  }

  loadOrganizations() {
    this.loading = true;
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          console.log('Fetched organizations:', organizations);
          this.organizations = organizations;
          this.loadRepos();
        },
        (error) => {
          console.error('Error fetching organizations:', error);
        }
      );
  }

  loadRepos() {
    this.organizations.forEach((org) => {
      this.http
        .get<{ repos: any[] }>(
          `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
        )
        .subscribe(
          ({ repos }) => {
            console.log('Fetched repos for org:', org.login, repos);
            repos.forEach((repo) => {
              repo.organization = org.login;
              repo.included = false;
            });
            this.repos.push(...repos);
            this.rowData = [...this.repos];
            this.loading = false;
          },
          (error) => {
            console.error('Error fetching repos:', error);
            this.loading = false;
          }
        );
    });
  }

  removeGithub() {
    if (this.userData && this.userData.id) {
      this.authService.removeGithubConnection(this.userData.id).subscribe(
        ({ redirectUrl }) => {
          console.log('Successfully removed GitHub connection:', redirectUrl);
          this.isAuthenticated = false;
          this.repos = [];
          this.organizations = [];
          this.userData = null;
          this.rowData = [];
          // After successful deletion, redirect user to GitHub app revocation page
          if (redirectUrl) window.location.href = redirectUrl;
        },
        (error) => {
          console.error('Failed to remove GitHub connection:', error);
        }
      );
    } else {
      console.error('User data or user ID not available.');
    }
  }

  onGridReady(event: any) {
    // Handle grid ready
  }

  onCellValueChanged(event: any) {
    // Handle row selection change
  }
}
