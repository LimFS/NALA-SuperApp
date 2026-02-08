<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// --- STATE ---
// Dynamic Configuration via URL Params (e.g., ?course=EE2101&user=student_123)
const urlParams = new URLSearchParams(window.location.search);
const courseCode = urlParams.get('course') || 'EE2101';
const userId = ref(urlParams.get('user') || 'del_spooner'); // Default Identity
const activeTab = ref('sketch'); // sketch | latex | upload
const stage = ref('input'); // input | review | feedback
const gradingResult = ref(null);
const isProcessing = ref(false);
const descriptionStatus = ref('idle'); // idle | loading | success | error

// Responsive State
const isMobile = ref(false);
const mobileTab = ref('question'); // question | input

// Question Data
const questions = ref([]);
const currentQIndex = ref(0);
const currentQuestion = computed(() => questions.value[currentQIndex.value] || {});

// Inputs
const latexInput = ref('');
const sketchData = ref(null); // DataURL
const fileData = ref(null);

// Canvas
const canvasRef = ref(null);
const isDrawing = ref(false);
const ctx = ref(null);
// katexReady is no longer needed with direct import

// --- LIFECYCLE ---
const checkMobile = () => { isMobile.value = window.innerWidth < 768; };

onMounted(async () => {
    // 1. Responsive Check
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 2. Fetch Questions (Gateway Absolute Path)
    try {
        // Force absolute path to avoid relative path resolution issues with Vite 'base'
        const res = await fetch(`/ee2101/api/courses/${courseCode}/questions`);
        if (res.ok) {
            questions.value = await res.json();
            currentQIndex.value = 0;
        } else {
            console.error("API Error:", res.status);
            questions.value = [{ question_text: `Error Loading Questions (Status: ${res.status})`, context: "Please check console and network logs." }];
        }
    } catch(e) { 
        console.error("Network Error:", e); 
        questions.value = [{ question_text: `Network Error: ${e.message}`, context: "Is the server running?" }];
    }

    // 3. Setup Canvas (Wait for layout)
    setTimeout(initCanvas, 300);
});

onUnmounted(() => {
    window.removeEventListener('resize', checkMobile);
});

// --- CANVAS LOGIC (Pointer Events for Touch + Mouse) ---
const initCanvas = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.value = canvas.getContext('2d');
    ctx.value.scale(dpr, dpr);
    ctx.value.strokeStyle = '#22d3ee'; // Cyan
    ctx.value.lineWidth = 2;
    ctx.value.lineCap = 'round';
};

const getPos = (e) => {
    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    };
};

const startDraw = (e) => {
    e.preventDefault(); // Stop scrolling on touch
    isDrawing.value = true;
    const { x, y } = getPos(e);
    ctx.value.beginPath();
    ctx.value.moveTo(x, y);
};

const draw = (e) => {
    if (!isDrawing.value) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctx.value.lineTo(x, y);
    ctx.value.stroke();
};

const stopDraw = (e) => {
    if (!isDrawing.value) return;
    isDrawing.value = false;
    ctx.value.closePath();
    sketchData.value = canvasRef.value.toDataURL();
};

const clearCanvas = () => {
    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();
    ctx.value.clearRect(0, 0, rect.width, rect.height);
    sketchData.value = null;
};

// --- UPLOAD LOGIC ---
const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        fileData.value = { name: file.name, type: file.type, content: evt.target.result };
    };
    reader.readAsDataURL(file);
};

// --- STAGE LOGIC ---
// --- STAGE LOGIC ---
// --- STAGE LOGIC ---
const goToReview = async () => { 
    // Optimization: Text inputs do not require a review step (User Request)
    if (activeTab.value === 'latex') {
        stage.value = 'review';
    } else {
        // For Sketch/Upload, we must generate a description first
        stage.value = 'review'; // Move to review to show loading
        descriptionStatus.value = 'loading';
        
        try {
            const payload = {
                image: activeTab.value === 'sketch' ? sketchData.value : fileData.value?.content,
                mimeType: activeTab.value === 'sketch' ? 'image/png' : fileData.value?.type
            };

            if (payload.image) {
                // Use Gateway-compatible path
                const res = await fetch('/ee2101/api/describe-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    latexInput.value = data.description; // Populate for editing
                    descriptionStatus.value = 'success';
                } else {
                    latexInput.value = "Error generating description.";
                    descriptionStatus.value = 'error';
                }
            } else {
                latexInput.value = "No image data found.";
                descriptionStatus.value = 'error';
            }
        } catch (e) {
            console.error(e);
            latexInput.value = "Network error during analysis.";
            descriptionStatus.value = 'error';
        } finally {
            descriptionStatus.value = 'success'; // Allow user to see/edit mostly
        }
    }
};
const backToEdit = () => { stage.value = 'input'; };
const editLatex = () => {
    // specific helper to jump to latex edit mode
    activeTab.value = 'latex';
    stage.value = 'input';
};

