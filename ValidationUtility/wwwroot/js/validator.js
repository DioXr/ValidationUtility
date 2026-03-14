// --- 0. HELPER FUNCTION: Prevent HTML Injection ---
function escapeHTML(str) {
    if (!str) return "";
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// --- 1. PDF TEXT EXTRACTION LOGIC ---
document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const textArea = document.getElementById('referenceText');
    textArea.value = "Extracting text, please wait...";

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str);
            fullText += strings.join(" ") + " ";
        }

        textArea.value = fullText;
    } catch (error) {
        textArea.value = "Error extracting PDF: " + error.message;
    }
});

// --- 2. LOAD MANUAL JSON LOGIC ---
document.getElementById('btnLoadJson').addEventListener('click', function() {
    const jsonText = document.getElementById('manualJsonInput').value;
    const container = document.getElementById('questionsContainer');

    try {
        const questions = JSON.parse(jsonText);
        
        if (container.innerHTML.includes('No questions loaded')) {
            container.innerHTML = '';
        }

        questions.forEach((q, index) => {
            const randomId = "Manual_" + Math.floor(Math.random() * 10000); 
            
            const cardHtml = `
                <div class="card mb-4 shadow-sm question-card border-0" data-id="${randomId}">
                    <div class="card-header bg-white border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                        <div class="form-check">
                            <input class="form-check-input q-check row-checkbox" type="checkbox" checked>
                            <label class="form-check-label fw-bold text-primary">Include in Validation</label>
                        </div>
                        <span class="badge bg-secondary">ID: ${randomId}</span>
                    </div>

                    <div class="card-body">
                        <label class="form-label small fw-bold text-muted mb-1">Question Text</label>
                        <textarea class="form-control mb-3 q-title bg-light" rows="2">${escapeHTML(q.questionTitle || '')}</textarea>
                        
                        <div class="row g-2 mb-3">
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">A</span>
                                    <input type="text" class="form-control q-optA" value="${escapeHTML(q.optionA || '')}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">B</span>
                                    <input type="text" class="form-control q-optB" value="${escapeHTML(q.optionB || '')}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">C</span>
                                    <input type="text" class="form-control q-optC" value="${escapeHTML(q.optionC || '')}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">D</span>
                                    <input type="text" class="form-control q-optD" value="${escapeHTML(q.optionD || '')}">
                                </div>
                            </div>
                        </div>

                        <div class="d-flex align-items-center">
                            <label class="form-label small fw-bold text-muted mb-0 me-2">Teacher Answer Key:</label>
                            <input type="text" class="form-control form-control-sm text-center fw-bold q-ans w-25" value="${escapeHTML(q.answer || '')}" maxlength="1">
                        </div>
                    </div>
                    
                    <div class="card-footer d-none validation-box p-3"></div>
                </div>`;
            
            container.innerHTML += cardHtml;
        });

        document.getElementById('manualJsonInput').value = '';

    } catch (e) {
        alert("Invalid JSON format. Please check your syntax. Error: " + e.message);
    }
});

// --- 3. FETCH EXTERNAL QUESTIONS LOGIC ---
document.getElementById('btnFetch').addEventListener('click', async function() {
    const container = document.getElementById('questionsContainer');
    const btn = this;
    const btnRun = document.getElementById('btnRun');
    const selectAll = document.getElementById('selectAll');
    
    btn.innerHTML = 'Loading...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/validation/fetch-external');
        if (!response.ok) throw new Error("Failed to fetch questions");
        
        const questions = await response.json();
        
        if (container.innerHTML.includes('No questions loaded')) {
            container.innerHTML = '';
        }

        questions.forEach((q, index) => {
            const cardHtml = `
                <div class="card mb-4 shadow-sm question-card border-0" data-id="${escapeHTML(q.id)}">
                    
                    <div class="card-header bg-white border-bottom-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                        <div class="form-check">
                            <input class="form-check-input q-check row-checkbox" type="checkbox" checked>
                            <label class="form-check-label fw-bold text-primary">Include in Validation</label>
                        </div>
                        <span class="badge bg-secondary">ID: ${escapeHTML(q.id)}</span>
                    </div>

                    <div class="card-body">
                        <label class="form-label small fw-bold text-muted mb-1">Question Text</label>
                        <textarea class="form-control mb-3 q-title bg-light" rows="2">${escapeHTML(q.questionTitle)}</textarea>
                        
                        <div class="row g-2 mb-3">
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">A</span>
                                    <input type="text" class="form-control q-optA" value="${escapeHTML(q.optionA)}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">B</span>
                                    <input type="text" class="form-control q-optB" value="${escapeHTML(q.optionB)}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">C</span>
                                    <input type="text" class="form-control q-optC" value="${escapeHTML(q.optionC)}">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="input-group input-group-sm">
                                    <span class="input-group-text fw-bold">D</span>
                                    <input type="text" class="form-control q-optD" value="${escapeHTML(q.optionD)}">
                                </div>
                            </div>
                        </div>

                        <div class="d-flex align-items-center">
                            <label class="form-label small fw-bold text-muted mb-0 me-2">Teacher Answer Key:</label>
                            <input type="text" class="form-control form-control-sm text-center fw-bold q-ans w-25" value="${escapeHTML(q.answer)}" maxlength="1">
                        </div>
                    </div>
                    
                    <div class="card-footer d-none validation-box p-3"></div>
                </div>`;
            
            container.innerHTML += cardHtml;
        });

        btnRun.disabled = false;
        selectAll.disabled = false;
        selectAll.checked = true;

    } catch (err) {
        alert("Error: " + err.message);
    } finally {
        btn.innerHTML = 'Fetch External App';
        btn.disabled = false;
    }
});

