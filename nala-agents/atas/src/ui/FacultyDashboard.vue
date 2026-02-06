<template>
  <div class="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
    <!-- Header -->
    <div class="flex-none bg-indigo-900 text-white p-4 flex items-center justify-between shadow-md">
       <div class="flex items-center gap-3">
          <div class="p-2 bg-indigo-800 rounded-lg">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
          </div>
          <div>
            <h1 class="font-bold text-lg">Faculty Dashboard</h1>
            <p class="text-xs text-indigo-300">{{ courseCode }} - {{ semester }}</p>
          </div>
       </div>
       <div class="flex gap-4">
           <!-- Tab Nav -->
           <nav class="flex bg-indigo-800 rounded-lg p-1">
               <button 
                 v-for="tab in tabs" :key="tab.id"
                 @click="activeTab = tab.id"
                 class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
                 :class="activeTab === tab.id ? 'bg-white text-indigo-900 shadow-sm' : 'text-indigo-200 hover:text-white'"
               >
                 {{ tab.label }}
               </button>
           </nav>
           <button @click="$emit('close')" class="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg font-bold text-sm transition-colors border border-indigo-600">
              Exit
           </button>
       </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
       <div class="max-w-6xl mx-auto">
           
           <!-- TAB: OVERVIEW / SETTINGS -->
           <div v-if="activeTab === 'settings'" class="space-y-6">
              
              <!-- 1. Course Context Card -->
              <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-start justify-between">
                  <div>
                      <h3 class="text-lg font-bold text-gray-900 mb-1">{{ courseCode }} - {{ courseName || 'Course Name' }}</h3>
                      <div class="flex items-center gap-4 text-sm text-gray-500 font-mono">
                          <span class="px-2 py-1 bg-gray-100 rounded text-gray-700 font-bold">{{ academicYear }}</span>
                          <span class="px-2 py-1 bg-gray-100 rounded text-gray-700 font-bold">{{ semester }}</span>
                      </div>
                  </div>
                  <div class="text-right">
                      <span class="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wide">Active</span>
                  </div>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- 2. Appearance (Icon) -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🎨</span> Course Appearance
                    </h3>
                    
                    <div class="flex items-start gap-4 mb-4">
                        <!-- Preview -->
                        <div class="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 flex-none overflow-hidden flex items-center justify-center">
                            <img v-if="config.iconUrl" :src="config.iconUrl" class="w-full h-full object-cover" @error="handleImageError">
                            <span v-else class="text-2xl opacity-20">🖼️</span>
                        </div>
                        <div class="flex-1 space-y-3">
                             <div>
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Icon URL</label>
                                <input v-model="config.iconUrl" type="text" class="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono" placeholder="https://...">
                             </div>
                             <div class="flex gap-2">
                                 <button class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                    Upload Image
                                 </button>
                                 <button class="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                                    Generate AI
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Persona / Prompt -->
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <h3 class="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <span>🧠</span> AI Persona & Configuration
                    </h3>
                    <div class="space-y-4">
                      <div>
                          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">System Prompt</label>
                          <textarea v-model="config.promptTemplate" rows="6" class="w-full border border-gray-300 rounded-lg p-3 text-xs font-mono leading-relaxed" placeholder="You are a helpful tutor..."></textarea>
                          <p class="text-[10px] text-gray-400 mt-1">Defines the behavior of the AI Tutor for this specific course.</p>
                      </div>
                      <div>
                          <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Custom API Key (Optional)</label>
                          <input v-model="config.apiKey" type="password" class="w-full border border-gray-300 rounded-lg p-2 text-xs" placeholder="Overwrite global env key">
                      </div>
                    </div>
                </div>
              </div>

               <div class="flex justify-end pt-4 border-t border-gray-200 mt-6">
                  <button @click="saveConfig" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95">
                      Save All Changes
                  </button>
               </div>
           </div>

           <!-- TAB: SETS -->
           <div v-if="activeTab === 'sets'" class="space-y-6">
               <div class="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                   <h3 class="font-bold text-gray-800">Manage Question Sets</h3>
                   <button @click="addNewSet" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2">
                       <span>+</span> New Set
                   </button>
               </div>

               <div class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                   <table class="w-full text-left border-collapse">
                       <thead>
                           <tr class="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                               <th class="p-4 w-16 text-center">Order</th>
                               <th class="p-4 w-20">ID</th>
                               <th class="p-4">Set Name</th>
                               <th class="p-4 w-24 text-center">Status</th>
                               <th class="p-4 w-32 text-right">Actions</th>
                           </tr>
                       </thead>
                       <tbody class="divide-y divide-gray-100">
                           <tr v-for="(set, index) in sets" :key="set.set_id" class="hover:bg-gray-50 transition-colors group">
                               <td class="p-4 text-center">
                                   <div class="flex flex-col gap-1 items-center justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                                       <button @click="moveSet(set, -1)" :disabled="index === 0" class="hover:text-indigo-600 disabled:opacity-20">▲</button>
                                       <span class="text-xs font-mono font-bold text-gray-400">{{ set.sequence_order }}</span>
                                       <button @click="moveSet(set, 1)" :disabled="index === sets.length - 1" class="hover:text-indigo-600 disabled:opacity-20">▼</button>
                                   </div>
                               </td>
                               <td class="p-4 font-mono text-xs text-gray-500">#{{ set.set_id }}</td>
                               <td class="p-4">
                                   <input v-model="set.name" @change="updateSet(set)" type="text" class="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none transition-colors py-1 text-sm font-medium text-gray-700 placeholder-gray-400" placeholder="Set Name">
                               </td>
                               <td class="p-4 text-center">
                                   <button @click="toggleSetVisibility(set)" :class="set.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'" class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors">
                                       {{ set.is_visible ? 'Active' : 'Hidden' }}
                                   </button>
                               </td>
                               <td class="p-4 text-right">
                                   <button @click="confirmDeleteSet(set)" class="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete Set">
                                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                                   </button>
                               </td>
                           </tr>
                           <tr v-if="sets.length === 0">
                               <td colspan="5" class="p-8 text-center text-gray-400 text-sm italic">
                                   No question sets found. Create one to get started.
                               </td>
                           </tr>
                       </tbody>
                   </table>
               </div>
           </div>

           <!-- TAB: QUESTIONS -->
           <div v-else-if="activeTab === 'questions'" class="space-y-6">
               <div class="flex items-center gap-4">
                   <select v-model="selectedSetId" @change="fetchQuestions" class="bg-white border border-gray-300 rounded-lg p-2 text-sm font-bold text-gray-700">
                       <option :value="null" disabled>Select Question Set...</option>
                       <option v-for="s in sets" :key="s.set_id" :value="s.set_id">{{ s.name }} (Set {{ s.set_id }})</option>
                   </select>
                   <button v-if="selectedSetId" @click="openQuestionModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">
                       + Add Question
                   </button>
               </div>

               <div v-if="questions.length === 0" class="text-center py-12 text-gray-400">
                   {{ selectedSetId ? 'No questions in this set.' : 'Select a set to manage questions.' }}
               </div>

               <div v-else class="grid grid-cols-1 gap-4">
                   <div v-for="q in questions" :key="q.id" class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-start justify-between group hover:border-indigo-300 transition-colors">
                       <div class="flex-1">
                           <div class="flex items-center gap-2 mb-1">
                               <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{{ q.id }}</span>
                               <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" :class="getDiffColor(q.difficulty)">L{{ q.difficulty }}</span>
                               <span class="text-xs text-gray-400 font-mono">{{ q.type }}</span>
                           </div>
                           <p class="text-gray-900 font-medium text-sm line-clamp-2">{{ q.question_text }}</p>
                       </div>
                       <div class="flex flex-col gap-2">
                           <button @click="openQuestionModal(q)" class="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg">Edit</button>
                           <button @click="deleteQuestion(q.id)" class="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-3 py-1.5 rounded-lg">Delete</button>
                       </div>
                   </div>
               </div>
           </div>

           <!-- TAB: ANALYTICS -->
           <div v-else-if="activeTab === 'analytics'" class="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
               <div class="p-6 border-b border-gray-100">
                   <h3 class="text-lg font-bold text-gray-900">Student Performance</h3>
                   <p class="text-sm text-gray-500">Aggregate metrics per question.</p>
               </div>
               <table class="w-full text-sm text-left">
                   <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                       <tr>
                           <th class="px-6 py-3">Question ID</th>
                           <th class="px-6 py-3 text-right">Attempts</th>
                           <th class="px-6 py-3 text-right">Avg Tries</th>
                           <th class="px-6 py-3 text-right">Success Rate</th>
                       </tr>
                   </thead>
                   <tbody class="divide-y divide-gray-100">
                       <tr v-for="stat in analytics" :key="stat.question_id" class="hover:bg-gray-50">
                           <td class="px-6 py-4 font-mono font-medium">{{ stat.question_id }}</td>
                           <td class="px-6 py-4 text-right">{{ stat.total_attempts }}</td>
                           <td class="px-6 py-4 text-right">{{ Number(stat.avg_tries).toFixed(1) }}</td>
                           <td class="px-6 py-4 text-right">
                               <span class="font-bold" :class="stat.success_rate > 0.7 ? 'text-green-600' : (stat.success_rate < 0.4 ? 'text-red-600' : 'text-yellow-600')">
                                   {{ (stat.success_rate * 100).toFixed(0) }}%
                               </span>
                           </td>
                       </tr>
                   </tbody>
               </table>
           </div>

       </div>
    </div>

    <!-- Question Modal -->
    <div v-if="editingQuestion" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div class="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 class="text-lg font-bold">Edit Question</h3>
                <button @click="editingQuestion = null" class="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div class="p-6 overflow-y-auto space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">ID (Unique)</label>
                        <input v-model="editingQuestion.id" class="w-full border rounded p-2 text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Difficulty (1-6)</label>
                        <input v-model.number="editingQuestion.difficulty" type="number" min="1" max="6" class="w-full border rounded p-2 text-sm">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Question Text</label>
                    <textarea v-model="editingQuestion.question_text" rows="3" class="w-full border rounded p-2 text-sm"></textarea>
                </div>
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Context (Background)</label>
                     <textarea v-model="editingQuestion.context" rows="2" class="w-full border rounded p-2 text-sm" placeholder="e.g. Mathematical Analysis Context"></textarea>
                </div>
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Hint / Fallback Question</label>
                     <input v-model="editingQuestion.hint" class="w-full border rounded p-2 text-sm">
                </div>
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Explanation</label>
                     <textarea v-model="editingQuestion.explanation" rows="2" class="w-full border rounded p-2 text-sm"></textarea>
                </div>
                <!-- Simple JSON Editors for complex fields -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Media (JSON)</label>
                     <textarea v-model="editingJSON.media" rows="2" class="w-full border rounded p-2 text-xs font-mono bg-gray-50"></textarea>
                </div>
                <!-- Options (MCQ) -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Options (JSON Array - MCQ Only)</label>
                     <textarea v-model="editingJSON.options" rows="1" class="w-full border rounded p-2 text-xs font-mono bg-gray-50" placeholder='["Option A", "Option B"]'></textarea>
                </div>
                <!-- Answer Key -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Answer Key (JSON Array)</label>
                     <textarea v-model="editingJSON.answerKey" rows="1" class="w-full border rounded p-2 text-xs font-mono bg-gray-50" placeholder='["Correct Answer"]'></textarea>
                </div>
            </div>
            <div class="p-6 border-t border-gray-100 flex justify-end gap-3">
                <button @click="editingQuestion = null" class="text-gray-500 font-bold text-sm">Cancel</button>
                <button @click="saveQuestion" class="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">Save Changes</button>
            </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps({
  courseCode: String,
  semester: String,
  userId: String
});

