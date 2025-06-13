import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  login() {
    window.location.href = 'http://localhost:3000/api/v1/auth/github';
  }

  loginWithGithub(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/v1/auth/github`);
  }

  checkAuthStatus(userId: String): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/v1/auth/auth-status`, {
      id: userId,
    });
  }
  removeGithubConnection(userId: String): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/v1/auth/remove`, { id: userId });
  }

  getOrganizations(userId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/organizations?userId=${userId}`
    );
  }

  getRepos(organizationId: string, userId: string): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/repos?organizationId=${organizationId}&userId=${userId}`
    );
  }

  getRepoDetails(repoId: string, userId: string): Observable<any> {
    return this.http.get<any>(
      `${this.apiUrl}/repo-details?repoId=${repoId}&userId=${userId}`
    );
  }
}
