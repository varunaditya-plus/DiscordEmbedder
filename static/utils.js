function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function addLogEntry(message, classes='') {
    const uploadLogs = document.getElementById('uploadLogs');
    const timestamp = new Date().toLocaleTimeString();
    uploadLogs.innerHTML += `<div class="${classes}"">[${timestamp}] ${message}</div>`;
    uploadLogs.scrollTop = uploadLogs.scrollHeight;
}