const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('PerformIQ AI server is running');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});