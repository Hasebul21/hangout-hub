import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Comment, Post, PostFilter, PostPage, Reaction } from '../models/post';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private url = `${environment.apiBaseUrl}/posts`;

  constructor(private http: HttpClient) { }

  getPosts(page: number, size: number, filter: PostFilter = {}): Observable<PostPage> {
    let params = new HttpParams().set('page', page).set('size', size);
    for (const [key, value] of Object.entries(filter)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<PostPage>(this.url, { params });
  }

  getTrending(): Observable<Post[]> {
    return this.http.get<Post[]>(`${this.url}/trending`);
  }

  getPostCount(userId: number): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.url}/count/${userId}`);
  }

  createPost(content: string): Observable<Post> {
    return this.http.post<Post>(this.url, { content });
  }

  updatePost(id: string, content: string): Observable<Post> {
    return this.http.patch<Post>(`${this.url}/${id}`, { content });
  }

  deletePost(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  react(id: string, type: Reaction): Observable<Post> {
    return this.http.post<Post>(`${this.url}/${id}/reaction`, { type });
  }

  getComments(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.url}/${postId}/comments`);
  }

  addComment(postId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.url}/${postId}/comments`, { content });
  }

  deleteComment(postId: string, commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${postId}/comments/${commentId}`);
  }
}