// --- RENDER LOGIC ---
const renderLatex = (text) => {
    if (!text) return '<span class="text-gray-500">No content.</span>';
    
    try {
        // displayMode: true ensures block equation format
        return katex.renderToString(text, { 
            throwOnError: false, 
            displayMode: true,
            errorColor: '#f43f5e'
        });
    } catch (e) { 
        console.error("KaTeX Error:", e);
        return `<span style="color:red">Math Error: ${e.message}</span>`; 
    }
};

const submitGrading = async () => {
    isProcessing.value = true;
    const bundle = {
        latex: latexInput.value,
        sketch: sketchData.value,
        file: fileData.value,
        studentAnswer: latexInput.value, 
        correctAnswer: currentQuestion.value.answerKey ? currentQuestion.value.answerKey[0] : "",
        // Context Injection (Fixed)
        questionText: currentQuestion.value.question_text,
        context: currentQuestion.value.context,
        rubrics: currentQuestion.value.rubrics,
        hint: currentQuestion.value.hint,
        answerKey: currentQuestion.value.answerKey,
        timestamp: new Date().toISOString()
    };

    try {
        // Use Gateway-compatible path
        const res = await fetch('/ee2101/api/grade', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ userId: userId.value, courseCode: courseCode, inputBundle: bundle }) 
        });

        if (res.ok) {
            gradingResult.value = await res.json();
            stage.value = 'feedback';
        } else {
            alert("Grading Failed");
        }
    } catch(e) {
        alert("Network Error");
    } finally {
        isProcessing.value = false;
    }
};

const nextQuestion = () => {
    if (currentQIndex.value < questions.value.length - 1) {
        currentQIndex.value++;
        latexInput.value = '';
        sketchData.value = null;
        fileData.value = null;
        gradingResult.value = null;
        if(canvasRef.value) clearCanvas();
        stage.value = 'input';
        // Auto-switch to question tab on mobile
        if(isMobile.value) mobileTab.value = 'question';
    } else {
        alert("End of Question Set");
    }
};
const goHome = () => {
    // Return to NALA Gateway (Configurable via ENV)
    window.location.href = import.meta.env.VITE_GATEWAY_URL || '/'; 
};

const difficultyMap = {
    1: { label: "Remember", color: "#10b981" }, // Emerald
    2: { label: "Understand", color: "#3b82f6" }, // Blue
    3: { label: "Apply", color: "#f59e0b" }, // Amber
    4: { label: "Analyze", color: "#ec4899" }, // Pink
    5: { label: "Evaluate", color: "#8b5cf6" }  // Violet
};

const getDifficulty = (level) => {
    return difficultyMap[level] || { label: "General", color: "#64748b" };
};
</script>

