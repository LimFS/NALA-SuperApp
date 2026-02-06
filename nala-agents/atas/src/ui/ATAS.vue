<template>
  <div class="h-full flex flex-col bg-gray-50 text-gray-900 font-sans">
    
    <!-- 1. Header Area with Dynamic Course Info -->
    <!-- Responsive: Default h-auto for mobile wrapping, md:h-16 fixed. Padding adjusted. -->
    <div class="flex-none bg-white border-b border-gray-200 flex flex-col md:flex-row items-center justify-between px-4 py-3 md:px-6 md:py-0 shadow-sm gap-3 md:gap-0 sticky top-0 z-10">
      <div class="flex items-center gap-2 w-full md:w-auto">
        <!-- Dynamic Course Icon -->
        <a href="http://localhost:8000" class="mr-3 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 transition-colors" title="Back to Dashboard">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        </a>
        <div class="w-8 h-8 rounded shrink-0 bg-gray-100 overflow-hidden shadow-sm border border-gray-200">
           <img v-if="displayIcon" :src="displayIcon" alt="Course Icon" class="w-full h-full object-cover">
           <div v-else class="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
             {{ courseCode?.substring(0, 2) || 'AT' }}
           </div>
        </div>
        
        <div class="flex flex-col leading-tight min-w-0">
          <h1 class="font-bold text-base md:text-lg tracking-tight flex items-center gap-2 truncate">
            {{ courseCode }} 
            <span class="text-gray-300 font-light hidden sm:inline">|</span>
            <span class="text-gray-600 font-normal text-sm md:text-base truncate hidden sm:inline">{{ courseName }}</span>
          </h1>
          <span class="text-[10px] text-purple-600 font-bold uppercase tracking-wider truncate">
             {{ greeting }}, {{ fetchedUserName }}
          </span>
        </div>
      </div>
      
      <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
        <!-- Settings Button (API Key) -->
        <button @click="showSettings = true" class="p-2 text-gray-400 hover:text-purple-600 transition-colors" title="Settings">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>

        <div class="text-right">
          <div class="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">Progress</div>
          <div class="text-sm font-bold tabular-nums text-purple-700">{{ questionCount }}/{{ maxQuestions }}</div>
        </div>
        <div class="w-full md:w-32 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200 flex-1 md:flex-none max-w-[150px]">
          <div 
            class="h-full bg-purple-600 transition-all duration-500 ease-out" 
            :style="{ width: `${(questionCount / maxQuestions) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
    
    <!-- Settings Modal -->
    <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 class="text-lg font-bold mb-4">Settings</h3>
        
        <p class="text-sm text-gray-600 mb-6">
           The AI Tutor is active and managed by the secure backend.
        </p>

        <div class="mb-6 pt-4 border-t border-gray-100">
           <button @click="resetTestAndClose" class="w-full bg-red-50 text-red-600 hover:bg-red-100 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
             Reset Progress (Demo Mode)
           </button>
        </div>

        <div class="flex justify-end">
           <button @click="showSettings = false" class="text-gray-500 px-4 py-2 hover:bg-gray-100 rounded-lg font-medium">Close</button>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <!-- Responsive: p-4 for mobile, p-6 for desktop. -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col items-center">
      
      <!-- Error Boundary Display -->
      <div v-if="errorState" class="w-full max-w-2xl bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <h3 class="text-red-800 font-bold mb-2">Something went wrong</h3>
        <p class="text-red-600 text-sm mb-4">{{ errorState }}</p>
        <button @click="resetTest" class="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-200">Reset Session</button>
      </div>

      <!-- Summary / End Screen -->
      <div v-else-if="isComplete" class="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
        <div class="bg-gray-900 p-6 md:p-8 text-center text-white">
          <div class="text-5xl md:text-6xl mb-4">🏆</div>
          <h2 class="text-2xl md:text-3xl font-bold mb-2">Course Complete!</h2>
          <p class="text-gray-400 text-sm md:text-base">Performance Report for {{ courseCode }}</p>
        </div>
        <div class="p-6 md:p-8">
           <!-- ... (stats same as before) ... -->
           <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-8">
             <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
               <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Final Bloom's Level</div>
               <div class="text-2xl md:text-3xl font-black text-purple-600">Level {{ currentDifficulty }}</div>
             </div>
             <div class="p-4 bg-gray-50 rounded-xl border border-gray-100 text-center">
               <div class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Questions</div>
               <div class="text-2xl md:text-3xl font-black text-gray-800">{{ questionCount + maxQuestions }}</div> <!-- Total Hack: assume set 1 count was maxQuestions -->
             </div>
           </div>
           
           <button @click="resetTest" class="w-full mt-4 bg-purple-600 text-white py-3 md:py-4 rounded-xl font-bold hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">Start New Session</button>
        </div>
      </div>

      <!-- NEW: Module Transition Screen -->
      <div v-else-if="showModuleTransition" class="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-purple-100 animate-in fade-in zoom-in duration-300 transform scale-100">
        <div class="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-center text-white relative overflow-hidden">
           <!-- Confetti/Decor -->
           <div class="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
           
           <div class="text-5xl mb-4 animate-bounce">🎉</div>
           <h2 class="text-3xl font-bold mb-2">Congratulations, {{ studentName }}!</h2>
           <p class="text-purple-100 text-lg">You have mastered the Fundamentals.</p>
        </div>
        
        <div class="p-8">
           <div class="flex items-center justify-center gap-8 mb-8">
              <div class="text-center">
                 <div class="text-4xl font-black text-gray-800 mb-1">{{ maxQuestions }}</div>
                 <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Questions Cleared</div>
              </div>
              <div class="w-px h-12 bg-gray-200"></div>
              <div class="text-center">
                 <div class="text-4xl font-black text-green-500 mb-1">100%</div>
                 <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">Completion</div>
              </div>
           </div>
           
           <div class="bg-purple-50 rounded-xl p-6 border border-purple-100 mb-8">
              <h4 class="font-bold text-purple-900 mb-2 flex items-center gap-2">
                 <span class="bg-purple-200 text-purple-700 rounded p-1 text-xs">NEXT MODULE</span>
                 Vectors & Linear Algebra
              </h4>
              <p class="text-sm text-purple-700">Get ready to apply your calculus knowledge to multi-dimensional space. We will cover dot products, cross products, and vector fields.</p>
           </div>

           <button @click="startNextModule" class="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-xl hover:shadow-2xl flex items-center justify-center gap-2 group">
              Continue Learning
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
           </button>
        </div>
      </div>

      <!-- Active Test Interface -->
      <div v-else class="w-full max-w-3xl space-y-4 md:space-y-6">
        
        <!-- 2. Question Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden relative group">
          <!-- Difficulty Badge -->
          <div class="absolute top-0 right-0 p-3 md:p-4 z-10">
             <span class="inline-flex items-center px-2 py-1 md:px-3 rounded-full text-[10px] md:text-xs font-bold bg-gray-100/90 backdrop-blur-sm text-gray-600 border border-gray-200 shadow-sm">
               <span class="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full mr-2" :class="getDifficultyColor(currentDifficulty)"></span>
               L{{ currentDifficulty }}: {{ getBloomsLabel(currentDifficulty) }}
             </span>
          </div>

          <div class="p-5 md:p-8 pt-10 md:pt-12">
            <!-- MEDIA SUPPORT (Images/Video) -->
            <!-- Prominently displayed at the top aka 'Above Question' as requested -->
            <div v-if="currentQuestion.media" class="mb-6 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
              <img 
                v-if="currentQuestion.media.type === 'image'" 
                :src="currentQuestion.media.url" 
                :alt="currentQuestion.media.alt || 'Question Image'"
                class="w-full h-auto max-h-[300px] object-contain mx-auto"
                loading="lazy"
                @error="handleMediaError"
              />
              <video 
                v-else-if="currentQuestion.media.type === 'video'" 
                controls 
                class="w-full h-auto max-h-[300px] mx-auto"
              >
                <source :src="currentQuestion.media.url" type="video/mp4">
                Your browser does not support the video tag.
              </video>
            </div>

            <!-- Context / Background Info -->
            <div v-if="currentQuestion.context" class="mb-4 md:mb-6 pl-3 md:pl-4 border-l-4 border-purple-200 py-1">
              <p class="text-[10px] md:text-xs font-bold text-purple-900 uppercase tracking-wide mb-1 opacity-70">Background Context</p>
              <p class="text-sm md:text-base text-gray-700 italic leading-relaxed">{{ currentQuestion.context }}</p>
            </div>

            <!-- Actual Question -->
            <h3 class="text-xl md:text-2xl font-medium text-gray-900 leading-relaxed font-serif">
              {{ currentQuestion.question_text }}
            </h3>
          </div>
        </div>

        <!-- 3. Answer Area -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 md:p-6">
            <!-- Interactive Input Area -->
            <!-- Supports Text Input or MCQ based on 'type' -->
            <!-- Interactive Input Area -->
            <!-- Supports Text Input or MCQ based on 'type' -->
            <div class="mb-6">
              
              <!-- MCQ Options -->
              <div v-if="currentQuestion.type === 'mcq'" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  v-for="(option, idx) in currentQuestion.options" 
                  :key="idx"
                  @click="!feedback && (userAnswer = option)"
                  :disabled="!!feedback"
                  class="p-4 rounded-xl border text-left transition-all duration-200 flex items-center justify-between group"
                  :class="[
                    userAnswer === option 
                      ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-600 shadow-md' 
                      : 'border-gray-200 text-gray-700',
                    !feedback ? 'hover:border-purple-300 hover:bg-gray-50' : 'opacity-80 cursor-default'
                  ]"
                >
                  <span class="font-medium">{{ option }}</span>
                  <div class="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center transition-colors"
                    :class="userAnswer === option ? 'border-purple-600 bg-purple-600' : 'group-hover:border-purple-400'">
                    <div v-if="userAnswer === option" class="w-2 h-2 rounded-full bg-white"></div>
                  </div>
                </button>
              </div>

              <!-- Default Text Input -->
              <div v-else>
                <textarea 
                  v-model="userAnswer" 
                  :disabled="!!feedback"
                  class="w-full border border-gray-300 rounded-xl p-4 h-32 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none bg-white shadow-inner font-mono text-gray-800 disabled:bg-gray-50 disabled:text-gray-500" 
                  placeholder="Type your answer here... (LaTeX supported for math symbols)"
                ></textarea>
              </div>

            </div>

            <!-- Footer: Actions -->
            <div v-if="!feedback" class="flex flex-col gap-3 mt-4">
                 <button 
                   @click="submitAnswer" 
                   :disabled="!userAnswer"
                   class="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-purple-700 hover:shadow-xl active:scale-95 transition-all text-lg disabled:opacity-50 disabled:grayscale disabled:pointer-events-none flex items-center justify-center gap-2"
                 >
                   <span v-if="isGrading" class="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                   <span v-if="isGrading">{{ apiKey ? 'AI Tutor Analyzing...' : 'Grading...' }}</span>
                   <span v-else>Submit Response &rarr;</span>
                 </button>
            </div>
        </div>

        <!-- 4. Feedback Area -->
        <transition
          enter-active-class="transition ease-out duration-300"
          enter-from-class="opacity-0 translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
        >
          <div v-if="feedback" class="rounded-2xl shadow-lg border overflow-hidden" :class="feedback.isCorrect ? 'bg-green-50 border-green-200 shadow-green-100' : 'bg-red-50 border-red-200 shadow-red-100'">
            <div class="p-4 md:p-6">
              <div class="flex items-start gap-4">
                <div class="flex-none p-2 md:p-3 rounded-full shadow-sm" :class="feedback.isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'">
                  <svg v-if="feedback.isCorrect" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                     <h4 class="text-base md:text-lg font-bold" :class="feedback.isCorrect ? 'text-green-900' : 'text-red-900'">
                       {{ feedback.isCorrect ? 'Correct Analysis' : 'Hint Available' }}
                     </h4>
                     <!-- AI Badge -->
                     <span v-if="feedback.usedAI" class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1"
                       :class="feedback.isCorrect ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'">
                       <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10H12V2z"/><path d="M12 2A10 10 0 0 0 2 12h10V2z"/></svg> 
                       AI Graded
                     </span>
                  </div>
                  <p class="text-sm leading-relaxed" :class="feedback.isCorrect ? 'text-green-800' : 'text-red-800'">
                    {{ feedback.explanation }}
                  </p>
                </div>
              </div>
            </div>
            
            <div class="bg-white/60 p-4 flex justify-end border-t backdrop-blur-sm" :class="feedback.isCorrect ? 'border-green-100' : 'border-red-100'">
              <button 
                @click="nextQuestion" 
                class="w-full sm:w-auto bg-gray-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                {{ feedback.isCorrect ? 'Next Challenge' : 'Try Again' }}
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </button>
            </div>
          </div>
        </transition>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onErrorCaptured } from 'vue';
