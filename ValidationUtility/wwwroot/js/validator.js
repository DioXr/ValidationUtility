pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// --- MATH RENDERING ENGINE ---
function triggerMathRender() {
    if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().then(() => {
            console.log("MathJax rendering complete.");
        }).catch((err) => console.log('MathJax error:', err));
    }
}

// --- INITIAL LOAD ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/external_quiz_data.json?v=' + new Date().getTime()); 
        const questions = await response.json();
        renderTableRows(questions);
    } catch (e) { 
        console.error("Database connection failed."); 
    }
});

// --- RENDER TABLE ---
function renderTableRows(questions) {
    const tableBody = document.getElementById('quizTableBody');
    tableBody.innerHTML = '';
    questions.forEach((q, index) => {
        const rowId = q.id || q.Id || `Q-${index}`;
        const row = document.createElement('tr');
        row.className = 'question-row tex2jax_process'; 
        row.setAttribute('data-id', rowId);
        row.innerHTML = `
            <td class="text-center bg-light"><input type="checkbox" class="form-check-input q-check shadow-sm" checked></td>
            <td class="q-title p-3 text-dark fw-medium text-wrap">${q.questionTitle || q.QuestionTitle}</td>
            <td class="p-3 text-muted" style="line-height: 1.8;">
                <strong>A:</strong> <span class="q-optA">${q.optionA || q.OptionA || ''}</span><br>
                <strong>B:</strong> <span class="q-optB">${q.optionB || q.OptionB || ''}</span><br>
                <strong>C:</strong> <span class="q-optC">${q.optionC || q.OptionC || ''}</span><br>
                <strong>D:</strong> <span class="q-optD">${q.optionD || q.OptionD || ''}</span><br>
                <strong>E:</strong> <span class="q-optE">${q.optionE || q.OptionE || '-'}</span>
            </td>
            <td class="text-center q-ans fw-bold fs-5 p-3 text-primary">${q.answer || q.Answer}</td>
            <td class="ai-result text-muted small italic bg-light p-3">Awaiting audit...</td>
            <td class="ai-action text-center bg-light p-3"></td>
        `;
        tableBody.appendChild(row);
    });

    const auditBtn = document.getElementById('btnRunAudit');
    if (auditBtn) auditBtn.disabled = false;
    
    setTimeout(triggerMathRender, 200);
}

// --- AUDIT TRIGGER ---
const btnRunAudit = document.getElementById('btnRunAudit');
if (btnRunAudit) {
    btnRunAudit.addEventListener('click', async function() {
        const loader = document.getElementById('loader');
        const questionsToAudit = [];
        
        document.querySelectorAll('.question-row').forEach(row => {
            if (row.querySelector('.q-check')?.checked) {
                questionsToAudit.push({
                    Id: row.getAttribute('data-id'),
                    QuestionTitle: row.querySelector('.q-title').innerText,
                    OptionA: row.querySelector('.q-optA').innerText,
                    OptionB: row.querySelector('.q-optB').innerText,
                    OptionC: row.querySelector('.q-optC').innerText,
                    OptionD: row.querySelector('.q-optD').innerText,
                    OptionE: row.querySelector('.q-optE').innerText || "-",
                    Answer: row.querySelector('.q-ans').innerText
                });
            }
        });

        if (questionsToAudit.length === 0) return alert("Select questions first.");

        loader.classList.remove('d-none');
        try {
            const response = await fetch('/api/validation/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    SelectedModel: document.getElementById('selectedModel').value,
                    BatchReferenceText: document.getElementById('referenceText').value,
                    Questions: questionsToAudit
                })
            });

            if (!response.ok) throw new Error("Server error");

            const data = await response.json();
            data.forEach(res => {
                const row = document.querySelector(`.question-row[data-id="${res.QuestionId}"]`);
                if (row) {
                    const isCorrect = res.IsFactuallyCorrect;
                    row.classList.remove('table-success', 'table-danger');
                    row.classList.add(isCorrect ? 'table-success' : 'table-danger');
                    
                    // --- REARRANGED FEEDBACK LAYOUT ---
                    let feedbackHtml = `<div class="fw-bold mb-1 ${isCorrect ? 'text-success' : 'text-danger'}">
                                            ${isCorrect ? '✅ VALID' : '❌ INCORRECT'}
                                        </div>`;
                    
                    if (!isCorrect) {
                        // Show correct option/fix FIRST
                        feedbackHtml += `<div class="p-2 mb-2 bg-white rounded border border-danger-subtle shadow-sm small">
                                            <strong class="text-danger">Suggested Fix:</strong> ${res.SuggestedCorrection}
                                         </div>`;
                    }

                    // Then show the detailed explanation
                    feedbackHtml += `<div class="text-dark small" style="line-height:1.4">${res.Explanation}</div>`;

                    row.querySelector('.ai-result').innerHTML = feedbackHtml;

                    if (!isCorrect) {
                        row.querySelector('.ai-action').innerHTML = `
                            <button class="btn btn-warning btn-sm fw-bold shadow-sm" onclick="openEditModal('${res.QuestionId}')">Fix</button>
                        `;
                    } else {
                        row.querySelector('.ai-action').innerHTML = '';
                    }
                }
            });
            
            setTimeout(triggerMathRender, 200);

            const dlBtn = document.getElementById('btnDownloadJson');
            if (dlBtn) dlBtn.disabled = false;

        } catch (e) { 
            alert("Audit Failed. Check your API connection."); 
        } finally { 
            loader.classList.add('d-none'); 
        }
    });
}

