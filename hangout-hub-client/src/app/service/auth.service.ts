import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from '../models/user';

interface LoginResponse {
  accessToken: string;
  user: User;
}

const TOKEN_KEY = 'hangouthub.token';
const USER_KEY = 'hangouthub.user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private url = `${environment.apiBaseUrl}/auth`;

  constructor(private http: HttpClient) { }

  register(userName: string, email: string, password: string): Observable<User> {
    return this.http.post<User>(`${this.url}/register`, { userName, email, password });
  }

  login(email: string, password: string): Observable<User> {
    return this.http.post<LoginResponse>(`${this.url}/login`, { email, password }).pipe(
      tap(res => {
        sessionStorage.setItem(TOKEN_KEY, res.accessToken);
        this.setCurrentUser(res.user);
      }),
      map(res => res.user)
    );
  }

  loginAsGuest(): Observable<User> {
    return this.http.post<LoginResponse>(`${this.url}/guest`, {}).pipe(
      tap(res => {
        sessionStorage.setItem(TOKEN_KEY, res.accessToken);
        this.setCurrentUser(res.user);
      }),
      map(res => res.user)
    );
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  get token(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  get currentUser(): User | null {
    const user = sessionStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setCurrentUser(user: User): void {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  isGuest(): boolean {
    return this.currentUser?.isGuest === true;
  }

  isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }
}