<template>
  <div class="app-container">
    <!-- 1. HEADER -->
    <header class="header">
        <div class="brand">
            <button class="home-btn" @click="goHome" title="Back to NALA">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
            <div class="logo-box">AG</div>
            <div class="titles">
                <h1>Anti-Gravity / {{ courseCode }}</h1>
                <span class="sub" v-if="!isMobile">Universal AI-Grader</span>
            </div>
        </div>
        <div class="progress-section" v-if="!isMobile">
            <div class="progress-text">Question {{ currentQIndex + 1 }} / {{ questions.length || 10 }}</div>
            <div class="progress-bar">
                <div class="fill" :style="{ width: ((currentQIndex + 1) / (questions.length || 10)) * 100 + '%' }"></div>
            </div>
        </div>
        <div class="user-badge" v-if="!isMobile">
            <span class="status-dot"></span> {{ userId }}
        </div>
        <!-- Mobile Menu Icon could go here -->
    </header>

    <!-- MOBILE TABS -->
    <div class="mobile-tabs" v-if="isMobile">
        <button :class="{ active: mobileTab === 'question' }" @click="mobileTab = 'question'">
            📖 Question
        </button>
        <button :class="{ active: mobileTab === 'input' }" @click="mobileTab = 'input'">
            ✏️ Answer
        </button>
    </div>

    <!-- 2. MAIN LAYOUT -->
    <main class="workspace">
        
        <!-- LEFT: QUESTION CARD -->
        <div class="panel left-panel" v-show="!isMobile || mobileTab === 'question'">
            <div class="card question-card">
                <div class="card-header">
                    <span class="tag">Background Info</span>
                    
                    <!-- DIFFICULTY BADGE -->
                    <div class="difficulty-badge" v-if="currentQuestion.difficulty">
                        <span class="dot" :style="{ background: getDifficulty(currentQuestion.difficulty).color }"></span>
                        L{{ currentQuestion.difficulty }}: {{ getDifficulty(currentQuestion.difficulty).label }}
                    </div>

                    <span v-if="isMobile" class="mobile-counter">{{ currentQIndex + 1 }}/{{ questions.length || 10 }}</span>
                </div>
                <div class="card-body">
                    <p class="context-text">{{ currentQuestion.context || 'Loading context...' }}</p>
                    <hr class="separator"/>
                    <h2 class="question-text">
                        <span class="q-label">[Q]</span> 
                        {{ currentQuestion.question_text || 'Loading question...' }}
                    </h2>
                    <div v-if="currentQuestion.media" class="media-box">
                        <img :src="currentQuestion.media" alt="Question Media" />
                    </div>
                </div>
                <!-- Mobile Action -->
                <div v-if="isMobile" class="mobile-action">
                    <button class="btn-primary full-width" @click="mobileTab = 'input'">Write Answer ></button>
                </div>
            </div>
        </div>

        <!-- RIGHT: ANSWER AREA -->
        <div class="panel right-panel" v-show="!isMobile || mobileTab === 'input'">
            
            <!-- STAGE: INPUT -->
            <div v-if="stage === 'input'" class="stage-container">
                <div class="tabs">
                    <button :class="{ active: activeTab === 'sketch' }" @click="activeTab = 'sketch'; setTimeout(initCanvas, 100)">🖌 Sketch</button>
                    <button :class="{ active: activeTab === 'latex' }" @click="activeTab = 'latex'">∑ LaTeX</button>
                    <button :class="{ active: activeTab === 'upload' }" @click="activeTab = 'upload'">📁 Upload</button>
                </div>

                <div class="input-content">
                    <!-- Sketch -->
                    <div v-show="activeTab === 'sketch'" class="canvas-wrapper">
                        <canvas ref="canvasRef" 
                            @pointerdown="startDraw" 
                            @pointermove="draw" 
                            @pointerup="stopDraw" 
                            @pointercancel="stopDraw"
                            @pointerleave="stopDraw">
                        </canvas>
                        <button @click="clearCanvas" class="btn-icon clear-btn" title="Clear">🗑</button>
                    </div>

                    <!-- LaTeX -->
                    <textarea v-show="activeTab === 'latex'" v-model="latexInput" class="code-editor" placeholder="\sum F = ma"></textarea>

                    <!-- Upload -->
                    <div v-show="activeTab === 'upload'" class="upload-zone">
                        <input type="file" @change="handleFileUpload" />
                        <div v-if="fileData" class="file-preview">
                            📄 {{ fileData.name }}
                        </div>
                    </div>
                </div>

                <div class="action-footer">
                    <button class="btn-primary full-width" @click="goToReview" :disabled="isProcessing">
                        {{ isProcessing ? 'Submitting...' : 'Submit Answer' }}
                    </button>
                </div>
            </div>

            <!-- STAGE: REVIEW -->
            <div v-if="stage === 'review'" class="stage-container review-mode">
                <h3>Final Verification</h3>
                
                <div v-if="descriptionStatus === 'loading'" class="loading-box">
                     Analyzing Image... 🤖
                </div>
                
                <div v-else class="review-content">
                    
                    <!-- 1. EDIT AREA (Top) -->
                    <div class="edit-section">
                        <label class="section-label">✏️ Edit LaTeX / Text:</label>
                        <textarea v-model="latexInput" class="review-editor" placeholder="\sum F = ma"></textarea>
                    </div>

                    <!-- 2. RENDERED PREVIEW (Bottom) -->
                    <div class="preview-section">
                         <label class="section-label">👁️ Rendered Output:</label>
                         <div class="latex-card" v-html="renderLatex(latexInput)"></div>
                    </div>

                    <!-- 3. ORIGINAL IMAGE (Reference) -->
                    <div v-if="sketchData || fileData" class="reference-section">
                        <label class="section-label">📸 Reference Image:</label>
                        <div class="mini-gallery">
                            <img v-if="sketchData" :src="sketchData" class="thumbnail" />
                            <div v-if="fileData" class="file-chip">📄 {{ fileData.name }}</div>
                        </div>
                    </div>

                </div>
                <div class="action-footer two-btns">
                    <button class="btn-secondary" @click="backToEdit">Back</button>
                    <button class="btn-success" @click="submitGrading" :disabled="isProcessing || descriptionStatus === 'loading'">
                        {{ isProcessing ? 'Grading...' : 'Confirm Submission' }}
                    </button>
                </div>
            </div>

            <!-- STAGE: FEEDBACK -->
            <!-- STAGE: FEEDBACK (Refactored) -->
            <div v-if="stage === 'feedback'" class="stage-container feedback-mode">
                
                <div class="feedback-grid">
                    <!-- CARD 1: YOUR ANSWER -->
                    <div class="feedback-card">
                        <div class="card-header-small">
                            👤 Your Answer
                        </div>
                        <div class="card-content">
                            <!-- Show Image if Sketch/Upload -->
                            <div v-if="sketchData || fileData" class="answer-image-preview">
                                <img v-if="sketchData" :src="sketchData" />
                                <div v-if="fileData">{{ fileData.name }}</div>
                            </div>
                            <!-- Show LaTeX -->
                            <div v-if="latexInput" class="latex-preview-small" v-html="renderLatex(latexInput)"></div>
                            <div v-else-if="!sketchData && !fileData" class="text-muted">No answer provided.</div>
                        </div>
                    </div>

                    <!-- CARD 2: AI FEEDBACK -->
                    <div class="feedback-card ai-card">
                        <div class="card-header-small ai-header">
                            <span class="ai-badge">✨ AI Graded</span>
                            <span class="trace-id">Trace: {{ gradingResult?.grade?.traceId?.substring(0,8) }}</span>
                        </div>
                        <div class="card-content center-content">
                            <div class="score-minimal">
                                <span class="score-val">{{ gradingResult?.grade?.score }}</span>
                                <span class="score-max">/ {{ gradingResult?.grade?.maxScore }}</span>
                            </div>
                            <p class="feedback-body">{{ gradingResult?.grade?.feedback }}</p>
                        </div>
                    </div>
                </div>

                <div class="action-footer">
                    <button class="btn-primary full-width" @click="nextQuestion">Next Question ></button>
                </div>
            </div>

        </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap');