// import velocityGraph from './assets/velocity_graph.png'; // Removed in favor of DB static path

// --- PROPS FOR GENERICITY ---
const props = defineProps({
  courseCode: { type: String, required: true },
  courseName: { type: String, required: true },
  semester: { type: String, required: true },
  courseIcon: { type: String, default: null },
  studentName: { type: String, default: 'Student' },
  questions: { type: Array, default: () => [] }
});

// --- USER & GREETING ---
const fetchedUserName = ref(props.studentName);
const greeting = ref('Welcome');
const fetchedQuestions = ref([]);

// Use absolute paths served from public/dist via Gateway
const mh1810Icon = '/atas/mh1810_math.png';
const riemannIcon = '/atas/mh1810_math.png'; // Using same placeholder for now or fix if riemann exists

// Fallback logic if prop is missing
const displayIcon = computed(() => {
   if (props.courseIcon) return props.courseIcon;
   if (props.courseCode === 'MH1810') return mh1810Icon;
   if (props.courseCode === 'MH2100') return riemannIcon;
   return null;
});

const updateGreeting = () => {
    const h = new Date().getHours();
    greeting.value = h < 12 ? 'Good Morning' : (h < 18 ? 'Good Afternoon' : 'Good Evening');
};


// Calculate Max Questions based on TOTAL questions available for the current Set
const maxQuestions = computed(() => {
    const source = props.questions.length > 0 ? props.questions : fetchedQuestions.value;
    if (!source) return 0;
    
    // Count questions belonging to the current set
    return source.filter(q => {
         const qSetId = q.set_id !== undefined ? q.set_id : (q.setId !== undefined ? q.setId : 1);
         return qSetId === currentSetId.value;
    }).length;
});
const promptTemplate = ref('');
const questionCount = ref(0); 
const currentDifficulty = ref(1); // Bloom's Level 1-6
const userAnswer = ref('');
const feedback = ref(null);
const isComplete = ref(false);
const currentQuestionIndex = ref(0); 
const currentSetId = ref(1); // 1 = Calculus, 2 = Vectors
const showModuleTransition = ref(false);