// --- 4. SELECT ALL CHECKBOX LOGIC ---
document.getElementById('selectAll').addEventListener('change', function() {
    const isChecked = this.checked;
    document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = isChecked);
});

// --- 5. VALIDATION LOGIC ---
document.getElementById('btnRun').addEventListener('click', async function() {
    const btn = this;
    const loader = document.getElementById('loader');
    
    // Clear old validation results
    document.querySelectorAll('.validation-box').forEach(box => {
        box.classList.add('d-none');
        box.innerHTML = '';
        // 1. Remove the old border colors from the main card
        box.closest('.card').classList.remove('border-success', 'border-danger');
        
        // 2. NEW FIX: Remove the old background colors from the footer box!
        box.classList.remove('bg-success', 'bg-danger', 'bg-opacity-10');
    });

    const questionsArray = [];
    const rows = document.querySelectorAll('.question-card');
    
    rows.forEach(row => {
        const isChecked = row.querySelector('.q-check').checked;
        if (isChecked) {
            questionsArray.push({
                id: row.getAttribute('data-id'),
                questionTitle: row.querySelector('.q-title').value.trim(),
                optionA: row.querySelector('.q-optA').value.trim(),
                optionB: row.querySelector('.q-optB').value.trim(),
                optionC: row.querySelector('.q-optC').value.trim(),
                optionD: row.querySelector('.q-optD').value.trim(),
                answer: row.querySelector('.q-ans').value.trim().toUpperCase()
            });
        }
    });

    if (questionsArray.length === 0) {
        alert("Please select at least one question to validate.");
        return;
    }

    const payload = {
        selectedModel: document.getElementById('selectedModel').value,
        batchReferenceText: document.getElementById('referenceText').value.trim(),
        questions: questionsArray
    };

    btn.disabled = true;
    loader.classList.remove('d-none');

    try {
        const response = await fetch('/api/validation/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        
        const data = await response.json();

        // Map the results back to the exact question cards
        data.forEach((res, index) => {
            const targetId = questionsArray[index].id;
            const targetCard = document.querySelector(`.question-card[data-id="${targetId}"]`);
            
            if (targetCard) {
                const valBox = targetCard.querySelector('.validation-box');
                const colorClass = res.isFactuallyCorrect ? 'success' : 'danger';
                const statusLabel = res.isFactuallyCorrect ? 'VALID' : 'NEEDS CORRECTION';

                // Paint the card border
                targetCard.classList.add(`border-${colorClass}`);
                targetCard.classList.remove('border-0');

                // Inject the AI response directly below the question inputs
                valBox.innerHTML = `
                    <div class="d-flex justify-content-between mb-2">
                        <span class="fw-bold text-${colorClass}">AI Audit Result: ${statusLabel}</span>
                    </div>
                    <p class="small text-dark mb-2"><strong>Reasoning:</strong> ${escapeHTML(res.explanation)}</p>
                    <div class="p-2 bg-white border rounded small">
                        <strong>Final Answer:</strong> ${escapeHTML(res.suggestedCorrection)}
                    </div>
                `;
                valBox.classList.remove('d-none');
                valBox.classList.add(`bg-${colorClass}`, 'bg-opacity-10');
            }
        });

    } catch (e) {
        alert("Error processing validation: " + e.message);
    } finally {
        btn.disabled = false;
        loader.classList.add('d-none');
    }
});