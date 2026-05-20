const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

app.use('/api', createProxyMiddleware({
  target: 'https://gxe3h3lu05.execute-api.us-east-1.amazonaws.com/dev',
  changeOrigin: true,
  pathRewrite: {
    '^/api': ''
  }
}));

app.use(express.static('public')); 

app.listen(5000, () => {
  console.log('Server started on port 5000');
});