const getScopedKey = () => `atas_api_key_${props.courseCode || 'GLOBAL'}`;
const getScopedModelKey = () => `atas_model_pref_${props.courseCode || 'GLOBAL'}`;
const getScopedProgressKey = () => `atas_progress_${props.courseCode || 'GLOBAL'}`;

// --- COMPUTED QUESTION BANK (Bucket by Difficulty) ---
// --- COMPUTED QUESTION BANK (Flat Sorted List) ---
const questionBank = computed(() => {
    const source = props.questions.length > 0 ? props.questions : fetchedQuestions.value;
    if (!source || source.length === 0) return [];

    // Filter by Set ID
    const filtered = source.filter(q => {
        const qSetId = q.set_id !== undefined ? q.set_id : (q.setId !== undefined ? q.setId : 1);
        return qSetId === currentSetId.value;
    });

    // Sort by Difficulty ASC, then ID ASC (Natural Sort for "Q1", "Q2", "Q10")
    return filtered.sort((a, b) => {
        const diffA = a.difficulty || 1;
        const diffB = b.difficulty || 1;
        if (diffA !== diffB) return diffA - diffB;
        return (a.id || '').localeCompare(b.id || '', undefined, { numeric: true });
    });
});

// Current Question Logic (Simple Indexing)
const currentQuestion = computed(() => {
    const list = questionBank.value;
    if (list.length === 0) return { 
        question_text: "No questions available for this module.",
        type: 'text', options: [], media: null, answerKey: []
    };
    // Ensure index is within bounds
    const idx = Math.min(Math.max(0, currentQuestionIndex.value), list.length - 1);
    return list[idx];
});

