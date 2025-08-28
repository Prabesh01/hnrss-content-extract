import requests

from feedgen.feed import FeedGenerator
from trafilatura import extract
from newspaper import fulltext


def isBinary(url,headers):
    type = headers['content-type'].lower() if 'content-type' in headers else ''
    url = url.lower()
    return 'pdf' in type or 'octet-stream' in type or url.endswith('.pdf') or '.pdf?' in url or ('application/' in type and not 'text/html' in type)


fg = FeedGenerator()
fg.id('hnrss.org/frontpage')
fg.title('Hacker News: Front Page')
fg.link( href='https://news.ycombinator.com/', rel='alternate' )
fg.subtitle('Hacker News RSS')
fg.link( href='https://raw.githubusercontent.com/Prabesh01/hnrss-content-extract/refs/heads/main/out/rss.xml', rel='self' )
fg.language('en')

items = requests.get("https://hnrss.org/frontpage.jsonfeed").json()['items']
total = len(items)
i=0
for itm in items:
    i+=1
    print(f"{i}/{total}")

    url = itm['url']
    article=''

    fe = fg.add_entry()
    fe.id(itm['id'])
    fe.title(itm['title'])
    fe.link(href=url)

    try: res = requests.get(url,headers={'user-agent':'Mozilla/5.0 (X11; Linux x86_64; rv:142.0) Gecko/20100101 Firefox/142.0'})
    except: pass

    if res.status_code!=200: print("Error processing URL: "+url)
    elif not isBinary(url,res.headers):
        html = res.text
        article = extract(html, output_format="xml",include_comments=False,include_images=False)
        if not article or not article.strip(): 
            try: article = fulltext(html)
            except: print("Could not parse article for URL: "+url)

    fe.content(article)


atomfeed = fg.atom_str(pretty=True) # Get the ATOM feed as string
rssfeed  = fg.rss_str(pretty=True) # Get the RSS feed as string
fg.atom_file('out/atom.xml') # Write the ATOM feed to a file
fg.rss_file('out/rss.xml') # Write the RSS feed to a file
