// Фінальна версія сервера з фільтрами
const { Command } = require('commander');
const http = require('http');
const fs = require('fs').promises; 
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'path to file')
  .requiredOption('-h, --host <address>', 'host address')
  .requiredOption('-p, --port <number>', 'port number')
  .parse(process.argv);

const options = program.opts();

const server = http.createServer(async (req, res) => {
  try {
    const data = await fs.readFile(options.input, 'utf8');
    const jsonData = JSON.parse(data);

    const myUrl = new URL(req.url, `http://${req.headers.host}`);
    const queryObject = Object.fromEntries(myUrl.searchParams);
    
    let results = jsonData;

    // Фільтрація за облаштуванням
    if (queryObject.furnished === 'true') {
      results = results.filter(h => h.furnishingstatus === 'furnished');
    } else if (queryObject.furnished === 'false') {
      results = results.filter(h => h.furnishingstatus === 'unfurnished');
    }

    if (queryObject.max_price) {
      const maxPrice = parseFloat(queryObject.max_price);
      results = results.filter(h => h.price < maxPrice);
    }

    if (queryObject.min_area) {
      const minArea = parseFloat(queryObject.min_area);
      results = results.filter(h => h.area >= minArea);
    }

    const houseList = results.map(h => ({
      price: h.price,
      area: h.area,
      furnishingstatus: h.furnishingstatus
    }));

    const builder = new XMLBuilder({ 
      format: true,
      arrayNodeName: "house",
      ignoreAttributes: false
    });
    
    // Генеруємо XML
    const xmlContent = builder.build({ 
      houses: { house: houseList } 
    });

    // Формуємо фінальну відповідь
    const finalResponse = `<?xml version="1.0" encoding="UTF-8"?>\n${xmlContent}`;

    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    res.end(finalResponse);

  } catch (err) {
    if (err.code === 'ENOENT') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end("Cannot find input file");
    } else {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end("Internal Server Error");
    }
  }
});

server.listen(parseInt(options.port), options.host, () => {
  console.log(`Server is running at http://${options.host}:${options.port}/`);
});