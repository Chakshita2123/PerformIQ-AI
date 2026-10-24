const http = require('http');
const { readStudents } = require('./studentStore');
const appEvents = require('./events');

const PORT = process.env.PORT || 3000;

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  appEvents.emit('request', req.method, req.url);

  try {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('PerformIQ AI server is running');
    }

    if (req.method === 'GET' && req.url === '/api/students') {
      const students = await readStudents();
      return sendJson(res, 200, students);
    }

    sendJson(res, 404, { error: 'Route not found' });
  } catch (err) {
    appEvents.emit('serverError', err);
    sendJson(res, 500, { error: 'Internal server error' });
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the other server first.`);
  } else {
    console.error('Server error:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});