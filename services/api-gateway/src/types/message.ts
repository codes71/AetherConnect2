import { Observable } from 'rxjs';

export interface MessageService {
  getRooms(data: { userId: string }): Observable<any>;
  getMessageHistory(data: { roomId: string, page: number, limit: number }): Observable<any>;
}
