import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { sockJsUrl } from '../ws.util';
import { ChatService } from '../service/chat.service';
import { forkJoin, map } from 'rxjs';
import { StompService } from '../service/stomp.service';
import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-chat-box',
  imports: [FormsModule, CommonModule, MatIconModule],
  templateUrl: './chat-box.component.html',
  styleUrl: './chat-box.component.scss'
})
export class ChatBoxComponent implements OnChanges, OnInit {

  @Input() selectedUser: any;
  @Input() loginUser: any;
  content: string;
  private stompClient: any | undefined;
  recivedMessage: string;
  messages: any[] = [];
  private isSubscribed: boolean = false;

  constructor(private chatService: ChatService,
    private stompService: StompService, private auth: AuthService) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.selectedUser && !this.isSubscribed) {
      this.connectSocket();
    }
    const loggedInUser = this.auth.currentUser;
    forkJoin([
      this.chatService.getAllChats(this.loginUser.id, this.selectedUser.id),
      this.chatService.getAllChats(this.selectedUser.id, this.loginUser.id)
    ])
      .pipe(
        map(([messages1, messages2]) => [...messages1, ...messages2])
      )
      .subscribe({
        next: (response) => {
          this.messages = response.map((message: any) => ({
            userName: message.senderName,
            senderProfileImage: message.senderProfileImage,
            receiverProfileImage: message.receiverProfileImage,
            content: message.content,
            time: new Date(message.createdOn),
            direction: message.senderId == this.loginUser.id ? 'right' : 'left'
          }));

          // Sort messages by time (ascending order)
          this.messages.sort((a, b) => a.time.getTime() - b.time.getTime());

          this.messages = this.messages.map(message => ({
            ...message,
            time: message.time.toLocaleTimeString() // Convert to readable format
          }));
        },
        error: (err) => {
          console.error('Error fetching chat history:', err);
        },
      });
  }

  ngOnDestroy(): void {
    // if (this.stompClient) {
    //   this.stompClient.disconnect();
    // }
  }


  onMessageSent() {
    const tmp = this.content;
    this.content = '';
    this.addMessageToChat({
      userName: this.loginUser.userName,
      content: tmp,
      time: new Date().toLocaleTimeString(),
    }, 'right');

    this.sendMessage(tmp);
  }

  sendMessage(content: string) {
    console.log('Sending message:', content);
    console.log(this.stompClient);
    if (this.stompClient) {
      this.stompClient.send('/app/chat/private/send', { receipt: 'message-receipt' },
        JSON.stringify({
          senderName: this.loginUser.userName,
          senderId: this.loginUser.id,
          receiverId: this.selectedUser.id,
          receiverName: this.selectedUser.userName,
          content: content,
        }));
    } else {
      console.error('❌ STOMP client not connected. Cannot send message.');
    }
  }

  connectSocket() {
    const socket = new SockJS(sockJsUrl());
    this.stompClient = Stomp.over(socket);

    this.stompClient.connect({}, () => {
      this.isSubscribed = true;
      this.stompClient.subscribe(`/user/${this.loginUser.id}/message/queue`, response => {
        console.log('Received message:', response);
        const received = JSON.parse(response.body);
        this.recivedMessage = JSON.parse(response.body);
        this.addMessageToChat(received, 'left');
      });
    }, (error) => {
      console.log(error);
    });
  }

  addMessageToChat(message: any, direction: any) {
    this.messages.push({
      userName: (direction === 'right') ? message.userName : message.senderName,
      content: message.content,
      profileImage: (direction === 'left') ? `data:image/jpeg;base64,${this.selectedUser.profileImage}` : `${this.loginUser.profileImage}`,
      time: new Date().toLocaleTimeString(),
      direction: direction
    });
  }
}