const emit = defineEmits(['close']);

const tabs = [
    { id: 'settings', label: 'Settings' },
    { id: 'sets', label: 'Sets' },
    { id: 'questions', label: 'Questions' },
    { id: 'analytics', label: 'Analytics' }
];
const activeTab = ref('settings');

const config = ref({ iconUrl: '', promptTemplate: '', apiKey: '' });
// Context Data for Display
const courseName = ref('');
const academicYear = ref('AY2025'); 

const sets = ref([]);
const questions = ref([]);
const analytics = ref([]);
const selectedSetId = ref(null);

const editingQuestion = ref(null);
const editingJSON = ref({ media: '{}', answerKey: '[]', options: '[]' }); // Helper for JSON fields

const handleImageError = (e) => {
    e.target.style.opacity = '0.3';
};

// --- DIFF COLORS ---
const getDiffColor = (d) => {
    if (d <= 2) return 'bg-green-100 text-green-700';
    if (d <= 4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
};

// --- API ---
const fetchData = async () => {
    // 1. Config
    const cRes = await fetch(`/atas/api/config`);
    if (cRes.ok) {
        const d = await cRes.json();
        config.value = { 
            iconUrl: d.iconUrl || '', 
            promptTemplate: d.promptTemplate || '', 
            apiKey: '' 
        };
        // Populate Context
        if (d.courseName) courseName.value = d.courseName;
        if (d.academicYear) academicYear.value = d.academicYear;
    }

    // 2. Sets
    try {
        const sRes = await fetch(`/atas/api/sets/${props.courseCode}?userId=${props.userId}&academicYear=${academicYear.value}&semester=${props.semester}`);
        if (sRes.ok) {
            sets.value = await sRes.json();
            sets.value.forEach((s, i) => { if (!s.sequence_order) s.sequence_order = i + 1; });
            sets.value.sort((a,b) => a.sequence_order - b.sequence_order);
        }
    } catch (e) {
        console.warn("Sets Fetch Error", e);
    }

    // 3. Analytics
    try {
        const aRes = await fetch(`/atas/api/analytics/${props.courseCode}?userId=${props.userId}&academicYear=${academicYear.value}&semester=${props.semester}`);
        if (aRes.ok) {
            const d = await aRes.json();
            analytics.value = d.stats;
        }
    } catch (e) {
        console.warn("Analytics Fetch Error", e);
    }
};

const saveConfig = async () => {
    await fetch(`/atas/api/courses/${props.courseCode}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: props.userId,
            academicYear: 'AY2025', semester: 'Semester 2', // Hardcoded for prototype context
            config: config.value
        })
    });
    alert('Configuration Saved');
};

const updateSet = async (set) => {
    await fetch(`/atas/api/sets/${props.courseCode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId: props.userId,
            academicYear: 'AY2025', semester: 'Semester 2',
            set: set
        })
    });
};

