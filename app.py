from flask import Flask, request, render_template
import requests, os, random, string, hashlib
from io import BytesIO
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(supabase_url, supabase_key)

# discordembeds: id (text) | file (text) | thumbnail (text) | width (int2) | height (int2) | hash (text)

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def upload_to_catbox(file_content, filename, content_type):
    files = {'fileToUpload': (filename, file_content, content_type)}
    data = {'reqtype': 'fileupload', 'userhash': ''}
    response = requests.post("https://catbox.moe/user/api.php", files=files, data=data)
    return response.text

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files['file']
    thumbnail_url = request.form.get('thumbnail', 'https://cdn.nfp.is/av1/empty.png')
    width = int(request.form.get('width', 1280))
    height = int(request.form.get('height', 720))
    
    if file:
        file_content = BytesIO(file.read())
        
        file_hash = hashlib.sha256(file_content.getvalue()).hexdigest()
        hash_query = supabase.table('discordembeds').select('id').eq('hash', file_hash).execute()
        
        if hash_query.data:
            embed_id = hash_query.data[0]['id']
            embed_url = request.url_root + embed_id
            return embed_url
        
        file_content.seek(0)
        file_url = upload_to_catbox(file_content, file.filename, file.content_type)
        
        thumbnail_file = request.files.get('thumbnail_file')
        if thumbnail_file and thumbnail_file.filename:
            thumbnail_content = BytesIO(thumbnail_file.read())
            thumbnail_url = upload_to_catbox(thumbnail_content, thumbnail_file.filename, thumbnail_file.content_type)
        
        while True:
            embed_id = ''.join(random.choices(string.ascii_lowercase, k=5))
            check = supabase.table('discordembeds').select('id').eq('id', embed_id).execute()
            if not check.data: break
        
        supabase.table('discordembeds').insert({
            'id': embed_id,
            'file': file_url,
            'thumbnail': thumbnail_url,
            'width': width,
            'height': height,
            'hash': file_hash
        }).execute()
        
        embed_url = request.url_root + embed_id
        return embed_url

@app.route('/<embed_id>')
def embed(embed_id):
    result = supabase.table('discordembeds').select('*').eq('id', embed_id).execute()
    if not result.data: return "Embed not found", 404

    embed_data = result.data[0]
    return render_template('embed.html', embed=embed_data)

if __name__ == '__main__':
    app.run(port=5001, debug=False, host='0.0.0.0')