// Sync UI Difficulty Label with Current Question
watch(currentQuestion, (newQ) => {
    if (newQ && newQ.difficulty) {
        currentDifficulty.value = newQ.difficulty;
    }
});

// --- PROGRESS PERSISTENCE ---
import { watch } from 'vue';

// Use absolute path routed via Gateway to ensure correct targeting
const API_BASE = '/atas/api';

// Helper to get userId (Mocked as 'user1' or prop)
const getUserId = () => 'user1'; // Hardcoded for now, or match props.studentId if consistent

// Helper: Parse Semester Prop (e.g., "AY2025 Semester 2")
const getAySem = () => {
    const parts = props.semester.split(' Semester ');
    if (parts.length === 2) return { ay: parts[0], sem: `Semester ${parts[1]}` };
    return { ay: 'AY2025', sem: 'Semester 2' }; // Fallback
};

const saveProgress = async () => {
    // ... (rest of local/server save logic)
    const state = {
        questionCount: questionCount.value,
        currentDifficulty: currentDifficulty.value,
        currentQuestionIndex: currentQuestionIndex.value,
        currentSetId: currentSetId.value,
        showModuleTransition: showModuleTransition.value,
        isComplete: isComplete.value,
        timestamp: Date.now()
    };
    
    // 1. Local Persistence
    localStorage.setItem(getScopedProgressKey(), JSON.stringify(state));

    // 2. Server Persistence
    try {
        const { ay, sem } = getAySem();
        await fetch(`${API_BASE}/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: getUserId(),
                courseCode: props.courseCode,
                academicYear: ay,
                semester: sem,
                currentSetId: currentSetId.value,
                currentDifficulty: currentDifficulty.value,
                lastActiveQuestionUuid: currentQuestion.value?.id || null, 
                data: state
            })
        });
    } catch (e) {
        console.warn("ATA: Failed to save progress to server", e);
    }
};

const restoreProgress = async () => {
    // Strategy: Try Server First -> Fallback to LocalStorage
    try {
        const { ay, sem } = getAySem();
        const query = new URLSearchParams({ academicYear: ay, semester: sem });
        const res = await fetch(`${API_BASE}/progress/${props.courseCode}/${getUserId()}?${query}`);
        if (res.ok) {
            const json = await res.json();
            if (json.found && json.data) {
                const state = json.data;
                // Hydrate Store
                questionCount.value = state.questionCount ?? 0;
                currentDifficulty.value = state.currentDifficulty ?? 1;
                currentQuestionIndex.value = state.currentQuestionIndex ?? 0;
                currentSetId.value = state.currentSetId ?? 1;
                showModuleTransition.value = state.showModuleTransition ?? false;
                isComplete.value = state.isComplete ?? false;
                console.log("ATA: Progress Restored from SERVER", state);
                return; // Server sync successful
            }
        }
    } catch (e) {
        console.warn("ATA: Server restore failed, using local fallback", e);
    }

    // Fallback: LocalStorage
    const saved = localStorage.getItem(getScopedProgressKey());
    if (saved) {
        try {
            const state = JSON.parse(saved);
            questionCount.value = state.questionCount ?? 0;
            currentDifficulty.value = state.currentDifficulty ?? 1;
            currentQuestionIndex.value = state.currentQuestionIndex ?? 0;
            currentSetId.value = state.currentSetId ?? 1;
            showModuleTransition.value = state.showModuleTransition ?? false;
            isComplete.value = state.isComplete ?? false;
            console.log("ATA: Progress Restored from LOCAL", state);
        } catch (e) {
            console.warn("ATA: Failed to restore local progress", e);
        }
    }
};

// Auto-save on any meaningful state change
watch(
    [questionCount, currentDifficulty, currentSetId, showModuleTransition, isComplete], 
    saveProgress, 
    { deep: true }
);

// SELF-HEALING: Watch for invalid difficulty state
watch(() => questionBank.value, (bank) => {
    // If current difficulty is empty BUT we have other difficulties available
    // This happens when switching sets where difficulty ranges differ (e.g. Set 2 starts at L3)
    const currentList = bank[currentDifficulty.value] || [];
    if (currentList.length === 0) {
        const availableLevels = Object.keys(bank).map(Number).sort((a,b) => a-b);
        if (availableLevels.length > 0) {
            console.log(`ATA: Auto-correcting difficulty from ${currentDifficulty.value} to ${availableLevels[0]}`);
            currentDifficulty.value = availableLevels[0];
        }
    }
}, { deep: true, immediate: true });

const fetchConfig = async () => {
    try {
        const res = await fetch(`${API_BASE}/config/${props.courseCode}`);
        if (res.ok) {
            const cfg = await res.json();
            if (cfg.found) {
                if (cfg.maxQuestions) maxQuestions.value = cfg.maxQuestions;
                if (cfg.promptText) promptTemplate.value = cfg.promptText;
                // We could also set activeModel here if we wanted to enforce it
            }
        }
    } catch (e) {
        console.warn("ATA: Failed to fetch config", e);
    }
};

// Perform restore on mount (after props are ready)
onMounted(async () => {
    updateGreeting();
    // 1. Fetch Config
    await fetchConfig();

    // 2. Fetch User Code (Identity Propagation)
    try {
        // Use Global Gateway API to identify user
        const res = await fetch('/api/user/me');
        if (res.ok) {
            const user = await res.json();
            fetchedUserName.value = user.first_name || 'Student';
        }
    } catch (e) {
        console.warn("ATA: Failed to fetch user identity", e);
    }

    // 3. Fetch Questions (Self-contained Mode)
    if (props.questions.length === 0) {
        try {
            const fetchUrl = `${API_BASE}/courses/${props.courseCode}/questions`;
            console.log(`ATA: Fetching questions from [${fetchUrl}]...`);
            const qRes = await fetch(fetchUrl);
            if (qRes.ok) {
                const data = await qRes.json();
                console.log("ATA: Questions fetched:", data);
                if (Array.isArray(data)) {
                     fetchedQuestions.value = data;
                } else if (data.questions) {
                     fetchedQuestions.value = data.questions;
                }
            } else {
                 console.error("ATA: Questions fetch failed", qRes.status);
            }
        } catch (e) {
            console.error("ATA: Failed to fetch questions", e);
        }
    }

    restoreProgress();
});

const showSettings = ref(false);
const errorState = ref(null);

// MOCK_DB Removed - using props.questions via questionBank computed property

// MOCK_DB Removed - using props.questions via questionBank computed property  // Bloom Level 4: Analyze (MCQ Variant)
// MOCK_DB Removed - using props.questions via questionBank computed property

// --- ERROR HANDLING & SECURITY ---

// Capture any error in child components or rendering
onErrorCaptured((err) => {
  console.error("ATA Component Error:", err);
  errorState.value = "An unexpected error occurred in the testing module. Please contact support.";
  return false; // Prevent propgation
});

const handleMediaError = (e) => {
  // Gracefully handle broken images
  // e.target.style.display = 'none';
  e.target.style.border = '2px solid red';
  e.target.setAttribute('alt', 'Image Failed to Load');
  console.warn("Media failed to load:", e.target.src);
};

// Safely retrieve question with fallbacks
// Legacy definition removed.

// --- ACTIONS ---
const isGrading = ref(false); // Replaces isHintLoading for general grading state

const submitAnswer = async () => {
  if (!userAnswer.value) return; 
  if (isGrading.value) return;

  isGrading.value = true;
  
  // Simulate Network Grading / AI Processing Delay
  await new Promise(r => setTimeout(r, 1200));

  const validAnswers = currentQuestion.value.answerKey;
  const userVal = userAnswer.value.trim().toLowerCase();
  
  // Determine correctness and Feedback
  let isCorrect = false;
  let feedbackText = "";
  let usedAI = false;

  // 1. Attempt AI Grading (Only for Text Questions with Key)
  // Check if type is explicitly 'text' OR undefined (default). Only skip 'mcq'.
  // Note: We no longer check client-side apiKey.value as it's handled by backend.
  if (currentQuestion.value.type !== 'mcq') { 
     try {
       // Construct Prompt Safely
       // Construct Prompt Dynamic from Database
       let finalPrompt = promptTemplate.value;
       
       // Fallback if DB fetch failed or Prompt missing
       if (!finalPrompt) {
            finalPrompt = `You are a Socratic AI Tutor for University Calculus.
Context:
- Question: "{{questionText}}"
- Valid Answers: "{{answerKey}}" (Accept standard abbreviations like 'AUC' for Area Under Curve, typos, and conceptual equivalents).
- Teacher's Strategy: "{{hintPolicy}}"
- Full Explanation: "{{explanation}}"

Student Input: "{{studentAnswer}}"

Instructions:
1. ACCURACY: Check if the Student Input is conceptually correct. heavily penalize gibberish, but allow "auc", "area", "integral", etc. if they match the concept.
2. FEEDBACK: 
   - If CORRECT: Return { "correct": true, "feedback": "Brief confirmation + 1 sentence reinforcement." }
   - If INCORRECT: Return { "correct": false, "feedback": "A Socratic question or hint that guides them closer. DO NOT reveal the answer. Pivot off their specific wrong input if possible." }
3. Return ONLY valid JSON.`;
       }

       const promptText = finalPrompt
            .replace('{{questionText}}', currentQuestion.value.question_text || currentQuestion.value.text || '')
            .replace('{{answerKey}}', validAnswers.join(', '))
            .replace('{{studentAnswer}}', userVal)
            .replace('{{hintPolicy}}', currentQuestion.value.hint || 'Guide them toward the core concept.')
            .replace('{{explanation}}', currentQuestion.value.explanation || 'Explain why the answer is correct.');

       // Call Backend Proxy (No Client-Side Key)
       const url = `${API_BASE}/grade`; 

       let response = await fetch(url, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           contents: [{ parts: [{ text: promptText }] }]
         })
       });
       
       // SRE: Retry logic (omitted for proxy as backend handles connection)
       
       
       if (!response.ok) {
          const errData = await response.json();
          const errMsg = errData.error?.message || response.statusText;
          throw new Error(`API Error ${response.status}: ${errMsg}`);
       }

       const data = await response.json();
       
       // Check for safety blocks
       if (data.promptFeedback?.blockReason) {
          throw new Error(`Safety Block: ${data.promptFeedback.blockReason}`);
       }

       const textRes = data.candidates?.[0]?.content?.parts?.[0]?.text;
       
       if (textRes) {
          // Sanitize: Remove Markdown code fences if present
          let cleanText = textRes.trim();
          if (cleanText.startsWith('```')) {
             cleanText = cleanText.replace(/^```(json)?\n?/i, '').replace(/\n?```$/, '');
          }
          const result = JSON.parse(cleanText);
          // Robust boolean check
          isCorrect = (result.correct === true || result.correct === 'true' || 
                       result.isCorrect === true || result.isCorrect === 'true');
          feedbackText = result.feedback || result.explanation || "Graded by AI";
          usedAI = true; // Success
       } else {
          throw new Error("No candidates returned (Check Model)");
       }
       
       
     } catch (e) {
       console.error("AI Grading failed, falling back to standard logic", e);
       usedAI = false; 
       feedbackText = ""; // Clear so standard logic takes over 
     }
  }

  // 2. Fallback / Standard Logic (If AI was skipped or failed)
  if (!usedAI) {
      // Standard Correctness Check
      isCorrect = validAnswers.some(ans => {
         if (currentQuestion.value.type === 'mcq') {
            return ans === userAnswer.value; 
         }
         return userVal.includes(ans.toLowerCase());
      });

      // Standard Feedback Text Selection
      if (isCorrect) {
          if (!feedbackText) feedbackText = currentQuestion.value.explanation;
      } else {
          // Append debug info if it exists
          feedbackText = (feedbackText || "") + currentQuestion.value.hint; 
          
          // Special Mock Logic for Q4 (MCQ specific hints)
          if (currentQuestion.value.type === 'mcq' && userAnswer.value) {
             if (userAnswer.value.includes('B')) {
                feedbackText = "🤖 AI Tutor: I see you selected Point B. Recall that at Point B, velocity is zero (it crosses the axis), but look at the slope... is the graph flat there? Acceleration is the slope, not the value.";
             } else if (userAnswer.value.includes('A') && !userAnswer.value.includes('C')) {
                feedbackText = "🤖 AI Tutor: Point A is definitely a correct turning point! But look closely—is there another point on the graph that behaves just like A?";
             } else {
                feedbackText = "🤖 AI Tutor: Recall that Acceleration a(t) is the derivative v'(t). You are looking for points where the tangent line is horizontal.";
          }
      }
  }
  }

  // 3. Record Attempt (Analytics)
  try {
      if (currentQuestion.value.id) {
          fetch(`${API_BASE}/progress/attempt`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  userId: getUserId(),
                  courseCode: props.courseCode,
                  questionId: currentQuestion.value.id, 
                  setId: currentSetId.value,
                  isCorrect: isCorrect
              })
          }).catch(e => console.warn("Attempt record failed", e));
      }
  } catch (e) { console.warn("Attempt error", e); }

  // 4. Set UI State (Renumbered)
  feedback.value = {
     isCorrect: isCorrect, 
     explanation: feedbackText,
     usedAI: usedAI
  };
  
  if (isCorrect) {
     // Store pending state changes instead of applying them immediately
     feedback.value.pendingDifficultyUpdate = (currentDifficulty.value < 6); 
  }
  
  isGrading.value = false;
};

