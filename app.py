from flask import Flask, request, render_template, Response, stream_with_context
import requests, os, random, string, hashlib, json, time, threading
from io import BytesIO
from supabase import create_client
from dotenv import load_dotenv
from requests_toolbelt import MultipartEncoder, MultipartEncoderMonitor
import tempfile
import shutil

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
supabase = create_client(supabase_url, supabase_key)

# discordembeds: id (text) | file (text) | thumbnail (text) | width (int2) | height (int2) | hash (text)

app = Flask(__name__)
app.upload_progress = 0
app.chunk_uploads = {} 

@app.route('/')
def index():
    return render_template('index.html')

def upload_to_catbox(file_content, filename, content_type):
    app.upload_progress = 0
    
    def progress_callback(monitor):
        app.upload_progress = int(monitor.bytes_read * 100 / monitor.len)
    
    encoder = MultipartEncoder(
        fields={
            'reqtype': 'fileupload',
            'userhash': '',
            'fileToUpload': (filename, file_content, content_type)
        }
    )
    
    monitor = MultipartEncoderMonitor(encoder, progress_callback)
    
    response = requests.post(
        "https://catbox.moe/user/api.php",
        data=monitor,
        headers={'Content-Type': monitor.content_type}
    )
    
    print(response)
    return response.text

@app.route('/uploadchunk', methods=['POST'])
def upload_chunk():
    file_id = request.args.get('fileid')
    chunk_index = int(request.args.get('chunk', 0))
    total_chunks = int(request.args.get('total', 1))
    
    if not file_id: return json.dumps({'error': 'Missing file ID'}), 400
    
    # start file tracking if this is the first chunk
    if file_id not in app.chunk_uploads:
        temp_dir = tempfile.mkdtemp()
        app.chunk_uploads[file_id] = {
            'temp_dir': temp_dir,
            'filename': request.args.get('filename', 'unknown'),
            'content_type': request.args.get('content_type', 'application/octet-stream'),
            'chunks_received': 0,
            'total_chunks': total_chunks
        }
    
    # save the chunk
    chunk_file = request.files['chunk']
    chunk_path = os.path.join(app.chunk_uploads[file_id]['temp_dir'], f'chunk_{chunk_index}')
    chunk_file.save(chunk_path)
    
    # update received chunks
    app.chunk_uploads[file_id]['chunks_received'] += 1
    
    return json.dumps({
        'status': 'received',
        'chunk': chunk_index,
        'received': app.chunk_uploads[file_id]['chunks_received'],
        'total': total_chunks,
        'progress': int(app.chunk_uploads[file_id]['chunks_received'] * 100 / total_chunks)
    })

def assemble_chunks(file_id):
    if file_id not in app.chunk_uploads:
        return None, None, None
    
    file_info = app.chunk_uploads[file_id]
    temp_dir = file_info['temp_dir']
    
    complete_file = BytesIO()
    
    # combine all chunks in order
    for i in range(file_info['total_chunks']):
        chunk_path = os.path.join(temp_dir, f'chunk_{i}')
        if os.path.exists(chunk_path):
            with open(chunk_path, 'rb') as chunk:
                complete_file.write(chunk.read())
    
    # clean up temp directory
    try: shutil.rmtree(temp_dir)
    except: pass
    
    filename = file_info['filename']
    content_type = file_info['content_type']
    
    # remove the file info from tracking
    del app.chunk_uploads[file_id]
    
    complete_file.seek(0)
    return complete_file, filename, content_type

@app.route('/upload', methods=['POST'])
def upload():
    file_id = request.form.get('fileid')
    thumbnail_url = request.form.get('thumbnail', 'https://cdn.nfp.is/av1/empty.png')
    width = int(request.form.get('width', 1280))
    height = int(request.form.get('height', 720))
    print('data gotten')
    
    def generate():
        yield f"data: {json.dumps({'status': 'processing', 'progress': 0, 'message': 'Processing file...'})}\n\n"
        
        # handle chunked upload if file id is provided
        if file_id:
            file_content, filename, content_type = assemble_chunks(file_id)
            if not file_content:
                yield f"data: {json.dumps({'status': 'error', 'message': 'Failed to assemble chunks'})}\n\n"
                return
        # handle direct file upload
        else:
            file = request.files.get('file')
            if not file:
                yield f"data: {json.dumps({'status': 'error', 'message': 'No file provided'})}\n\n"
                return
                
            file_content = BytesIO(file.read())
            filename = file.filename
            content_type = file.content_type
        
        file_hash = hashlib.sha256(file_content.getvalue()).hexdigest()
        hash_query = supabase.table('discordembeds').select('id').eq('hash', file_hash).execute()
        
        if hash_query.data:
            embed_id = hash_query.data[0]['id']
            embed_url = request.url_root + embed_id
            yield f"data: {json.dumps({'status': 'complete', 'progress': 100, 'url': embed_url})}\n\n"
            return
        
        yield f"data: {json.dumps({'status': 'uploading', 'progress': 5, 'message': 'Starting upload to catbox.moe...'})}\n\n"
        
        file_content.seek(0)
        upload_thread = threading.Thread(
            target=lambda: setattr(app, 'file_url', upload_to_catbox(file_content, filename, content_type))
        )
        upload_thread.daemon = True
        app.file_url = None
        upload_thread.start()
        
        last_progress = 5
        while upload_thread.is_alive():
            current_progress = 5 + int(app.upload_progress * 0.85)
            
            if current_progress > last_progress:
                last_progress = current_progress
                yield f"data: {json.dumps({'status': 'uploading', 'progress': current_progress, 'message': f'Uploading to catbox.moe ({current_progress}%)...'})}\n\n"
            
            time.sleep(0.1)
        
        file_url = app.file_url
        
        yield f"data: {json.dumps({'status': 'processing', 'progress': 90, 'message': 'Processing thumbnail...'})}\n\n"
        
        local_thumbnail_url = thumbnail_url 
        thumbnail_file = request.files.get('thumbnail_file')
        if thumbnail_file and thumbnail_file.filename:
            thumbnail_content = BytesIO(thumbnail_file.read())
            local_thumbnail_url = upload_to_catbox(thumbnail_content, thumbnail_file.filename, thumbnail_file.content_type)
        
        while True:
            embed_id = ''.join(random.choices(string.ascii_lowercase, k=5))
            check = supabase.table('discordembeds').select('id').eq('id', embed_id).execute()
            if not check.data: break
        
        supabase.table('discordembeds').insert({
            'id': embed_id,
            'file': file_url,
            'thumbnail': local_thumbnail_url,
            'width': width,
            'height': height,
            'hash': file_hash
        }).execute()
        
        embed_url = request.url_root + embed_id
        yield f"data: {json.dumps({'status': 'complete', 'progress': 100, 'url': embed_url})}\n\n"
    
    return Response(stream_with_context(generate()), 
                   content_type='text/event-stream')

@app.route('/<embed_id>')
def embed(embed_id):
    result = supabase.table('discordembeds').select('*').eq('id', embed_id).execute()
    if not result.data: return "Embed not found", 404

    embed_data = result.data[0]
    return render_template('embed.html', embed=embed_data)

if __name__ == '__main__':
    app.run(port=5001, debug=True, host='0.0.0.0')