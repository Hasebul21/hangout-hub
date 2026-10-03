import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { SocketService } from './socket.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const socket = inject(SocketService);

  if (auth.token && req.url.startsWith(environment.apiBaseUrl)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${auth.token}` } });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // token expired or invalid, send the user back to login
      if (error.status === 401 && auth.token) {
        socket.disconnect();
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
