const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const { Feed } = require('feed');
const fs = require('fs');
const path = require('path');
const ProgressBar = require("progress");

async function main() {
  const feed = new Feed({
    title: 'Hacker News: Front Page',
    description: 'Hacker News RSS',
    id: 'https://hnrss.org/frontpage',
    link: 'https://news.ycombinator.com/',
    language: 'en',
    updated: new Date(),
    generator: 'github.com/Prabesh01/hnrss-content-extract',
    feedLinks: {
      rss: 'https://raw.githubusercontent.com/Prabesh01/hnrss-content-extract/refs/heads/main/out/frontpage.rss'
      // atom: 'https://hnrss.org/frontpage.jsonfeed'
    }
  });

  // Fetch the list of items
  const response = await axios.get("https://hnrss.org/frontpage.jsonfeed", {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  let total = response.data.items.length;
  let bar = new ProgressBar("Extracting [:bar] :percent (:current/:total)", {
    total,
    width: 40,
    clear: true,
  });

  // Process each item sequentially
  var i=0;
  for (const item of response.data.items) {
    i+=1;
    try {
      const res = await axios.get(item.url, {
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      
      if (!isBinaryContent(item.url,res.headers)){
        const doc = new JSDOM(res.data, { url: item.url });
        const reader = new Readability(doc.window.document);
        const article = reader.parse();

        if (article) {
          feed.addItem({
          title: item.title,
          id: item.id || item.url,
          link: item.url,
          description: article.excerpt || '' ,
          content: article.textContent,
          author: [{ name: article.siteName || 'Unknown' }],
        });
        bar.tick(i);
        continue;
        } else {
          console.warn(`Could not parse article for URL: ${item.url}`);
        }
      }
    } catch (error) {
      console.error(`Error processing URL: ${item.url}`, error.message);
    }
    feed.addItem({
      title: item.title,
      id: item.id || item.url,
      link: item.url,
      description: '' ,
      content: '',
      author: [{ name: 'Unknown' }],
    });
    bar.tick(i);
  }

  // Generate RSS and Atom feeds
  const rssFeed = feed.rss2();
  // const atomFeed = feed.atom1();

  // Save feeds
  saveFeed(rssFeed, 'frontpage.rss');
  // saveFeed(atomFeed, 'frontpage.atom');
}

function saveFeed(feedContent, filename) {
  const filePath = path.join(process.cwd(), 'out', filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, feedContent, 'utf8');
  // console.log(`Saved ${filename}`);
}

function isBinaryContent(url,headers) {
        const contentType = headers?.['content-type'] || '';
        const urlLower = url.toLowerCase();
        return contentType.includes('pdf') ||
               contentType.includes('octet-stream') ||
               contentType.includes('application/') && !contentType.includes('text/html') && !contentType.includes('xml') || 
               urlLower.endsWith('.pdf') || 
               urlLower.includes('.pdf?');
}

main().catch(console.error);
