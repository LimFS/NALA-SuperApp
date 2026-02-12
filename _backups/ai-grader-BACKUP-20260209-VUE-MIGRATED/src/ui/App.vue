<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import client from '../api/client.js';

// --- STATE ---
// Dynamic Configuration via URL Params (e.g., ?course=EE2101&user=student_123)
const urlParams = new URLSearchParams(window.location.search);
const courseCode = urlParams.get('course') || 'EE2101';
const userId = ref(urlParams.get('user') || 'del_spooner'); // Default Identity
const userName = ref(userId.value); // Will be updated by API
const userIcon = ref(null);
const activeTab = ref('sketch'); // sketch | latex | upload
const stage = ref('input'); // input | review | feedback
const gradingResult = ref(null);
const isProcessing = ref(false);
const descriptionStatus = ref('idle'); // idle | loading | success | error

const API_BASE = '/ee2101/api';

// Responsive State
const isMobile = ref(false);
const mobileTab = ref('question'); // question | input

// Question Data
const questions = ref([]);
const currentQIndex = ref(0);
const currentQuestion = computed(() => questions.value[currentQIndex.value] || {});

// Helper to handle both flat and nested grade objects (User Request)
const normalizedGrade = computed(() => {
    if (!gradingResult.value) return null;
    const res = gradingResult.value.grade || gradingResult.value;
    console.log("[App.vue] Normalized Grade:", res); // DEBUG
    return res;
});

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

    // 2. Fetch Questions & User Details (Gateway Absolute Path)
    // 2. Fetch Questions & User Details (Gateway Absolute Path)
    try {
        // Fetch User Details explicitly from Global NALA API (via Gateway)
        try {
            const userData = await client.getUser(userId.value);
            userName.value = userData.first_name || userId.value;
            // Optimistic update if profile_icon exists
            if (userData.profile_icon) {
               userIcon.value = userData.profile_icon;
            }
        } catch (uErr) {
            console.warn("User fetch failed, utilizing default:", uErr);
        }

        // Force absolute path to avoid relative path resolution issues with Vite 'base'
        const questionsData = await client.get(`/courses/${courseCode}/questions`);
        questions.value = questionsData;
        currentQIndex.value = 0;

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
        // Fix: Clear phantom images if submitting LaTeX
        sketchData.value = null;
        fileData.value = null;
        stage.value = 'review';
    } else {
        // Enforce Exclusivity: Clear the other input type to prevent "ghost" images in Review
        if (activeTab.value === 'sketch') fileData.value = null;
        if (activeTab.value === 'upload') sketchData.value = null;

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
                try {
                    const data = await client.post('/describe-image', payload);
                    latexInput.value = data.description; // Populate for editing
                    descriptionStatus.value = 'success';
                } catch (e) {
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
        questionId: currentQuestion.value.question_id,
        setId: currentQuestion.value.set_id,
        context: currentQuestion.value.context,
        rubrics: currentQuestion.value.rubrics,
        hint: currentQuestion.value.hint,
        answerKey: currentQuestion.value.answerKey,
        timestamp: new Date().toISOString()
    };

    try {
        // Use Gateway-compatible path
        // SUBMIT TO ASYNC JOB QUEUE (Rule #2)
        const jobData = await client.post('/grade', {
            userId: userId.value,
            courseCode: courseCode,
            inputBundle: bundle
        });
        
        // POLLING LOOP
        const jobId = jobData.jobId;
        const pollInterval = setInterval(async () => {
            try {
                const jobStatus = await client.get(`/jobs/${jobId}`);
                
                if (jobStatus.status === 'completed') {
                    console.log("[App.vue] Job Complete. Result:", jobStatus.result); // DEBUG
                    clearInterval(pollInterval);
                    gradingResult.value = jobStatus.result;
                    stage.value = 'feedback';
                    isProcessing.value = false;
                } else if (jobStatus.status === 'failed') {
                    clearInterval(pollInterval);
                    alert("Grading Failed: " + jobStatus.error);
                    isProcessing.value = false;
                }
            } catch (pollErr) {
               // Silent retry or log
               console.warn("Polling retry...", pollErr);
            }
        }, 1000);

    } catch (e) {
        console.error("Submission Error:", e);
        alert("Failed to submit answer. Please try again.");
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
    1: { label: "Remember", color: "bg-emerald-500" }, 
    2: { label: "Understand", color: "bg-blue-500" }, 
    3: { label: "Apply", color: "bg-amber-500" }, 
    4: { label: "Analyze", color: "bg-pink-500" }, 
    5: { label: "Evaluate", color: "bg-violet-500" } 
};

const getDifficulty = (level) => {
    return difficultyMap[level] || { label: "General", color: "bg-slate-500" };
};
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-900 text-slate-50 font-sans overflow-hidden overscroll-none">
    <!-- 1. HEADER -->
    <header class="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div class="flex items-center gap-3">
            <button class="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-colors" @click="goHome" title="Back to NALA">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </button>
            <div class="w-9 h-9 flex items-center justify-center rounded-md overflow-hidden bg-white">
                <img :src="'/ee2101/ee2101_icon.png'" alt="EE2101" class="w-full h-full object-cover" />
            </div>
            <div>
                <h1 class="text-base font-semibold m-0">Anti-Gravity / {{ courseCode }}</h1>
                <span class="text-xs text-slate-400" v-if="!isMobile">Universal AI-Grader</span>
            </div>
        </div>
        
        <div class="flex flex-col w-[300px] gap-1" v-if="!isMobile">
            <div class="text-xs text-slate-400 font-medium">Question {{ currentQIndex + 1 }} / {{ questions.length || 10 }}</div>
            <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div class="h-full bg-blue-500 transition-all duration-300 ease-out" :style="{ width: ((currentQIndex + 1) / (questions.length || 10)) * 100 + '%' }"></div>
            </div>
        </div>
        
        <div class="flex items-center gap-2 text-sm font-medium bg-slate-900/50 py-1.5 px-3 rounded-full border border-slate-700/50" v-if="!isMobile">
            <img v-if="userIcon" :src="userIcon" class="w-6 h-6 rounded-full border border-white bg-white" />
            <span class="w-2 h-2 rounded-full bg-emerald-500" v-else></span> 
            {{ userName }}
        </div>
    </header>

    <!-- MOBILE TABS -->
    <div class="flex bg-slate-900 border-b border-slate-700" v-if="isMobile">
        <button class="flex-1 p-3 bg-none border-none text-slate-400 font-semibold border-b-2 border-transparent transition-colors" 
            :class="{ 'text-blue-500 border-blue-500': mobileTab === 'question' }" 
            @click="mobileTab = 'question'">
            📖 Question
        </button>
        <button class="flex-1 p-3 bg-none border-none text-slate-400 font-semibold border-b-2 border-transparent transition-colors"
            :class="{ 'text-blue-500 border-blue-500': mobileTab === 'input' }"
            @click="mobileTab = 'input'">
            ✏️ Answer
        </button>
    </div>

    <!-- 2. MAIN LAYOUT -->
    <main class="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        
        <!-- LEFT: QUESTION CARD -->
        <div class="p-6 overflow-y-auto border-r border-slate-700 scroll-smooth" v-show="!isMobile || mobileTab === 'question'">
            <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
                <div class="bg-slate-700/50 px-4 py-2 flex justify-between items-center text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <span class="bg-slate-700/50 px-2 py-1 rounded">Background Info</span>
                    
                    <!-- DIFFICULTY BADGE -->
                    <div class="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-full px-3 py-1 text-slate-200" v-if="currentQuestion.difficulty">
                        <span class="w-1.5 h-1.5 rounded-full" :class="getDifficulty(currentQuestion.difficulty).color"></span>
                        L{{ currentQuestion.difficulty }}: {{ getDifficulty(currentQuestion.difficulty).label }}
                    </div>

                    <span v-if="isMobile">{{ currentQIndex + 1 }}/{{ questions.length || 10 }}</span>
                </div>
                <div class="p-6">
                    <p class="text-slate-300 text-base leading-relaxed mb-6">{{ currentQuestion.context || 'Loading context...' }}</p>
                    <hr class="border-t border-slate-700 my-6"/>
                    <h2 class="text-xl font-semibold leading-snug text-white mb-4">
                        <span class="text-blue-400 mr-2">[Q]</span> 
                        {{ currentQuestion.question_text || 'Loading question...' }}
                    </h2>
                    <div v-if="currentQuestion.media" class="mt-4 rounded-lg overflow-hidden border border-slate-700">
                        <img :src="currentQuestion.media" alt="Question Media" class="w-full h-auto object-cover" />
                    </div>
                </div>
                <div class="px-6 py-3 bg-slate-900/30 border-t border-slate-700 text-right">
                    <span class="text-sm font-mono font-semibold text-slate-400">({{ currentQuestion.max_score || 10 }} Marks)</span>
                </div>
                <!-- Mobile Action -->
                <div v-if="isMobile" class="p-4 border-t border-slate-700">
                    <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors" @click="mobileTab = 'input'">Write Answer ></button>
                </div>
            </div>
        </div>

        <!-- RIGHT: ANSWER AREA -->
        <div class="p-6 overflow-y-auto" v-show="!isMobile || mobileTab === 'input'">
            
            <!-- STAGE: INPUT -->
            <div v-if="stage === 'input'" class="flex flex-col h-full gap-4 min-h-[400px]">
                <div class="flex gap-2 border-b-2 border-slate-700 pb-2 overflow-x-auto">
                    <button class="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                        :class="{ 'text-blue-500 bg-blue-500/10': activeTab === 'sketch' }" 
                        @click="activeTab = 'sketch'; setTimeout(initCanvas, 100)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        Sketch
                    </button>
                    <button class="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                        :class="{ 'text-blue-500 bg-blue-500/10': activeTab === 'latex' }" 
                        @click="activeTab = 'latex'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 18h16"/><path d="M4 6h3l5 7-5 7h4"/><path d="M14.5 9h5.5"/></svg>
                        LaTeX
                    </button>
                    <button class="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-slate-400 hover:text-slate-200 transition-all whitespace-nowrap"
                        :class="{ 'text-blue-500 bg-blue-500/10': activeTab === 'upload' }" 
                        @click="activeTab = 'upload'">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        Upload
                    </button>
                </div>

                <div class="flex-1 relative bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-inner">
                    <!-- Sketch -->
                    <div v-show="activeTab === 'sketch'" class="w-full h-full relative touch-none">
                        <canvas ref="canvasRef" 
                            class="w-full h-full cursor-crosshair touch-none block"
                            @pointerdown="startDraw" 
                            @pointermove="draw" 
                            @pointerup="stopDraw" 
                            @pointercancel="stopDraw"
                            @pointerleave="stopDraw">
                        </canvas>
                        <button @click="clearCanvas" class="absolute top-3 right-3 w-8 h-8 rounded-md bg-slate-700 text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg z-10" title="Clear">🗑</button>
                    </div>

                    <!-- LaTeX -->
                    <textarea v-show="activeTab === 'latex'" v-model="latexInput" class="w-full h-full bg-slate-900 text-sky-400 p-4 border-none resize-none font-mono text-base outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="\sum F = ma"></textarea>

                    <!-- Upload -->
                    <div v-show="activeTab === 'upload'" class="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-700 m-3 rounded-lg text-slate-400 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group" @click="$refs.fileInput.click()">
                        <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*,application/pdf" class="hidden" />
                        <div v-if="!fileData" class="flex flex-col items-center gap-3 group-hover:text-blue-400 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                            <span class="font-medium">Click or Drag to Upload Image</span>
                        </div>
                        <div v-if="fileData" class="flex flex-col items-center gap-2 mt-3">
                            <img v-if="fileData.type.startsWith('image/')" :src="fileData.content" class="max-h-52 max-w-full rounded-lg border border-slate-600 shadow-lg" />
                            <div class="text-sm text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded">📄 {{ fileData.name }}</div>
                        </div>
                    </div>
                </div>

                <div class="mt-auto pt-4">
                    <button class="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]" @click="goToReview" :disabled="isProcessing">
                        {{ isProcessing ? 'Submitting...' : 'Submit Answer' }}
                    </button>
                </div>
            </div>

            <!-- STAGE: REVIEW -->
            <div v-if="stage === 'review'" class="flex flex-col gap-6 pb-6 animate-in slide-in-from-right-4 duration-300">
                <h3 class="text-xl font-bold text-white mb-2">Final Verification</h3>
                
                <div v-if="descriptionStatus === 'loading'" class="p-12 text-center text-slate-400 italic bg-slate-800/50 rounded-lg border border-slate-700 border-dashed animate-pulse">
                     Analyzing Image... 🤖
                </div>
                
                <div v-else class="flex flex-col gap-6">
                    
                    <!-- 1. EDIT AREA (Top) -->
                    <div>
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">✏️ Edit LaTeX / Text:</label>
                        <textarea v-model="latexInput" class="w-full min-h-[120px] bg-slate-800 border border-slate-700 rounded-lg text-slate-200 p-4 font-mono text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"></textarea>
                    </div>

                    <!-- 2. RENDERED PREVIEW (Bottom) -->
                    <div>
                         <label class="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">👁️ Rendered Output:</label>
                         <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 min-h-[80px] flex items-center justify-center text-xl text-white" v-html="renderLatex(latexInput)"></div>
                    </div>

                    <!-- 3. ORIGINAL IMAGE (Reference) -->
                    <div v-if="sketchData || fileData">
                        <label class="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">📸 Reference Image:</label>
                        <div class="flex gap-3 flex-wrap">
                            <img v-if="sketchData" :src="sketchData" class="h-20 rounded-md border border-slate-700 bg-slate-900" />
                            <div v-if="fileData" class="flex flex-col items-center gap-1">
                                <img v-if="fileData.type.startsWith('image/')" :src="fileData.content" class="h-20 rounded-md border border-slate-700 bg-slate-900" />
                                <span class="text-xs text-slate-500 font-mono">📄 {{ fileData.name }}</span>
                            </div>
                        </div>
                    </div>

                </div>
                <div class="grid grid-cols-[1fr_2fr] gap-3 mt-auto pt-4">
                    <button class="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3.5 px-4 rounded-lg transition-colors" @click="backToEdit">Back</button>
                    <button class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]" @click="submitGrading" :disabled="isProcessing || descriptionStatus === 'loading'">
                        {{ isProcessing ? 'Grading...' : 'Confirm Submission' }}
                    </button>
                </div>
            </div>

            <!-- STAGE: FEEDBACK -->
            <div v-if="stage === 'feedback'" class="flex flex-col gap-6 p-6 h-full animate-in zoom-in-95 duration-300">
                
                <div class="grid gap-4 w-full">
                    <!-- CARD 1: YOUR ANSWER -->
                    <div class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                        <div class="bg-slate-900 px-4 py-2 text-xs font-bold uppercase text-slate-400 tracking-wide border-b border-slate-700">
                            👤 Your Answer
                        </div>
                        <div class="p-4 flex-1">
                            <!-- Show Image if Sketch/Upload -->
                            <div v-if="sketchData || fileData" class="mb-4">
                                <img v-if="sketchData" :src="sketchData" class="max-w-full rounded-md border border-slate-700" />
                                <div v-if="fileData" class="text-sm font-mono text-slate-400">{{ fileData.name }}</div>
                            </div>
                            <!-- Show LaTeX -->
                            <div v-if="latexInput" class="p-3 bg-slate-900 rounded-lg text-lg" v-html="renderLatex(latexInput)"></div>
                            <div v-else-if="!sketchData && !fileData" class="text-slate-500 italic">No answer provided.</div>
                        </div>
                    </div>

                    <!-- CARD 2: AI FEEDBACK -->
                    <div class="bg-slate-800 border border-blue-500/50 rounded-xl overflow-hidden flex flex-col shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                        <div class="bg-blue-500/10 px-4 py-2 flex justify-between items-center text-blue-400 border-b border-blue-500/20">
                            <span class="flex items-center gap-2 font-extrabold tracking-tight text-xs uppercase"><span class="text-lg">✨</span> AI Graded</span>
                            <span class="font-mono text-xs opacity-70">Trace: {{ normalizedGrade?.traceId?.substring(0,8) }}</span>
                        </div>
                        <div class="p-6 flex flex-col items-center gap-4 text-center">
                            <div class="flex items-baseline gap-1 leading-none">
                                <span class="text-5xl font-extrabold text-white drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">{{ normalizedGrade?.score }}</span>
                                <span class="text-xl font-semibold text-slate-500">/ {{ normalizedGrade?.maxScore || 10 }}</span>
                            </div>
                            <p class="text-base leading-relaxed text-slate-200">{{ normalizedGrade?.feedback }}</p>
                        </div>
                    </div>

                </div>

                <div class="mt-auto pt-4">
                    <button class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-lg transition-all shadow-lg" @click="nextQuestion">Next Question ></button>
                </div>
            </div>

        </div>
    </main>
  </div>
</template>
