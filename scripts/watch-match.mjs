import { io } from 'socket.io-client';

const matchId = process.argv[2];
const baseUrl = process.argv[3] ?? 'http://localhost:3000';

if (!matchId) {
  console.error('Uso: node scripts/watch-match.mjs <matchId> [baseUrl]');
  process.exit(1);
}

const socket = io(`${baseUrl}/live`);

socket.on('connect', () => {
  socket.emit('match.subscribe', { matchId }, (response) => {
    console.log('inscrito', response);
  });
});

socket.on('match.updated', (event) => {
  console.log(event.reason, JSON.stringify(event.match));
});

socket.on('connect_error', (error) => {
  console.error('falha ao conectar', error.message);
});
