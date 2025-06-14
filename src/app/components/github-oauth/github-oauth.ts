import {
  Component,
  ViewChild,
  signal,
  effect,
  computed,
  WritableSignal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserStats } from '../user-stats/user-stats';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@Component({
  selector: 'app-github-oauth',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatExpansionModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatCheckboxModule,
    UserStats,
    MatProgressSpinnerModule,
  ],
  templateUrl: './github-oauth.html',
  styleUrls: ['./github-oauth.scss'],
})
export class GithubOauth {
  constructor(
    private readonly authService: AuthService,
    private readonly route: ActivatedRoute,
    private readonly http: HttpClient
  ) {
    effect(() => {
      this.dataSource.data = this.rowData();
    });
  }

  isAuthenticated = false;
  loading = false;

  userData: any = null;
  userStats: any = [];

  rowData = signal<any[]>([]);
  dataSource = new MatTableDataSource<any>([]);
  selection: any[] = [];

  organizations: any[] = [];
  repos: any[] = [];

  displayedColumns: WritableSignal<string[]> = signal([
    'select',
    'name',
    'repo',
  ]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
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
            console.error('Error checking auth status:', error.message);
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
          this.organizations = organizations;
          this.loadRepos();
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }

  loadRepos() {
    this.loading = true;
    let remaining = this.organizations.length;
    this.organizations.forEach((org) => {
      this.http
        .get<{ repos: any[] }>(
          `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
        )
        .subscribe(
          ({ repos }) => {
            repos.forEach((repo) => {
              repo.organization = org.login;
              repo.included = false;
              repo.repo = `https://github.com/${repo.fullName}`;
            });
            this.repos.push(...repos);
            if (--remaining === 0) {
              this.rowData.set([...this.repos]);
              this.loading = false;
            }
          },
          (error) => {
            console.error('Error fetching repos:', error);
            if (--remaining === 0) this.loading = false;
          }
        );
    });
  }

  login() {
    this.authService.login();
  }

  removeGithub() {
    if (this.userData?.id) {
      this.authService.removeGithubConnection(this.userData.id).subscribe(
        ({ redirectUrl }) => {
          this.isAuthenticated = false;
          this.repos = [];
          this.rowData.set([]);
          this.organizations = [];
          this.userData = null;
          this.selection = [];
          if (redirectUrl) window.location.href = redirectUrl;
        },
        (error) => {
          console.error('Failed to remove GitHub connection:', error);
        }
      );
    }
  }

  toggleSelection(row: any) {
    const idx = this.selection.findIndex((r) => r.githubId === row.githubId);
    if (idx >= 0) {
      this.selection.splice(idx, 1);
    } else {
      this.selection.push(row);
    }
    this.fetchRepoDetailsBatch();
  }

  isSelected(row: any) {
    return this.selection.some((r) => r.githubId === row.githubId);
  }

  isAllSelected() {
    return this.selection.length === this.rowData().length;
  }

  isIndeterminate() {
    const total = this.rowData().length;
    const selected = this.selection.length;
    return selected > 0 && selected < total;
  }

  toggleAll(event: any) {
    if (event.checked) {
      this.selection = [...this.rowData()];
    } else {
      this.selection = [];
    }
    this.fetchRepoDetailsBatch();
  }

  fetchRepoDetailsBatch() {
    const selectedRepoIds = this.selection.map((repo) => repo._id);
    if (selectedRepoIds.length === 0) {
      this.userStats = [];
      return;
    }

    this.loading = true;
    this.http
      .post<any>('http://localhost:3000/api/v1/repositories/sync', {
        repoIds: selectedRepoIds,
        userId: this.userData?.id,
      })
      .subscribe(
        (data) => {
          console.log('Batch repo data:', data);
          this.userStats = data;
          this.loading = false;
        },
        (error) => {
          console.error('Error fetching batch repo details:', error);
          this.loading = false;
        }
      );
  }

  // Dropdown options
  githubEntities = [
    'Repos',
    'Organizations',
    'OrganizationMembers',
    'PullRequests',
    'Issues',
    'Commits',
    // 'ChangeLogs',
  ];

  selectedIntegration = 'github';
  selectedEntity = 'Repos'; // default entity
  searchKeyword = '';

  // Filtering and Entity Change Handlers
  applyFilter() {
    const keyword = this.searchKeyword.trim().toLowerCase();
    this.dataSource.filter = keyword;
  }
  loadAllOrganizations() {
    this.loading = true;
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          this.organizations = organizations;
          this.displayedColumns.set(Object.keys(organizations[0] || []));
          console.log('Fetched organizations:', organizations);
          this.rowData.set([
            ...this.organizations.map((org) => {
              return {
                ...org,
              };
            }),
          ]);
          this.dataSource.paginator = this.paginator;

          this.loading = false;
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }

  loadAllRepos() {
    this.loading = true;
    const allRepos: any[] = [];

    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          this.organizations = organizations;
          let remaining = organizations.length;

          organizations.forEach((org) => {
            this.http
              .get<{ repos: any[] }>(
                `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
              )
              .subscribe(
                ({ repos }) => {
                  const repoIds = repos.map((repo) => repo._id);

                  this.http
                    .post<any[]>(
                      'http://localhost:3000/api/v1/repositories/sync',
                      {
                        repoIds,
                        userId: this.userData?.id,
                      }
                    )
                    .subscribe(
                      (syncData) => {
                        repos.forEach((repo) => {
                          repo.organization = org.login;
                          repo.included = false;
                          repo.repo = `https://github.com/${repo.fullName}`;

                          const synced = syncData.find(
                            (s) => s.repoGitHubId === repo.githubId
                          );
                          if (synced) {
                            repo.commits = synced.totalCommits;
                            repo.pullRequests = synced.totalPullRequests;
                            repo.issues = synced.totalIssues;
                          }
                        });

                        allRepos.push(...repos);

                        if (--remaining === 0) {
                          this.rowData.set([...allRepos]);
                          this.displayedColumns.set(
                            Object.keys(allRepos[0] || {})
                          );
                          this.dataSource.paginator = this.paginator;
                          this.loading = false;
                        }
                      },
                      (error) => {
                        console.error('Error syncing repo data:', error);
                        if (--remaining === 0) this.loading = false;
                      }
                    );
                },
                (error) => {
                  console.error('Error fetching repos:', error);
                  if (--remaining === 0) this.loading = false;
                }
              );
          });
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }

  loadAllCommits() {
    this.loading = true;
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          this.organizations = organizations;
          let remainingOrgs = organizations.length;

          const allRepos: any[] = [];
          const allCommits: any[] = [];

          organizations.forEach((org) => {
            this.http
              .get<{ repos: any[] }>(
                `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
              )
              .subscribe(
                ({ repos }) => {
                  repos.forEach((repo) => {
                    repo.organization = org.login;
                    repo.included = false;
                    repo.repo = `https://github.com/${repo.fullName}`;
                  });

                  allRepos.push(...repos);

                  if (--remainingOrgs === 0) {
                    // After fetching all repos from all orgs, fetch commits
                    let remainingRepos = allRepos.length;

                    if (remainingRepos === 0) {
                      this.rowData.set([]);
                      this.loading = false;
                      return;
                    }

                    allRepos.forEach((repo) => {
                      this.http
                        .get<{ commits: any[] }>(
                          `http://localhost:3000/api/v1/repositories/commits?userId=${this.userData?.id}&repoId=${repo._id}`
                        )
                        .subscribe(
                          ({ commits }: any) => {
                            if (commits?.length) {
                              allCommits.push(...commits);
                            }

                            if (--remainingRepos === 0) {
                              this.rowData.set(allCommits);
                              this.displayedColumns.set(
                                Object.keys(allCommits[0] || [])
                              );
                              this.dataSource.paginator = this.paginator;
                              this.loading = false;
                            }
                          },
                          (error) => {
                            console.error(
                              `Error fetching commits for repo ${repo._id}:`,
                              error
                            );
                            if (--remainingRepos === 0) {
                              this.rowData.set(allCommits);
                              this.loading = false;
                            }
                          }
                        );
                    });
                  }
                },
                (error) => {
                  console.error('Error fetching repos:', error);
                  if (--remainingOrgs === 0) this.loading = false;
                }
              );
          });
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }
  loadAllIssues() {
    this.loading = true;
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          this.organizations = organizations;
          let remainingOrgs = organizations.length;

          const allRepos: any[] = [];
          const allIssues: any[] = [];

          organizations.forEach((org) => {
            this.http
              .get<{ repos: any[] }>(
                `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
              )
              .subscribe(
                ({ repos }) => {
                  repos.forEach((repo) => {
                    repo.organization = org.login;
                    repo.included = false;
                    repo.repo = `https://github.com/${repo.fullName}`;
                  });

                  allRepos.push(...repos);

                  if (--remainingOrgs === 0) {
                    // After fetching all repos from all orgs, fetch commits
                    let remainingRepos = allRepos.length;

                    if (remainingRepos === 0) {
                      this.rowData.set([]);
                      this.loading = false;
                      return;
                    }

                    allRepos.forEach((repo) => {
                      this.http
                        .get<{ issues: any[] }>(
                          `http://localhost:3000/api/v1/repositories/issues?userId=${this.userData?.id}&repoId=${repo._id}`
                        )
                        .subscribe(
                          ({ issues }: any) => {
                            if (issues?.length) {
                              allIssues.push(...issues);
                            }

                            if (--remainingRepos === 0) {
                              this.rowData.set(allIssues);
                              this.displayedColumns.set(
                                Object.keys(allIssues[0] || [])
                              );
                              this.dataSource.paginator = this.paginator;
                              this.loading = false;
                            }
                          },
                          (error) => {
                            console.error(
                              `Error fetching commits for repo ${repo._id}:`,
                              error
                            );
                            if (--remainingRepos === 0) {
                              this.rowData.set(allIssues);
                              this.loading = false;
                            }
                          }
                        );
                    });
                  }
                },
                (error) => {
                  console.error('Error fetching repos:', error);
                  if (--remainingOrgs === 0) this.loading = false;
                }
              );
          });
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }
  loadAllPullRequests() {
    this.loading = true;
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          this.organizations = organizations;
          let remainingOrgs = organizations.length;

          const allRepos: any[] = [];
          const allPRs: any[] = [];

          organizations.forEach((org) => {
            this.http
              .get<{ repos: any[] }>(
                `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
              )
              .subscribe(
                ({ repos }) => {
                  repos.forEach((repo) => {
                    repo.organization = org.login;
                    repo.included = false;
                    repo.repo = `https://github.com/${repo.fullName}`;
                  });

                  allRepos.push(...repos);

                  if (--remainingOrgs === 0) {
                    // After fetching all repos from all orgs, fetch commits
                    let remainingRepos = allRepos.length;

                    if (remainingRepos === 0) {
                      this.rowData.set([]);
                      this.loading = false;
                      return;
                    }

                    allRepos.forEach((repo) => {
                      this.http
                        .get<{ pulls: any[] }>(
                          `http://localhost:3000/api/v1/repositories/pulls?userId=${this.userData?.id}&repoId=${repo._id}`
                        )
                        .subscribe(
                          ({ pulls }: any) => {
                            if (pulls?.length) {
                              allPRs.push(...pulls);
                            }

                            if (--remainingRepos === 0) {
                              this.rowData.set(allPRs);
                              this.displayedColumns.set(
                                Object.keys(allPRs[0] || [])
                              );
                              this.dataSource.paginator = this.paginator;
                              this.loading = false;
                            }
                          },
                          (error) => {
                            console.error(
                              `Error fetching commits for repo ${repo._id}:`,
                              error
                            );
                            if (--remainingRepos === 0) {
                              this.rowData.set(allPRs);
                              this.loading = false;
                            }
                          }
                        );
                    });
                  }
                },
                (error) => {
                  console.error('Error fetching repos:', error);
                  if (--remainingOrgs === 0) this.loading = false;
                }
              );
          });
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }

  // loadAllChangeLogs() {
  //   this.loading = true;
  //   this.http
  //     .get<{ organizations: any[] }>(
  //       `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
  //     )
  //     .subscribe(
  //       ({ organizations }) => {
  //         this.organizations = organizations;
  //         let remainingOrgs = organizations.length;

  //         const allRepos: any[] = [];
  //         const allIssues: any[] = [];
  //         const allChangeLogs: any[] = [];

  //         organizations.forEach((org) => {
  //           this.http
  //             .get<{ repos: any[] }>(
  //               `http://localhost:3000/api/v1/organizations/repositories?organizationId=${org._id}&userId=${this.userData?.id}`
  //             )
  //             .subscribe(
  //               ({ repos }) => {
  //                 repos.forEach((repo) => {
  //                   repo.organization = org.login;
  //                   repo.included = false;
  //                   repo.repo = `https://github.com/${repo.fullName}`;
  //                 });

  //                 allRepos.push(...repos);

  //                 if (--remainingOrgs === 0) {
  //                   let remainingRepos = allRepos.length;
  //                   if (remainingRepos === 0) {
  //                     this.rowData.set([]);
  //                     this.loading = false;
  //                     return;
  //                   }

  //                   allRepos.forEach((repo) => {
  //                     this.http
  //                       .get<{ issues: any[] }>(
  //                         `http://localhost:3000/api/v1/repositories/issues?userId=${this.userData?.id}&repoId=${repo._id}`
  //                       )
  //                       .subscribe(
  //                         ({ issues }) => {
  //                           issues = issues || [];
  //                           allIssues.push(
  //                             ...issues.map((i) => ({
  //                               ...i,
  //                               repoId: repo._id,
  //                             }))
  //                           );

  //                           if (--remainingRepos === 0) {
  //                             const totalIssues = allIssues.length;
  //                             if (totalIssues === 0) {
  //                               this.rowData.set([]);
  //                               this.loading = false;
  //                               return;
  //                             }

  //                             let remainingChangelogIssues = totalIssues;

  //                             allIssues.forEach((issue) => {
  //                               this.http
  //                                 .get<{ changeLogs: any[] }>(
  //                                   `http://localhost:3000/api/v1/repositories/issues/changelogs?userId=${this.userData?.id}&repoId=${issue.repoId}&issueNumber=${issue.number}`
  //                                 )
  //                                 .subscribe(
  //                                   ({ changeLogs }) => {
  //                                     if (changeLogs?.length) {
  //                                       allChangeLogs.push(...changeLogs);
  //                                     }

  //                                     if (--remainingChangelogIssues === 0) {
  //                                       this.rowData.set([...allChangeLogs]);
  //                                       this.displayedColumns.set(
  //                                         Object.keys(allChangeLogs[0] || {})
  //                                       );
  //                                       this.loading = false;
  //                                     }
  //                                     console.log(allChangeLogs);
  //                                     console.log(this.rowData());
  //                                     console.log(this.displayedColumns());
  //                                   },
  //                                   (error) => {
  //                                     console.error(
  //                                       `Error fetching changelogs for issue ${issue._id}:`,
  //                                       error
  //                                     );
  //                                     if (--remainingChangelogIssues === 0) {
  //                                       this.rowData.set([...allChangeLogs]);
  //                                       this.displayedColumns.set(
  //                                         Object.keys(allChangeLogs[0] || {})
  //                                       );
  //                                       this.loading = false;
  //                                     }
  //                                   }
  //                                 );
  //                             });
  //                           }
  //                         },
  //                         (error) => {
  //                           console.error(
  //                             `Error fetching issues for repo ${repo._id}:`,
  //                             error
  //                           );
  //                           if (--remainingRepos === 0) {
  //                             this.rowData.set([]);
  //                             this.loading = false;
  //                           }
  //                         }
  //                       );
  //                   });
  //                 }
  //               },
  //               (error) => {
  //                 console.error('Error fetching repos:', error);
  //                 if (--remainingOrgs === 0) this.loading = false;
  //               }
  //             );
  //         });
  //       },
  //       (error) => {
  //         console.error('Error fetching organizations:', error);
  //         this.loading = false;
  //       }
  //     );
  // }

  loadAllOrganizationMembers() {
    this.loading = true;
    const allMembers: any[] = [];
    this.http
      .get<{ organizations: any[] }>(
        `http://localhost:3000/api/v1/organizations?userId=${this.userData?.id}`
      )
      .subscribe(
        ({ organizations }) => {
          let remaining = this.organizations.length;
          this.organizations.forEach((org) => {
            this.http
              .get<{ members: any[] }>(
                `http://localhost:3000/api/v1/organizations/members?organizationId=${org._id}&userId=${this.userData?.id}`
              )
              .subscribe(
                ({ members }) => {
                  // members.forEach((member) => {
                  //   member.organization = org.login;
                  //   member.included = false;
                  // });
                  allMembers.push(...members);
                  if (--remaining === 0) {
                    this.rowData.set([...allMembers]);
                    this.displayedColumns.set(Object.keys(allMembers[0] || []));
                    this.dataSource.paginator = this.paginator;
                    this.loading = false;
                  }
                },
                (error) => {
                  console.error('Error fetching repos:', error);
                  if (--remaining === 0) this.loading = false;
                }
              );
          });
        },
        (error) => {
          console.error('Error fetching organizations:', error);
          this.loading = false;
        }
      );
  }
  onEntityChange(event: any) {
    // Fetch new data based on selectedEntity
    // this.fetchDataForEntity(this.selectedEntity);
    console.log('Selected entity:', this.selectedEntity);
    console.log('entity:', event.target.value);
    // this.selectedEntity = event;

    switch (this.selectedEntity) {
      case 'Organizations':
        this.loadAllOrganizations();
        break;
      case 'Repos':
        this.loadAllRepos();
        break;
      case 'Commits':
        this.loadAllCommits();
        break;
      case 'Issues':
        this.loadAllIssues();
        break;
      case 'PullRequests':
        this.loadAllPullRequests();
        break;
      // case 'ChangeLogs':
      //   this.loadAllChangeLogs();
      //   break;
      case 'OrganizationMembers':
        this.loadAllOrganizationMembers();
        break;
      default:
        this.dataSource.data = []; // fallback
    }
  }

  isUrl(value: any): boolean {
    if (typeof value !== 'string') return false;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }
}
