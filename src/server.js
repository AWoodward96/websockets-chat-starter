const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');


const port = process.env.PORT || process.env.NODE_PORT || 3000;

const index = fs.readFileSync(`${__dirname}/../client/client.html`);

const onRequest = (request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.write(index);
  response.end();
};

const app = http.createServer(onRequest).listen(port);

console.log(`Listening on 127.0.0.1: ${port}`);


// set up the socket
const io = socketio(app);

const users = {};

const onJoined = (sock) => {
  const socket = sock;

  socket.on('join', (data) => {
    const joinMsg = {
      name: 'server', msg: `There are ${Object.keys(users).length} other users online.`,
    };

    users[socket.id] = data.name;

    socket.name = data.name;
    socket.emit('msg', joinMsg);

    socket.join('room1');

    // anounce to everyone in the room
    const response = {
      name: 'server', msg: `${data.name} has joined the room.`,
    };

    socket.broadcast.to('room1').emit('msg', response);

    console.log(`${data.name} has joined the room.`);
    socket.emit('msg', { name: 'server', msg: 'You joined the room.' });
  });

  socket.on('changeUsername', (data) => {
    socket.broadcast.to('room1').emit('msg', { name: 'server', msg: `${users[socket.id]} changed their name to ${data.name}` });
    socket.emit('msg', { name: 'server', msg: `You changed your name to ${data.name}` });
    users[socket.id] = data.name;
  });
};

const onMsg = (sock) => {
  const socket = sock;

  socket.on('msgToServer', (data) => {
    const sendmsg = data.msg;
    const firstThree = sendmsg.substr(0, 3);
    let sendCode = 'msg';

    if (firstThree.toUpperCase() === '/ME') { sendCode = 'me'; }

    if (sendmsg.substr(0, 10).toUpperCase() === '/TABLEFLIP') { sendCode = 'tableflip'; }

    if (sendmsg.substr(0, 7).toUpperCase() === '/UNFLIP') { sendCode = 'unflip'; }

    io.sockets.in('room1').emit(sendCode, { name: data.name, msg: sendmsg });
  });
};

const onDisconnect = (sock) => {
  const socket = sock;

  socket.on('disconnect', () => {
    socket.broadcast.to('room1').emit('msg', { name: 'server', msg: `${users[socket.id]} has disconnected. . .` });
    delete users[socket.id];
  });
};

io.sockets.on('connection', (socket) => {
  console.log('Connection');
  onJoined(socket);
  onMsg(socket);
  onDisconnect(socket);
});
console.log('Websocket server started');
