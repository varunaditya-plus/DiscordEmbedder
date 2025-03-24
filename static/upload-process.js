document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const progressResponseDiv = document.getElementById('progressResponse');
    const formContainer = document.getElementById('formContainer');
    const slideProgressContainer = document.getElementById('slideProgressContainer');
    const uploadLogs = document.getElementById('uploadLogs');
    const slideProgressBar = document.getElementById('slideProgressBar');
    const slideProgressStatus = document.getElementById('slideProgressStatus');
    const fileInput = document.getElementById('fileInput');
    const thumbnailUrlInput = document.getElementById('thumbnailUrl');
    const thumbnailFileInput = document.getElementById('thumbnailFile');
    const thumbnailTypeUrl = document.getElementById('thumbnailTypeUrl');
    const thumbnailTypeFile = document.getElementById('thumbnailTypeFile');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const file = fileInput.files[0];
        
        document.getElementById('infoFilename').textContent = file.name;
        document.getElementById('infoFilesize').textContent = formatFileSize(file.size);
        document.getElementById('infoDimensions').textContent = `${document.getElementById('videoWidth').value || '1280'} × ${document.getElementById('videoHeight').value || '720'}`;
        
        if (thumbnailTypeUrl.checked) {
            document.getElementById('infoThumbnail').textContent = thumbnailUrlInput.value || 'Default';
        } else if (thumbnailTypeFile.checked && thumbnailFileInput.files.length > 0) {
            document.getElementById('infoThumbnail').textContent = thumbnailFileInput.files[0].name;
        } else {
            document.getElementById('infoThumbnail').textContent = 'Default';
        }
        
        formContainer.classList.add('transform', '-translate-x-full');
        slideProgressContainer.classList.remove('transform', 'translate-x-full');
        slideProgressContainer.classList.add('transform', 'translate-x-0');
        
        addLogEntry('Starting upload process...');
        
        const submitBtn = document.getElementById('submitBtn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
        `;
        
        const CHUNK_SIZE = 30 * 1024 * 1024; // 30MB in bytes
        let formData = new FormData();
        let fileId = null;
        
        try {
            if (file.size > CHUNK_SIZE) {
                slideProgressStatus.textContent = 'Splitting file into chunks...';
                addLogEntry('File is large, splitting into chunks...');
                fileId = Date.now().toString() + Math.random().toString(36).substring(2, 15);
                const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
                
                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_SIZE;
                    const end = Math.min(file.size, start + CHUNK_SIZE);
                    const chunk = file.slice(start, end);
                    
                    const chunkFormData = new FormData();
                    chunkFormData.append('chunk', chunk);
                    
                    slideProgressStatus.textContent = `Uploading chunk ${i+1}/${totalChunks}...`;
                    addLogEntry(`Uploading chunk ${i+1}/${totalChunks}...`);
                    
                    const response = await fetch(`/uploadchunk?fileid=${fileId}&chunk=${i}&total=${totalChunks}&filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(file.type)}`, {
                        method: 'POST',
                        body: chunkFormData
                    });
                    
                    const result = await response.json();
                    slideProgressBar.style.width = `${Math.floor(result.progress / 2)}%`;
                }
                
                formData.append('fileid', fileId);
            } else { 
                formData.append('file', file); 
                addLogEntry(`Uploading file directly (${formatFileSize(file.size)})`); 
            }
            
            if (thumbnailTypeUrl.checked) { 
                formData.append('thumbnail', thumbnailUrlInput.value || 'https://cdn.nfp.is/av1/empty.png');
            } else if (thumbnailTypeFile.checked && thumbnailFileInput.files.length > 0) { 
                formData.append('thumbnail_file', thumbnailFileInput.files[0]);
            } else { 
                formData.append('thumbnail', 'https://cdn.nfp.is/av1/empty.png'); 
            }
            
            formData.append('width', document.getElementById('videoWidth').value || '1280');
            formData.append('height', document.getElementById('videoHeight').value || '720');
            
            slideProgressStatus.textContent = fileId ? 'Processing chunks...' : 'Uploading file...';
            addLogEntry(fileId ? 'Processing chunks...' : 'Uploading file...');
            
            const response = await fetch('/upload', { method: 'POST', body: formData });
            
            if (response.headers.get('Content-Type').includes('text/event-stream')) {
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                
                const processStream = async () => {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        
                        const text = decoder.decode(value);
                        const eventLines = text.split('\n\n');
                        
                        for (const line of eventLines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    
                                    let adjustedProgress = data.progress;
                                    if (fileId && data.status !== 'complete') { 
                                        adjustedProgress = 20 + (data.progress / 1.25); 
                                    }
                                    
                                    slideProgressBar.style.width = `${adjustedProgress}%`;                
                                    if (data.message) { 
                                        slideProgressStatus.textContent = data.message; 
                                        addLogEntry(data.message); 
                                    }
                                    
                                    if (data.status === 'complete' && data.url) {
                                        handleSuccessfulUpload(data.url);
                                    }
                                } catch (e) {
                                    console.error('Error parsing event data:', e);
                                    addLogEntry('Error parsing server response: ' + e.message);
                                }
                            }
                        }
                    }
                };
                
                await processStream();
            } else {
                const result = await response.text();
                try {
                    const jsonResult = JSON.parse(result);
                    const url = jsonResult.url || result;
                    handleSuccessfulUpload(url);
                } catch (e) {
                    handleSuccessfulUpload(result);
                }
            }
        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            
            progressResponseDiv.innerHTML = `
                <div class="p-4 mt-4 bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-md">
                    Error uploading file: ${errorMessage}
                </div>
            `;
            slideProgressStatus.textContent = 'Upload failed';
            addLogEntry('Error: ' + errorMessage, 'text-red-500');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });
    
    function handleSuccessfulUpload(url) {
        progressResponseDiv.innerHTML = `
            <div class="p-4 mt-4 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-50 rounded-md">
                Upload successful! 
                <a href="${url}" class="underline font-medium" target="_blank">
                    ${url}
                </a>
            </div>
        `;
        slideProgressStatus.textContent = 'Upload complete!';
        slideProgressBar.style.width = '100%';
        addLogEntry('Upload complete! URL: ' + `<a href="${url}" class="underline">${url}</a>`, 'text-green-500');
    }
});