// --- DOWNLOAD FEATURE ---
const btnDownload = document.getElementById('btnDownloadJson');
if (btnDownload) {
    btnDownload.addEventListener('click', function() {
        const finalData = [];
        document.querySelectorAll('.question-row').forEach(row => {
            finalData.push({
                id: row.getAttribute('data-id'),
                questionTitle: row.querySelector('.q-title').innerText,
                optionA: row.querySelector('.q-optA').innerText,
                optionB: row.querySelector('.q-optB').innerText,
                optionC: row.querySelector('.q-optC').innerText,
                optionD: row.querySelector('.q-optD').innerText,
                optionE: row.querySelector('.q-optE').innerText,
                answer: row.querySelector('.q-ans').innerText,
                auditFeedback: row.querySelector('.ai-result').innerText
            });
        });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "validated_quiz_data.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });
}

// --- MODAL & UI HELPERS ---
window.openEditModal = function(id) {
    const row = document.querySelector(`.question-row[data-id="${id}"]`);
    document.getElementById('editRowId').value = id;
    document.getElementById('editTitle').value = row.querySelector('.q-title').innerText;
    document.getElementById('editOptA').value = row.querySelector('.q-optA').innerText;
    document.getElementById('editOptB').value = row.querySelector('.q-optB').innerText;
    document.getElementById('editOptC').value = row.querySelector('.q-optC').innerText;
    document.getElementById('editOptD').value = row.querySelector('.q-optD').innerText;
    document.getElementById('editOptE').value = row.querySelector('.q-optE').innerText;
    document.getElementById('editAns').value = row.querySelector('.q-ans').innerText;
    new bootstrap.Modal(document.getElementById('editModal')).show();
};

window.saveEdit = function() {
    const id = document.getElementById('editRowId').value;
    const row = document.querySelector(`.question-row[data-id="${id}"]`);
    row.querySelector('.q-title').innerText = document.getElementById('editTitle').value;
    row.querySelector('.q-optA').innerText = document.getElementById('editOptA').value;
    row.querySelector('.q-optB').innerText = document.getElementById('editOptB').value;
    row.querySelector('.q-optC').innerText = document.getElementById('editOptC').value;
    row.querySelector('.q-optD').innerText = document.getElementById('editOptD').value;
    row.querySelector('.q-optE').innerText = document.getElementById('editOptE').value;
    row.querySelector('.q-ans').innerText = document.getElementById('editAns').value.toUpperCase();

    row.classList.remove('table-danger');
    row.querySelector('.ai-result').innerHTML = '<span class="badge bg-secondary">Manual Fix Applied.</span>';
    row.querySelector('.ai-action').innerHTML = '';
    
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    setTimeout(triggerMathRender, 200); 
};

// Select All Toggle
const selectAllCheck = document.getElementById('selectAll');
if (selectAllCheck) {
    selectAllCheck.addEventListener('change', function() {
        document.querySelectorAll('.q-check').forEach(cb => cb.checked = this.checked);
    });
} 