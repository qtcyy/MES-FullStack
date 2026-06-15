import { Subject } from "rxjs/internal/Subject";
import { Subscription } from "rxjs/internal/Subscription";
import { webSocket, WebSocketSubject } from "rxjs/webSocket";
import {
  BehaviorSubject,
  filter,
  interval,
  map,
  Observable,
  retry,
  shareReplay,
  takeUntil,
  tap,
  timer,
} from "rxjs";

export type SocketMessageType =
  | "AUTH"
  | "AUTH_OK"
  | "NOTIFICATION"
  | "KICKOUT"
  | "PING"
  | "PONG";

export type WsMessage = {
  type: SocketMessageType;
  [key: string]: any;
};

export class NotificationSocketService<T> {
  public socket$: WebSocketSubject<WsMessage> | null = null;
  private socketSub?: Subscription;
  private heartbeatSub?: Subscription;

  public readonly incoming$ = new Subject<WsMessage>();

  private readonly connectionState$ = new BehaviorSubject<boolean>(false);
  private readonly authState$ = new BehaviorSubject(false);

  private destroy$ = new Subject<void>();

  private token: string | null = null;

  constructor(private readonly url: string) {}

  public readonly connection$: Observable<boolean> = this.connectionState$
    .asObservable()
    .pipe(shareReplay(1));

  public readonly auth$: Observable<boolean> = this.authState$
    .asObservable()
    .pipe(shareReplay(1));

  public readonly messages$: Observable<WsMessage> =
    this.incoming$.asObservable();

  public readonly notification$: Observable<T> = this.incoming$.pipe(
    filter((m) => m.type === "NOTIFICATION"),
    map((m) => (m.data ?? m) as T),
    shareReplay(1),
  );

  public readonly kickout$: Observable<T> = this.incoming$.pipe(
    filter((m) => m.type === "KICKOUT"),
    map((m) => (m.data ?? m) as T),
    shareReplay(1),
  );

  public send(msg: WsMessage) {
    if (this.socket$) {
      console.log("[WS] 发送消息", msg?.type, msg);
      this.socket$.next(msg);
    } else {
      console.warn("[WS] send() 调用但 socket$ 为空，消息被丢弃", msg);
    }
  }

  private handleIncome(msg: WsMessage) {
    console.log("[WS] 收到消息", msg?.type, msg);
    switch (msg.type) {
      case "AUTH_OK":
        console.log("[WS] 鉴权成功 AUTH_OK", msg);
        this.authState$.next(true);
        break;

      case "PING":
        console.log("[WS] 收到 PING，回复 PONG");
        this.send({ type: "PONG" });
        break;

      default:
        break;
    }
    this.incoming$.next(msg);
  }

  public connect(token: string) {
    this.token = token;
    console.log("[WS] connect() 调用，URL=", this.url);

    if (this.socket$) {
      console.log("[WS] socket$ 已存在，直接重发 AUTH");
      this.send({ type: "AUTH", satoken: this.token });
      return;
    }

    this.destroy$ = new Subject<void>();

    this.socket$ = webSocket<WsMessage>({
      url: this.url,
      serializer: (msg) => JSON.stringify(msg),
      deserializer: (e) => JSON.parse(e.data),
      openObserver: {
        next: () => {
          console.log("[WS] 连接已打开，发送 AUTH");
          this.connectionState$.next(true);
          this.authState$.next(false);
          if (this.token) {
            this.send({ type: "AUTH", satoken: this.token });
          }
        },
      },
      closeObserver: {
        next: (e) => {
          console.log("[WS] 连接已关闭", e);
          this.connectionState$.next(false);
          this.authState$.next(false);
        },
      },
    });

    this.socketSub = this.socket$
      .pipe(
        tap((msg) => this.handleIncome(msg)),
        retry({
          delay: (error, retryCount) => {
            console.warn("Websocket 连接错误", error);
            const delayMs = Math.min(1000 * 2 ** retryCount, 30000);
            return timer(delayMs).pipe(takeUntil(this.destroy$));
          },
          resetOnSuccess: true,
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        error: (err) => {
          console.error("WebSocket 连接失败", err);
          this.socket$ = null;
        },
        complete: () => {
          this.socket$ = null;
        },
      });

    this.heartbeatSub = interval(30000)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this.connectionState$.value),
      )
      .subscribe(() => {
        this.send({ type: "PING" });
      });
  }

  public disconnect() {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.socketSub) this.socketSub.unsubscribe();
    if (this.heartbeatSub) this.heartbeatSub.unsubscribe();

    if (this.socket$) {
      this.socket$.complete();
      this.socket$ = null;
    }

    this.connectionState$.next(false);
    this.authState$.next(false);
  }
}
