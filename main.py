import os
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Simple in-memory cache
cache_data = None
cache_timestamp = 0
CACHE_DURATION = 300  # 5 minutes

def parse_feed_content(xml_content):
    root = ET.fromstring(xml_content)
    ns = {'ns': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('ns:entry', ns):
        title = entry.find('ns:title', ns)
        title_text = title.text if title is not None else "No Title"
        
        updated = entry.find('ns:updated', ns)
        updated_text = updated.text if updated is not None else ""
        
        link = entry.find('ns:link[@rel="alternate"]', ns)
        if link is None:
            link = entry.find('ns:link', ns)
        link_href = link.attrib.get('href', '') if link is not None else ""
        
        content = entry.find('ns:content', ns)
        content_html = content.text if content is not None else ""
        
        entry_id = entry.find('ns:id', ns)
        id_text = entry_id.text if entry_id is not None else ""
        
        entries.append({
            'id': id_text,
            'title': title_text,
            'updated': updated_text,
            'link': link_href,
            'content': content_html
        })
    return entries

def get_release_notes(force_refresh=False):
    global cache_data, cache_timestamp
    current_time = time.time()
    
    if force_refresh or not cache_data or (current_time - cache_timestamp > CACHE_DURATION):
        try:
            url = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            cache_data = parse_feed_content(response.content)
            cache_timestamp = current_time
        except Exception as e:
            # If fetch fails but we have cached data, return cached data
            if cache_data:
                return cache_data, True  # True means data is stale
            raise e
            
    return cache_data, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        data, is_stale = get_release_notes(force_refresh)
        return jsonify({
            'success': True,
            'data': data,
            'is_stale': is_stale,
            'cached_at': time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(cache_timestamp))
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    # Bind to localhost
    app.run(debug=True, host='127.0.0.1', port=5000)