/* RESET */
* { box-sizing: border-box; }
.app-container {
    font-family: 'Inter', sans-serif;
    background: #0f172a; /* Slate 900 */
    color: #f8fafc;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Prevent rubber-banding on mobile */
    overscroll-behavior: none;
}

/* HEADER */
.header {
    height: 64px;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    display: flex;
    align-items: center;
    padding: 0 24px;
    justify-content: space-between;
    flex-shrink: 0;
}
.brand { display: flex; align-items: center; gap: 12px; }
.home-btn {
    background: #334155;
    border: none;
    color: #94a3b8;
    width: 36px; height: 36px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}
.home-btn:hover { background: #475569; color: white; }

.logo-box { background: #3b82f6; color: white; font-weight: 800; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
.titles h1 { font-size: 1rem; margin: 0; font-weight: 600; }
.sub { font-size: 0.75rem; color: #94a3b8; }
.progress-section { display: flex; flex-direction: column; width: 300px; gap: 4px; }
.progress-bar { height: 6px; background: #334155; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #3b82f6; transition: width 0.3s; }

/* MOBILE TABS */
.mobile-tabs {
    display: flex;
    background: #0f172a;
    border-bottom: 1px solid #334155;
}
.mobile-tabs button {
    flex: 1;
    padding: 12px;
    background: none;
    border: none;
    color: #94a3b8;
    font-weight: 600;
    border-bottom: 3px solid transparent;
}
.mobile-tabs button.active {
    color: #3b82f6;
    border-bottom: 3px solid #3b82f6;
}

/* LAYOUT */
.workspace {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    overflow: hidden; /* Individual panels scroll */
}
.panel {
    padding: 24px;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}
.left-panel { border-right: 1px solid #334155; }

/* MOBILE OVERRIDE */
@media (max-width: 768px) {
    .workspace { grid-template-columns: 1fr; }
    .left-panel { border-right: none; }
    .header { padding: 0 16px; }
    .panel { padding: 16px; }
    /* Hide desktop-only elements handled by vue v-if/v-show */
}

/* CARD */
.card { background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
.card-header { background: #334155; padding: 8px 16px; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #94a3b8; display: flex; justify-content: space-between; align-items: center; } /* Added align-items center */
.difficulty-badge {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 20px;
    padding: 4px 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: #e2e8f0;
    display: flex;
    align-items: center;
    gap: 6px;
}
.dot {
    width: 6px; height: 6px; border-radius: 50%;
}

.card-body { padding: 24px; }
.context-text { color: #cbd5e1; font-size: 0.95rem; line-height: 1.6; }
.separator { border: 0; border-top: 1px solid #334155; margin: 24px 0; }
.question-text { font-size: 1.25rem; font-weight: 600; line-height: 1.4; color: #fff; }
.mobile-action { padding: 16px; border-top: 1px solid #334155; }
.media-box img { max-width: 100%; border-radius: 8px; margin-top: 12px; }

/* INPUT STAGE */
.stage-container { display: flex; flex-direction: column; height: 100%; gap: 16px; min-height: 400px; }
.tabs { display: flex; gap: 8px; border-bottom: 2px solid #334155; padding-bottom: 8px; overflow-x: auto; }
.tabs button { background: none; border: none; color: #94a3b8; padding: 8px 16px; cursor: pointer; font-weight: 600; white-space: nowrap; }
.tabs button.active { color: #3b82f6; background: rgba(59, 130, 246, 0.1); border-radius: 6px; }

.input-content { flex: 1; position: relative; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }
.canvas-wrapper { width: 100%; height: 100%; position: relative; touch-action: none; /* Critical for touch drawing */ }
canvas { width: 100%; height: 100%; cursor: crosshair; touch-action: none; }
.clear-btn { position: absolute; top: 12px; right: 12px; width: 32px; height: 32px; border-radius: 6px; background: #334155; border: none; color: white; z-index: 10; cursor: pointer; }

.code-editor { width: 100%; height: 100%; background: #0f172a; color: #38bdf8; padding: 16px; border: none; resize: none; font-family: 'JetBrains Mono', monospace; font-size: 1rem; outline: none; }
.upload-zone { height: 100%; display: flex; align-items: center; justify-content: center; flex-direction: column; border: 2px dashed #334155; margin: 12px; border-radius: 8px; color: #94a3b8; }

.action-footer { margin-top: auto; padding-top: 16px; }
.full-width { width: 100%; }
.two-btns { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem; } /* Touch friendly 44px+ height */
.btn-secondary { background: #334155; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }
.btn-success { background: #10b981; color: white; border: none; padding: 14px; border-radius: 8px; font-weight: 600; cursor: pointer; }

.trace-info { font-family: 'JetBrains Mono'; font-size: 0.75rem; color: #64748b; margin-top: 8px; }

/* REFACTORED FEEDBACK STYLES */
.feedback-mode { padding: 24px; align-items: stretch; justify-content: flex-start; }
.feedback-grid { display: grid; gap: 16px; width: 100%; margin-bottom: 24px; }

.feedback-card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.card-header-small { background: #0f172a; padding: 8px 16px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; border-bottom: 1px solid #334155; }
.card-content { padding: 16px; flex: 1; }

/* AI Card Specifics */
.ai-card { border-color: #3b82f6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.1); }
.ai-header { background: rgba(59, 130, 246, 0.1); color: #3b82f6; display: flex; justify-content: space-between; align-items: center; }
.ai-badge { display: inline-flex; align-items: center; gap: 4px; font-weight: 800; }
.trace-id { font-family: 'JetBrains Mono', monospace; font-size: 0.7rem; opacity: 0.7; }

.center-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }

.score-minimal { display: flex; align-items: baseline; gap: 4px; line-height: 1; }
.score-val { font-size: 3.5rem; font-weight: 800; color: #fff; text-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
.score-max { font-size: 1.5rem; color: #64748b; font-weight: 600; }

.feedback-body { font-size: 1rem; line-height: 1.5; color: #cbd5e1; margin: 0; }

.answer-image-preview img { max-width: 100%; border-radius: 6px; border: 1px solid #334155; }
.latex-preview-small { font-size: 1rem; padding: 8px; background: #0f172a; border-radius: 6px; }

/* REVIEW MODE STYLES */
.review-content { display: flex; flex-direction: column; gap: 24px; padding-bottom: 24px; }
.section-label { display: block; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em; }

.review-editor {
    width: 100%;
    min-height: 120px;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    color: #e2e8f0;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1rem;
    resize: vertical;
    outline: none;
    transition: border-color 0.2s;
}
.review-editor:focus { border-color: #3b82f6; }

.latex-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 24px;
    min-height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
}

.mini-gallery { display: flex; gap: 12px; flex-wrap: wrap; }
.thumbnail { height: 80px; border-radius: 6px; border: 1px solid #334155; }
.file-chip { background: #334155; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; display: flex; align-items: center; }

.loading-box { padding: 48px; text-align: center; color: #94a3b8; font-style: italic; }

</style>
