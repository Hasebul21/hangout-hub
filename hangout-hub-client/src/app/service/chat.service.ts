import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Message } from '../models/message';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private url = `${environment.apiBaseUrl}/messages`;

  constructor(private http: HttpClient) { }

  getConversation(userId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.url}/${userId}`);
  }

  getUnreadCounts(): Observable<Record<number, number>> {
    return this.http.get<Record<number, number>>(`${this.url}/unread`);
  }

  markAsRead(userId: number): Observable<void> {
    return this.http.post<void>(`${this.url}/${userId}/read`, {});
  }

  search(userId: number, text: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.url}/${userId}/search`, { params: { q: text } });
  }
}
