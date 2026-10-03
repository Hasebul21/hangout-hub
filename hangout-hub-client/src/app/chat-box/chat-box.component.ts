import { CommonModule } from '@angular/common';
import {
  AfterViewChecked, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
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
  imports: [CommonModule, FormsModule, NzIconModule, NzInputModule, NzButtonModule],
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
  otherTyping = false;
  searchOpen = false;
  searchText = '';
  searchResults: Message[] | null = null;
  avatarUrl = avatarUrl;
  useDefaultAvatar = useDefaultAvatar;

  private scrollToBottom = false;
  private subscription = new Subscription();
  private typingTimer?: ReturnType<typeof setTimeout>;
  private otherTypingTimer?: ReturnType<typeof setTimeout>;
  private isTyping = false;

  constructor(private chatService: ChatService,
    private socket: SocketService,
    private msg: NzMessageService) { }

  ngOnInit(): void {
    this.subscription.add(this.socket.on<Message>('message').subscribe(message => {
      if (this.belongsToThisChat(message)) {
        this.messages.push(message);
        this.otherTyping = false;
        this.scrollToBottom = true;
      }
    }));

    this.subscription.add(this.socket.on<{ userId: number; typing: boolean }>('typing').subscribe(event => {
      if (event.userId !== this.selectedUser.id) {
        return;
      }
      this.otherTyping = event.typing;
      // in case the "stopped typing" event never arrives
      clearTimeout(this.otherTypingTimer);
      if (event.typing) {
        this.otherTypingTimer = setTimeout(() => this.otherTyping = false, 5000);
      }
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedUser']) {
      const previous = changes['selectedUser'].previousValue as User | undefined;
      if (previous && this.isTyping) {
        this.socket.emit('typing', { receiverId: previous.id, typing: false });
        this.isTyping = false;
      }
      this.otherTyping = false;
      this.content = '';
      this.closeSearch();
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
    this.subscription.unsubscribe();
    clearTimeout(this.typingTimer);
    clearTimeout(this.otherTypingTimer);
    this.stopTyping();
  }

  onInput() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.socket.emit('typing', { receiverId: this.selectedUser.id, typing: true });
    }
    clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout(() => this.stopTyping(), 2000);
  }

  private stopTyping() {
    if (this.isTyping) {
      this.isTyping = false;
      this.socket.emit('typing', { receiverId: this.selectedUser.id, typing: false });
    }
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
    clearTimeout(this.typingTimer);
    this.stopTyping();
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

  toggleSearch() {
    if (this.searchOpen) {
      this.closeSearch();
    } else {
      this.searchOpen = true;
    }
  }

  search() {
    const text = this.searchText.trim();
    if (!text) {
      this.searchResults = null;
      return;
    }
    this.chatService.search(this.selectedUser.id, text).subscribe(results => {
      this.searchResults = results;
    });
  }

  closeSearch() {
    this.searchOpen = false;
    this.searchText = '';
    this.searchResults = null;
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