const nextQuestion = () => {
  if (feedback.value?.isCorrect) {
    // Standard Linear Progression: Just move to next question
    // Question Bank is already sorted by Difficulty -> ID
    
    questionCount.value++; 
    currentQuestionIndex.value++; 
    
    // Check for Set Completion
    // Use dynamic bank length for accuracy
    if (questionCount.value >= questionBank.value.length) {
      if (currentSetId.value === 1) {
         // Show Transition Screen instead of alert
         showModuleTransition.value = true;
      } else {
         isComplete.value = true;
      }
    }
  }
  // Clear state for next round
  feedback.value = null;
  userAnswer.value = '';
};

// Action to proceed from transition screen
const startNextModule = () => {
    const nextSetId = 2; // Move to Vectors
    currentSetId.value = nextSetId;
    showModuleTransition.value = false;
    
    // Auto-detect starting difficulty for this set
    const setQuestions = props.questions.filter(q => {
         const qSetId = q.set_id !== undefined ? q.set_id : (q.setId !== undefined ? q.setId : 1);
         return qSetId === nextSetId;
    });
    
    if (setQuestions.length > 0) {
        const minDiff = Math.min(...setQuestions.map(q => q.difficulty || 1));
        currentDifficulty.value = minDiff;
    } else {
        currentDifficulty.value = 1;
    }
    
    questionCount.value = 0;
    // user answer already cleared
};


const resetTest = () => {
    errorState.value = null;
    questionCount.value = 0;
    currentDifficulty.value = 1;
    isComplete.value = false;
    currentSetId.value = 1;
    userAnswer.value = '';
    feedback.value = null;
    currentQuestionIndex.value = 0; // Reset to first question for demo
    showModuleTransition.value = false;
    
    // Sync Reset State to Server
    saveProgress();
};

const resetTestAndClose = () => {
    if (confirm("Are you sure you want to reset all progress?")) {
        resetTest();
        showSettings.value = false;
    }
};

const checkAnswer = (input, keys) => {
  if (!input || !keys) return false;
  // Security: Input sanitation is handled by Vue's binding, but we treat it as text string here.
  // ReDoS Protection: keys are static, expected to be short strings.
  const normalized = input.toLowerCase().trim();
  return keys.some(k => normalized.includes(k.toLowerCase()));
};

// Helpers for UI
const getBloomsLabel = (level) => {
  const labels = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"];
  return labels[level - 1] || "Unknown";
};

const getDifficultyColor = (level) => {
  if (level <= 2) return "bg-green-500";
  if (level <= 4) return "bg-yellow-500";
  return "bg-purple-600";
};
</script>
