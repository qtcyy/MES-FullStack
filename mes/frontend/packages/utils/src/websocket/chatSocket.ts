import { Observable, Subject, filter, takeUntil, tap } from "rxjs";
import type { WebSocketSubject } from "rxjs/webSocket";
import type { WsMessage } from "./notificationSocket";

export type ChatSocketMessageType =
  | "CHAT_MESSAGE"
  | "CHAT_TYPING"
  | "CHAT_READ_RECEIPT"
  | "CHAT_KEY_UPDATED";

export class ChatSocketService {
  private destroy$ = new Subject<void>();

  public readonly chatMessage$: Observable<any>;
  public readonly typing$: Observable<any>;
  public readonly readReceipt$: Observable<any>;
  public readonly keyUpdated$: Observable<any>;

  constructor(
    private socket$: WebSocketSubject<WsMessage>,
    private incoming$: Observable<WsMessage>,
  ) {
    console.log("[WS][Chat] ChatSocketService 构建完成");
    this.chatMessage$ = this.incoming$.pipe(
      takeUntil(this.destroy$),
      tap((m) =>
        console.log("[WS][Chat] incoming$ → chatMessage$ 前，type=", m?.type),
      ),
      filter((m) => (m.type as string) === "CHAT_MESSAGE"),
      tap((m) => console.log("[WS][Chat] chatMessage$ 命中", m)),
    );
    this.typing$ = this.incoming$.pipe(
      takeUntil(this.destroy$),
      filter((m) => (m.type as string) === "CHAT_TYPING"),
    );
    this.readReceipt$ = this.incoming$.pipe(
      takeUntil(this.destroy$),
      filter((m) => (m.type as string) === "CHAT_READ_RECEIPT"),
    );
    this.keyUpdated$ = this.incoming$.pipe(
      takeUntil(this.destroy$),
      filter((m) => (m.type as string) === "CHAT_KEY_UPDATED"),
    );
  }

  sendTyping(sessionId: string, isTyping: boolean): void {
    this.socket$.next({ type: "CHAT_TYPING" as any, sessionId, isTyping });
  }

  sendReadReceipt(sessionId: string): void {
    this.socket$.next({ type: "CHAT_READ_RECEIPT" as any, sessionId });
  }

  destroy(): void {
    console.log("[WS][Chat] ChatSocketService.destroy() 被调用");
    this.destroy$.next();
    this.destroy$.complete();
  }
}