const toggleSetVisibility = (set) => {
    set.is_visible = !set.is_visible;
    updateSet(set);
};

const moveSet = (set, dir) => {
    // Basic reorder logic (swap sequence)
    // For prototype, we just change the number and save
    set.sequence_order += dir;
    updateSet(set);
    sets.value.sort((a,b) => a.sequence_order - b.sequence_order);
};

const addNewSet = async () => {
    // Generate UUID for Set ID logic? 
    // Wait, Sets table uses `set_id` INTEGER? Or did we migrate?
    // DB Schema says `set_id INTEGER`. 
    // Strategy: We keep Integer for `set_id` (Sets are small, scoped to course), 
    // but use UUID for `id`? `question_sets` uses `id INTEGER PRIMARY KEY`.
    // The previous implementation used `set_id` as external ID.
    // Switching `set_id` to UUID might break Schema if defined as INTEGER.
    // DB Schema: `set_id INTEGER NOT NULL`.
    // OK, for Sets, let's stick to Integer ID (Max + 1) for now as it's scoped and ordered.
    // BUT for Questions, Schema says `id TEXT PRIMARY KEY`. We CAN usage UUID there.
    // So ONLY update Questions to use UUID.
    
    // Create new Set (Integer ID still best for "Module 1", "Module 2" workflow unless we change UI to freeform).
    // Let's stick to auto-increment Integer for Sets for user friendliness (Set 1, Set 2).
    const newId = sets.value.length > 0 ? Math.max(...sets.value.map(s => s.set_id)) + 1 : 1;
    const maxSeq = sets.value.length > 0 ? Math.max(...sets.value.map(s => s.sequence_order)) : 0;
    
    const newSet = { 
        set_id: newId, 
        name: `Module ${newId}`, 
        sequence_order: maxSeq + 1, 
        is_visible: 0 
    };

    sets.value.push(newSet);
    await updateSet(newSet);
};

