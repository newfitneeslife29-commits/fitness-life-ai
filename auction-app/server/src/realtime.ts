import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { userIdFromToken } from './auth.ts';

// Rooms: `auction:{id}` (public price updates) and `user:{id}` (private events).

let io: Server | null = null;

export function attachRealtime(server: HttpServer) {
  io = new Server(server, { cors: { origin: '*' } });
  io.on('connection', (socket) => {
    const userId = userIdFromToken(socket.handshake.auth?.token);
    if (userId) socket.join(`user:${userId}`);
    socket.emit('hello', { serverTime: Date.now() });

    socket.on('auction:join', (auctionId: unknown) => {
      if (typeof auctionId === 'string') socket.join(`auction:${auctionId}`);
    });
    socket.on('auction:leave', (auctionId: unknown) => {
      if (typeof auctionId === 'string') socket.leave(`auction:${auctionId}`);
    });
  });
  return io;
}

export function emitToAuction(auctionId: string, event: string, payload: Record<string, unknown>) {
  io?.to(`auction:${auctionId}`).emit(event, { ...payload, serverTime: Date.now() });
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function closeRealtime() {
  io?.close();
  io = null;
}
