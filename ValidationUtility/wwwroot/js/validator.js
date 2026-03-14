// --- PDF EXTRACTION LOGIC ---
// Tell PDF.js where to find its worker file
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Listen for when a teacher uploads a file
document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const refTextArea = document.getElementById('referenceText');
    refTextArea.value = "Extracting text from file, please wait...";

    try {
        // 1. If it's a simple text file
        if (file.type === "text/plain") {
            const text = await file.text();
            refTextArea.value = text;
        } 
        // 2. If it's a PDF document
        else if (file.type === "application/pdf") {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = "";
            
            // Loop through every page in the PDF and grab the words
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(" ");
                fullText += pageText + "\n";
            }
            refTextArea.value = fullText.trim();
        } 
        else {
            refTextArea.value = "Unsupported file. Please upload a .txt or .pdf file.";
        }
    } catch (err) {
        refTextArea.value = "Error extracting text: " + err.message;
    }
});

// --- VALIDATION LOGIC ---
document.getElementById('btnRun').addEventListener('click', async function() {
    const btn = this;
    let rawInput = document.getElementById('jsonInput').value.trim();
    const selectedModel = document.getElementById('selectedModel').value;
    const referenceText = document.getElementById('referenceText').value.trim();
    
    const resultsDiv = document.getElementById('results');
    const loader = document.getElementById('loader');

    if (!rawInput) {
        alert("Please paste some JSON questions first.");
        return;
    }

    if (!rawInput.startsWith('[')) rawInput = '[' + rawInput + ']';

    try {
        const questionsArray = JSON.parse(rawInput);
        
        const payload = {
            selectedModel: selectedModel,
            batchReferenceText: referenceText,
            questions: questionsArray
        };

        btn.disabled = true;
        loader.classList.remove('d-none');
        resultsDiv.innerHTML = '';

        const response = await fetch('/api/validation/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || `Server returned ${response.status}`);
        }

        const data = await response.json();
        loader.classList.add('d-none');

        if (data.length === 0) {
            resultsDiv.innerHTML = `<div class="alert alert-warning">Warning: The backend returned an empty response.</div>`;
            return;
        }

    // --- UPDATED RENDER LOGIC ---
    data.forEach(res => {
        const color = res.isFactuallyCorrect ? 'success' : 'danger';
        const statusText = res.isFactuallyCorrect ? 'VALID' : 'INVALID';
    
        // We removed the "if" check so this box always appears now
        const correctionHtml = `
        <div class="p-2 bg-white border rounded text-${color} small mt-2">
            <b>Final Answer:</b> ${res.suggestedCorrection}
        </div>`;

        resultsDiv.innerHTML += `
        <div class="card mb-3 border-start border-5 border-${color} shadow-sm">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <h6 class="fw-bold mb-0 me-3 lh-base">${res.questionText}</h6>
                    <span class="badge bg-${color}">${statusText}</span>
                </div>
                <p class="small text-dark mt-2 mb-1"><strong>Reasoning:</strong> ${res.explanation}</p>
                ${correctionHtml}
            </div>
        </div>`;
    });
    } catch (e) {
        alert("Error: " + e.message);
        loader.classList.add('d-none');
    } finally {
        btn.disabled = false;
    }
});