const confirmDeleteSet = async (setRow) => {
    if (!confirm(`Are you sure you want to delete "${setRow.name}"? This action cannot be undone.`)) return;
    
    try {
        const query = new URLSearchParams({ 
            userId: props.userId, 
            academicYear: 'AY2025', semester: 'Semester 2' 
        });
        const res = await fetch(`/atas/api/sets/${props.courseCode}/${setRow.set_id}?${query}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            sets.value = sets.value.filter(s => s.set_id !== setRow.set_id);
            // Re-normalize order
            sets.value.forEach((s, i) => {
                s.sequence_order = i + 1;
                updateSet(s); // Background update
            });
        }
    } catch (e) {
        alert("Deletion failed");
    }
};

// --- QUESTIONS ---
const fetchQuestions = async () => {
    if (!selectedSetId.value) return;
    const res = await fetch(`/atas/api/courses/${props.courseCode}/questions?setId=${selectedSetId.value}`);
    if (res.ok) questions.value = await res.json();
};

const openQuestionModal = (q = null) => {
    if (q) {
        editingQuestion.value = JSON.parse(JSON.stringify(q)); // Deep copy
        editingJSON.value.media = JSON.stringify(q.media || {}, null, 2);
        editingJSON.value.answerKey = JSON.stringify(q.answerKey || q.answer_key || [], null, 2);
        editingJSON.value.options = JSON.stringify(q.options || [], null, 2);
    } else {
        // New: Use UUID for production readiness
        editingQuestion.value = {
            id: crypto.randomUUID(), 
            question_id: `Q${questions.value.length + 1}`,
            course_code: props.courseCode,
            academic_year: 'AY2025', semester: 'Semester 2',
            set_id: selectedSetId.value,
            question_text: 'New Question',
            type: 'text',
            type: 'text',
            difficulty: 1,
            context: '',
            media: null
        };
        editingJSON.value.media = '{}';
        editingJSON.value.answerKey = '[]';
        editingJSON.value.options = '[]';
    }
};

const saveQuestion = async () => {
    try {
        // Validation / Parse JSON fields
        try {
            editingQuestion.value.media = JSON.parse(editingJSON.value.media);
        } catch(e) { throw new Error("Invalid format in 'Media' field. Must be valid JSON."); }
        
        try {
            editingQuestion.value.answerKey = JSON.parse(editingJSON.value.answerKey);
        } catch(e) { throw new Error("Invalid format in 'Answer Key' field. Must be valid JSON Array."); }
        
        try {
            editingQuestion.value.options = JSON.parse(editingJSON.value.options);
        } catch(e) { throw new Error("Invalid format in 'Options' field. Must be valid JSON Array."); }
        
        const res = await fetch(`/atas/api/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: props.userId,
                question: editingQuestion.value
            })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Save Failed: " + res.statusText);
        }

        editingQuestion.value = null;
        fetchQuestions(); // Refresh
    } catch (e) {
        alert(e.message);
    }
};

const deleteQuestion = async (id) => {
    if(!confirm('Delete this question?')) return;
    await fetch(`/atas/api/questions/${id}?userId=${props.userId}&courseCode=${props.courseCode}&academicYear=AY2025&semester=Semester%202`, {
        method: 'DELETE'
    });
    fetchQuestions();
};


onMounted(() => {
    fetchData();
});
</script>
