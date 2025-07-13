document.addEventListener('DOMContentLoaded', () => {
    // --- DATA ---
    // Define paths to your CSV files
    const subjectFilePaths = {
        "Accountancy": "accountancy_questions.csv",
        "Commerce": "commerce_questions.csv"
    };
    // --- DOM ELEMENTS ---
    const subjectSelectEl = document.getElementById('subject-select');
    const unitSelectionEl = document.getElementById('unit-selection');
    const selectAllUnitsEl = document.getElementById('select-all-units');
    const paperDateEl = document.getElementById('paper-date');
    const shuffleEl = document.getElementById('shuffle');
    const totalMarksEl = document.getElementById('total-marks');
    const generateBtn = document.getElementById('generate-btn');
    const controlsView = document.getElementById('controls-view');
    const paperView = document.getElementById('paper-view');
    const backBtn = document.getElementById('back-btn');
    const printBtn = document.getElementById('print-btn');
    const paperContentEl = document.getElementById('paper-content');

    let allQuestions = []; // This will now hold questions for the *currently selected* subject

    // --- FUNCTIONS ---

    /**
     * Parses CSV data into an array of objects.
     * @param {string} csv - The CSV data as a string.
     * @returns {Array<Object>}
     */
    function parseCSV(csv) {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            if (values.length === headers.length) {
                const obj = {};
                for (let j = 0; j < headers.length; j++) {
                    obj[headers[j]] = values[j].replace(/"/g, '').trim();
                }
                data.push(obj);
            }
        }
        console.log("Parsed CSV data:", data);
        return data;
    }

    /**
     * Populates the unit selection checkboxes based on the current subject's questions.
     */
    function populateUnits() {
        unitSelectionEl.innerHTML = '';
        selectAllUnitsEl.checked = false;
        if (allQuestions.length === 0) {
            return;
        }
        const units = [...new Set(allQuestions.map(q => q.Unit))].sort((a, b) => parseInt(a) - parseInt(b));
        units.forEach(unit => {
            const div = document.createElement('div');
            div.className = 'flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `unit-${unit}`;
            checkbox.value = unit;
            checkbox.className = 'unit-checkbox h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500';
            const label = document.createElement('label');
            label.htmlFor = `unit-${unit}`;
            label.textContent = `Unit ${unit}`;
            label.className = 'ml-2 text-sm text-gray-700 dark:text-gray-300';
            div.appendChild(checkbox);
            div.appendChild(label);
            unitSelectionEl.appendChild(div);
        });
        document.querySelectorAll('.unit-checkbox').forEach(cb => {
            cb.addEventListener('change', updateTotalMarks);
        });
    }

    /**
     * Updates the total marks display based on selected units.
     */
    function updateTotalMarks() {
        const selectedUnits = getSelectedUnits();
        const questionCount = allQuestions.filter(q => selectedUnits.includes(q.Unit)).length;
        totalMarksEl.textContent = questionCount;
        generateBtn.disabled = questionCount === 0;
    }

    /**
     * Gets the currently selected units from the checkboxes.
     * @returns {Array<string>}
     */
    function getSelectedUnits() {
        return Array.from(document.querySelectorAll('.unit-checkbox:checked')).map(cb => cb.value);
    }

    /**
     * Shuffles an array in place.
     * @param {Array} array - The array to shuffle.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Generates the question paper HTML.
     */
    function generatePaper() {
        const selectedUnits = getSelectedUnits();
        if (selectedUnits.length === 0) {
            paperContentEl.innerHTML = `<div class="text-center p-8 text-red-500 font-bold">Please select at least one unit.</div>`;
            controlsView.classList.add('hidden');
            paperView.classList.remove('hidden');
            return;
        }
        let questionsToUse = allQuestions.filter(q => selectedUnits.includes(q.Unit));
        if (shuffleEl.checked) {
            shuffleArray(questionsToUse);
        }
        const paperDate = new Date(paperDateEl.value);
        const formattedDate = paperDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const totalMarks = questionsToUse.length;
        const selectedSubject = subjectSelectEl.value;
        let paperHTML = `
            <div class="text-center p-4">
                <h2 class="text-2xl font-bold">Ashram Matriculation Higher Secondary School</h2>
                <h3 class="text-xl font-semibold mt-1">One Mark Test - ${selectedSubject}</h3>
            </div>
            <div class="flex justify-between p-4 font-semibold">
                <span>Date: ${formattedDate}</span>
                <span>Total mark: ${totalMarks}</span>
            </div>
            <hr class="border-black my-4">
            <div class="p-4">
                <ol class="list-decimal list-inside space-y-6">
        `;
        questionsToUse.forEach((q, index) => {
            paperHTML += `
                <li class="break-words">
                    <span class="font-semibold">${q['Question Text']}</span>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <span>(a) ${q['Option A']}</span>
                        <span>(b) ${q['Option B']}</span>
                        <span>(c) ${q['Option C']}</span>
                        <span>(d) ${q['Option D']}</span>
                    </div>
                </li>
            `;
        });
        paperHTML += `
                </ol>
            </div>
        `;
        paperContentEl.innerHTML = paperHTML;
        controlsView.classList.add('hidden');
        paperView.classList.remove('hidden');
    }

    /**
     * Initializes the questions and units based on the selected subject by fetching CSV data.
     */
    async function initializeSubjectData() {
        const selectedSubject = subjectSelectEl.value;
        const filePath = subjectFilePaths[selectedSubject];
        if (!filePath) {
            console.error("No file path found for selected subject:", selectedSubject);
            allQuestions = [];
            populateUnits();
            updateTotalMarks();
            return;
        }
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvData = await response.text();
            allQuestions = parseCSV(csvData);
            populateUnits();
            updateTotalMarks();
        } catch (error) {
            console.error("Error fetching or parsing CSV data:", error);
            unitSelectionEl.innerHTML = `<div class="text-red-500">Error loading questions for ${selectedSubject}. Please try again later.</div>`;
            allQuestions = [];
            updateTotalMarks();
        }
    }

    // --- INITIALIZATION & EVENT LISTENERS ---
    paperDateEl.valueAsDate = new Date();
    initializeSubjectData();
    subjectSelectEl.addEventListener('change', initializeSubjectData);
    generateBtn.addEventListener('click', generatePaper);
    backBtn.addEventListener('click', () => {
        controlsView.classList.remove('hidden');
        paperView.classList.add('hidden');
    });
    printBtn.addEventListener('click', () => {
        window.print();
    });
    selectAllUnitsEl.addEventListener('change', (e) => {
        document.querySelectorAll('.unit-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateTotalMarks();
    });
});
