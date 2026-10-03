import { CommonModule } from '@angular/common';
import {
  AfterViewChecked, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subscription } from 'rxjs';
import { Message } from '../models/message';
import { User } from '../models/user';
import { ChatService } from '../service/chat.service';
import { SocketService } from '../service/socket.service';
import { avatarUrl, useDefaultAvatar } from '../shared/avatar';
import { timeAgo } from '../shared/time-ago';

@Component({
  selector: 'app-chat-box',
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './chat-box.component.html',
  styleUrl: './chat-box.component.scss'
})
export class ChatBoxComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() me!: User;
  @Input() selectedUser!: User;
  @Input() online = false;
  @Input() lastSeen?: string;

  @ViewChild('messageList') messageList?: ElementRef<HTMLDivElement>;

  messages: Message[] = [];
  content = '';
  sending = false;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;

  private scrollToBottom = false;
  private subscription?: Subscription;

  constructor(private chatService: ChatService,
    private socket: SocketService,
    private msg: NzMessageService) { }

  ngOnInit(): void {
    this.subscription = this.socket.on<Message>('message').subscribe(message => {
      if (this.belongsToThisChat(message)) {
        this.messages.push(message);
        this.scrollToBottom = true;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser']) {
      this.loadMessages();
    }
  }

  ngAfterViewChecked(): void {
    if (this.scrollToBottom && this.messageList) {
      const el = this.messageList.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.scrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  loadMessages() {
    this.messages = [];
    this.chatService.getConversation(this.selectedUser.id).subscribe(messages => {
      this.messages = messages;
      this.scrollToBottom = true;
    });
  }

  async send() {
    const content = this.content.trim();
    if (!content || this.sending) {
      return;
    }

    this.sending = true;
    try {
      const result = await this.socket.request<Message & { error?: string }>('send-message', {
        receiverId: this.selectedUser.id,
        content
      });
      if (result.error) {
        this.msg.error(result.error);
      } else {
        this.messages.push(result);
        this.content = '';
        this.scrollToBottom = true;
      }
    } catch {
      this.msg.error('Message could not be sent, check your connection');
    } finally {
      this.sending = false;
    }
  }

  isMine(message: Message): boolean {
    return message.senderId === this.me.id;
  }

  statusText(): string {
    if (this.online) {
      return 'Online';
    }
    return this.lastSeen ? `Last seen ${timeAgo(this.lastSeen)}` : 'Offline';
  }

  private belongsToThisChat(message: Message): boolean {
    const other = this.selectedUser.id;
    return message.senderId === other || (message.senderId === this.me.id && message.receiverId === other);
  }
}
