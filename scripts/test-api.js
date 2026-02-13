const http = require('http');

console.log('Testing API endpoint: http://localhost:5000/api/content/browse\n');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/content/browse',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('\nResponse:');
    try {
      const json = JSON.parse(data);
      console.log(`Found ${json.length} items in database:\n`);
      json.forEach(item => {
        console.log(`- ${item.title} (${item.category}) by ${item.creator_name}`);
      });
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
