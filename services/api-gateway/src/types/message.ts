import { Observable } from 'rxjs';

export interface MessageService {
  getRooms(data: { userId: string }): Observable<Record<string, unknown>[]>;
  getMessageHistory(data: { roomId: string, page: number, limit: number }): Observable<Record<string, unknown>[]>;
}
