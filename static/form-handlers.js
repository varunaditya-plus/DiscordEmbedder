document.addEventListener('DOMContentLoaded', function() {
    const fileInputWrapper = document.getElementById('fileInputWrapper');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const fileInput = document.getElementById('fileInput');
    
    fileInputWrapper.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = fileInput.files[0].name;
            fileNameDisplay.classList.remove('text-zinc-500');
            fileNameDisplay.classList.add('text-black', 'dark:text-white', 'font-medium');
        }
    });
    
    const thumbnailTypeUrl = document.getElementById('thumbnailTypeUrl');
    const thumbnailTypeFile = document.getElementById('thumbnailTypeFile');
    
    thumbnailTypeUrl.addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('thumbnailUrlGroup').classList.remove('hidden');
            document.getElementById('thumbnailFileGroup').classList.add('hidden');
        }
    });
    
    thumbnailTypeFile.addEventListener('change', function() {
        if (this.checked) {
            document.getElementById('thumbnailUrlGroup').classList.add('hidden');
            document.getElementById('thumbnailFileGroup').classList.remove('hidden');
        }
    });
    
    const thumbnailFileWrapper = document.getElementById('thumbnailFileWrapper');
    const thumbnailFileInput = document.getElementById('thumbnailFile');
    const thumbnailFileNameDisplay = document.getElementById('thumbnailFileNameDisplay');
    
    thumbnailFileWrapper.addEventListener('click', function() {
        thumbnailFileInput.click();
    });
    
    thumbnailFileInput.addEventListener('change', function() {
        if (thumbnailFileInput.files.length > 0) {
            thumbnailFileNameDisplay.textContent = thumbnailFileInput.files[0].name;
            thumbnailFileNameDisplay.classList.remove('text-zinc-500');
            thumbnailFileNameDisplay.classList.add('text-black', 'dark:text-white', 'font-medium');
        }
    });
    
    const backToFormBtn = document.getElementById('backToForm');
    const formContainer = document.getElementById('formContainer');
    const slideProgressContainer = document.getElementById('slideProgressContainer');
    const slideProgressBar = document.getElementById('slideProgressBar');
    const slideProgressStatus = document.getElementById('slideProgressStatus');
    const uploadLogs = document.getElementById('uploadLogs');
    const progressResponseDiv = document.getElementById('progressResponse');
    
    backToFormBtn.addEventListener('click', function() {
        formContainer.classList.remove('transform', '-translate-x-full');
        slideProgressContainer.classList.remove('transform', 'translate-x-0');
        slideProgressContainer.classList.add('transform', 'translate-x-full');
        
        slideProgressBar.style.width = '0%';
        slideProgressStatus.textContent = 'Preparing upload...';
        uploadLogs.innerHTML = '<div class="text-zinc-500 dark:text-zinc-400">Waiting for upload to start...</div>';
        progressResponseDiv.innerHTML = '';
    });
});