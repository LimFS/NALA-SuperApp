<template>
  <div class="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
    <!-- Header -->
    <div class="flex-none bg-indigo-900 text-white p-4 flex items-center justify-between shadow-md z-10">
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
                            <img v-if="config.iconUrl" :src="resolveMediaUrl(config.iconUrl)" class="w-full h-full object-cover" @error="handleImageError">
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
                          <form @submit.prevent>
                              <input v-model="config.apiKey" type="password" autocomplete="new-password" class="w-full border border-gray-300 rounded-lg p-2 text-xs" placeholder="Overwrite global env key">
                          </form>
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
                               <th class="p-4 w-48">Taxonomy</th>
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
                               <td class="p-4">
                                   <select v-model="set.difficulty_id" @change="updateSetTaxonomy(set)" class="w-full bg-transparent text-xs font-bold text-gray-600 border-none focus:ring-0 cursor-pointer">
                                       <option v-for="t in taxonomies" :key="t.uuid" :value="t.uuid">{{ t.taxonomy_name }}</option>
                                   </select>
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
                   <button v-if="selectedSetId" @click="openQuestionModal()" class="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm flex items-center gap-2">
                       <span>+</span> Add Question
                   </button>
                   <button v-if="selectedSetId" @click="openAiModal()" class="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-200 shadow-sm flex items-center gap-2 border border-purple-200">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                       AI Generate
                   </button>
                   <button v-if="selectedSetId" @click="console.log('Upload File Triggered')" class="bg-white text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm flex items-center gap-2 border border-gray-300">
                       <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                       Upload File
                   </button>
               </div>

               <div v-if="questions.length === 0" class="text-center py-12 text-gray-400">
                   {{ selectedSetId ? 'No questions in this set.' : 'Select a set to manage questions.' }}
               </div>

               <div v-else class="grid grid-cols-1 gap-4">
                   <div v-for="(q, index) in sortedQuestions" :key="q.id" class="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-start justify-between group hover:border-indigo-300 transition-colors">
                       <div class="flex-none flex flex-col items-center mr-4 gap-1 pt-1 opacity-20 group-hover:opacity-100 transition-opacity">
                            <button @click="moveQuestion(index, -1)" :disabled="index === 0" class="hover:text-indigo-600 disabled:opacity-0 hover:bg-indigo-50 rounded p-0.5">▲</button>
                            <span class="text-[10px] font-bold text-gray-400 font-mono">{{ index + 1 }}</span>
                            <button @click="moveQuestion(index, 1)" :disabled="index === sortedQuestions.length - 1" class="hover:text-indigo-600 disabled:opacity-0 hover:bg-indigo-50 rounded p-0.5">▼</button>
                       </div>
                       <div class="flex-1">
                           <div class="flex items-center gap-2 mb-1">
                               <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase">{{ q.context || 'General' }}</span>
                               <span class="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" :class="getDiffColor(q.difficultyLevel || q.difficulty)">L{{ q.difficultyLevel || q.difficulty }}: {{ q.difficultyLevelName || q.difficultyName || 'Level ' + (q.difficultyLevel || q.difficulty) }}</span>
                               <span class="text-xs text-gray-400 font-mono">{{ q.type }}</span>
                           </div>
                           <p class="text-gray-900 font-medium text-sm line-clamp-2">{{ q.question_text }}</p>
                       </div>
                       <div class="flex flex-col gap-2">
                           <button @click="toggleQuestionVisibility(q)" :class="q.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'" class="px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors">
                               {{ q.is_visible ? 'Active' : 'Hidden' }}
                           </button>
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
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50 text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th @click="sortTable('set_name')" class="px-6 py-3 cursor-pointer hover:text-indigo-600 select-none">Set Name <span v-if="sortBy === 'set_name'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                                <!-- Removed Q. ID Column as requested -->
                                <th @click="sortTable('question_text')" class="px-6 py-3 cursor-pointer hover:text-indigo-600 select-none">Question <span v-if="sortBy === 'question_text'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                                <th @click="sortTable('students_attempted')" class="px-6 py-3 text-right cursor-pointer hover:text-indigo-600 select-none">Students <span v-if="sortBy === 'students_attempted'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                                <th @click="sortTable('total_interactions')" class="px-6 py-3 text-right cursor-pointer hover:text-indigo-600 select-none">Total Tries <span v-if="sortBy === 'total_interactions'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                                <th @click="sortTable('avg_tries')" class="px-6 py-3 text-right cursor-pointer hover:text-indigo-600 select-none">Avg Tries <span v-if="sortBy === 'avg_tries'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                                <th @click="sortTable('success_rate')" class="px-6 py-3 text-right cursor-pointer hover:text-indigo-600 select-none">Success <span v-if="sortBy === 'success_rate'">{{ sortDesc ? '▼' : '▲' }}</span></th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            <tr v-for="stat in sortedAnalytics" :key="stat.question_id" class="hover:bg-gray-50">
                                <td class="px-6 py-4 font-medium text-gray-900">{{ stat.set_name }}</td>
                                <!-- Removed ID Cell -->
                                <td class="px-6 py-4">
                                    <div class="max-w-xs">
                                        <div class="truncate font-medium text-gray-800" :title="stat.question_text">{{ stat.question_text }}</div>
                                        <div v-if="stat.context" class="text-xs text-gray-500 truncate italic mt-0.5" :title="stat.context">{{ stat.context }}</div>
                                    </div>
                                </td>
                                <td class="px-6 py-4 text-right">{{ stat.students_attempted }}</td>
                                <td class="px-6 py-4 text-right">{{ stat.total_interactions }}</td>
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
    </div>

    <!-- AI Generate Modal -->
    <div v-if="showAiModal" class="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <!-- Header -->
            <div class="bg-indigo-900 text-white p-4 flex justify-between items-center">
                 <h3 class="font-bold flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                    AI Generator
                 </h3>
                 <button @click="closeAiModal" class="text-indigo-200 hover:text-white">✕</button>
            </div>
            
            <!-- Body -->
            <div class="p-6 space-y-4">
                <!-- Context Info (Read-Only) -->
                <div class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm space-y-1">
                    <div class="flex justify-between">
                        <span class="text-gray-500 font-bold uppercase text-[10px]">Target Set</span>
                        <span class="font-bold text-gray-800">{{ getSetName(selectedSetId) }}</span>
                    </div>
                    <div class="flex justify-between">
                         <span class="text-gray-500 font-bold uppercase text-[10px]">Taxonomy</span>
                         <span class="font-mono text-indigo-600 font-bold">{{ getSetTaxonomy(selectedSetId) }}</span>
                    </div>
                </div>

                <!-- Counts -->
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">MCQ Questions</label>
                        <input v-model.number="aiConfig.mcqCount" type="number" min="0" max="20" class="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Default: 2">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Text Questions</label>
                        <input v-model.number="aiConfig.textCount" type="number" min="0" max="20" class="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="Default: 5">
                    </div>
                </div>

                <!-- Media -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Include Media?</label>
                     <select v-model="aiConfig.mediaPreference" class="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white">
                        <option value="default">As Needed (Default)</option>
                        <option value="yes">Yes (Prioritize Visuals)</option>
                        <option value="no">No (Text Only)</option>
                     </select>
                </div>

                <!-- Instructions -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Instructions / Topic Focus</label>
                     <textarea v-model="aiConfig.instructions" rows="3" class="w-full border border-gray-300 rounded-lg p-2 text-sm" placeholder="e.g. Focus on Carnot Cycle efficiency..."></textarea>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button @click="closeAiModal" class="px-4 py-2 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-lg">Cancel</button>
                <button @click="runAiGeneration" :disabled="isGenerating" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-md transition-all flex items-center gap-2">
                    <span v-if="isGenerating" class="animate-spin">⏳</span>
                    <span>{{ isGenerating ? 'Generating...' : 'Generate Questions' }}</span>
                </button>
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
                <!-- Media -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1">Media Attachment</label>
                     <div class="flex items-center gap-4 mb-2 text-xs">
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" v-model="mediaType" value="link"> 
                            <span>Image Link</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" v-model="mediaType" value="upload"> 
                            <span>Upload Image</span>
                        </label>
                        <label class="flex items-center gap-2 cursor-pointer">
                            <input type="radio" v-model="mediaType" value="video"> 
                            <span>Video Link (YouTube)</span>
                        </label>
                     </div>

                     <!-- Remote Link -->
                     <div v-if="mediaType === 'link'" class="flex gap-2 mb-2">
                        <input v-model="mediaUrl" class="flex-1 border rounded p-2 text-sm" placeholder="https://example.com/image.png">
                     </div>

                     <!-- File Upload -->
                     <div v-else-if="mediaType === 'upload'" class="flex gap-2 mb-2">
                        <input type="file" ref="fileInput" accept="image/*" @change="handleFileUpload" class="flex-1 border rounded p-2 text-sm file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100">
                        <div v-if="isUploading" class="text-xs text-indigo-600 animate-pulse font-bold self-center">Uploading...</div>
                     </div>

                     <!-- Video Link -->
                     <div v-else-if="mediaType === 'video'" class="flex gap-2 mb-2">
                        <input v-model="mediaUrl" class="flex-1 border rounded p-2 text-sm" placeholder="https://youtube.com/watch?v=...">
                     </div>
                     
                     <!-- Preview -->
                     <div v-if="mediaUrl" class="w-full h-32 bg-gray-50 rounded border flex items-center justify-center overflow-hidden relative">
                        <img v-if="mediaType !== 'video'" :src="mediaUrl" @error="handleImageError" class="max-h-full max-w-full object-contain">
                        <div v-else class="text-xs text-gray-500 flex flex-col items-center">
                            <span>▶️ Video Preview</span>
                            <span class="text-[10px]">{{ mediaUrl }}</span>
                        </div>
                        <button v-if="mediaUrl" @click="clearMedia" class="absolute top-1 right-1 bg-white/80 hover:bg-red-100 text-gray-500 hover:text-red-500 rounded-full p-1 w-6 h-6 flex items-center justify-center shadow-sm">✕</button>
                     </div>
                </div>

                <!-- Options (MCQ) -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                        <span>Options (MCQ)</span>
                        <button @click="addOption" class="text-indigo-600 text-[10px] hover:underline">+ Add Option</button>
                     </label>
                     <div class="space-y-2">
                        <div v-for="(opt, idx) in optionList" :key="idx" class="flex items-center gap-2">
                            <span class="text-xs font-mono font-bold">{{ String.fromCharCode(65 + idx) }}.</span>
                            <input v-model="optionList[idx]" class="flex-1 border rounded p-2 text-sm">
                            <button @click="removeOption(idx)" class="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                        </div>
                        <div v-if="optionList.length === 0" class="text-xs text-gray-400 italic">No options added.</div>
                     </div>
                </div>

                <!-- Answer Key -->
                <div>
                     <label class="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                        <span>Answer Key (Correct Options)</span>
                        <button @click="addAnswer" class="text-indigo-600 text-[10px] hover:underline">+ Add Answer</button>
                     </label>
                     <div class="space-y-2">
                        <div v-for="(ans, idx) in answerList" :key="idx" class="flex items-center gap-2">
                             <input v-model="answerList[idx]" class="flex-1 border rounded p-2 text-sm" placeholder="Exact match of option text">
                             <button @click="removeAnswer(idx)" class="text-gray-400 hover:text-red-500 font-bold px-2">✕</button>
                        </div>
                        <div v-if="answerList.length === 0" class="text-xs text-gray-400 italic">No answers defined.</div>
                     </div>
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
  academicYear: String,
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
const courseName = ref('Course Name');
// academicYear removed from data (use prop) 

const sets = ref([]);
const questions = ref([]);
const analytics = ref([]);
const taxonomies = ref([]); // New
const selectedSetId = ref(null);

// Sorting
const sortBy = ref('set_name');
const sortDesc = ref(false);

const sortTable = (key) => {
  if (sortBy.value === key) sortDesc.value = !sortDesc.value;
  else { sortBy.value = key; sortDesc.value = false; }
};

const sortedAnalytics = computed(() => {
  return [...analytics.value].sort((a, b) => {
    let valA = a[sortBy.value];
    let valB = b[sortBy.value];
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    
    if (typeof valA === 'string') {
       return sortDesc.value ? valB.localeCompare(valA, undefined, { numeric: true }) : valA.localeCompare(valB, undefined, { numeric: true });
    }
    return sortDesc.value ? valB - valA : valA - valB;
  });
});

const editingQuestion = ref(null);
// Form States (User Friendly)
const mediaType = ref('link'); // link, upload, video
const mediaUrl = ref('');
const isUploading = ref(false);
const fileInput = ref(null);

// AI Gen States
const showAiModal = ref(false);
const isGenerating = ref(false);
const aiConfig = ref({
    mcqCount: null,
    textCount: null,
    mediaPreference: 'default',
    instructions: ''
});

const getSetName = (sid) => {
    const s = sets.value.find(x => x.set_id === sid);
    return s ? s.name : `Set ${sid}`;
};

const getSetTaxonomy = (sid) => {
    const s = sets.value.find(x => x.set_id === sid);
    return s ? (s.difficulty_name || 'Bloom') : 'Unknown';
};

const openAiModal = () => {
    // Reset config
    aiConfig.value = { mcqCount: null, textCount: null, mediaPreference: 'default', instructions: '' };
    showAiModal.value = true;
};

const closeAiModal = () => showAiModal.value = false;

const runAiGeneration = async () => {
    // 1. Check for Existing Questions
    if (questions.value.length > 0) {
        if (!confirm(`Warning: This set already has ${questions.value.length} questions.\n\nRunning AI Generation will OVERWRITE them. This cannot be undone.\n\nAre you sure you want to proceed?`)) {
            return;
        }
    }

    isGenerating.value = true;
    try {
        const res = await fetch(`/${props.courseCode.toLowerCase()}/api/courses/${props.courseCode}/generate-questions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-User-Id': props.userId 
            },
            body: JSON.stringify({
                setId: selectedSetId.value,
                taxonomy: getSetTaxonomy(selectedSetId.value),
                mcqCount: aiConfig.value.mcqCount,
                textCount: aiConfig.value.textCount,
                mediaPreference: aiConfig.value.mediaPreference,
                instructions: aiConfig.value.instructions,
                confirmsOverwrite: true, // We confirmed above
                academicYear: props.academicYear,
                semester: props.semester
            })
        });

        if (res.ok) {
            const data = await res.json();
            alert(`Success! Generated ${data.count} questions.`);
            closeAiModal();
            fetchQuestions(); // Refresh list
        } else {
            const err = await res.json();
            alert(`Generation Failed: ${err.error}`);
        }
    } catch (e) {
        alert("Network Error during Generation");
        console.error(e);
    } finally {
        isGenerating.value = false;
    }
};

const sortedQuestions = computed(() => {
    // Sort by difficulty (ascending)
    return [...questions.value].sort((a, b) => {
        const diffA = Number(a.difficultyLevel || a.difficulty) || 0;
        const diffB = Number(b.difficultyLevel || b.difficulty) || 0;
        if (diffA !== diffB) return diffA - diffB;
        
        // Fallback to sequence
        const seqA = a.sequence_order || 0;
        const seqB = b.sequence_order || 0;
        return seqA - seqB; 
    });
});

const optionList = ref([]);
const answerList = ref([]);
const editingJSON = ref({ media: '{}', answerKey: '[]', options: '[]' }); 

const handleImageError = (e) => {
    e.target.style.opacity = '0.3';
};

const clearMedia = () => {
    mediaUrl.value = '';
    if (fileInput.value) fileInput.value.value = '';
};

const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Only image files are allowed.");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    isUploading.value = true;
    try {
        const res = await fetch(`/${props.courseCode.toLowerCase()}/api/upload`, {
            method: 'POST',
            body: formData
        });
        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        mediaUrl.value = data.url;
    } catch (e) {
        alert("Failed to upload image.");
        console.error(e);
        mediaUrl.value = '';
    } finally {
        isUploading.value = false;
    }
};

const moveQuestion = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= sortedQuestions.value.length) return;

    // Swap logic on sorted array
    const list = [...sortedQuestions.value];
    const temp = list[index];
    list[index] = list[newIndex];
    list[newIndex] = temp;

    // Re-assign sequence_order based on new array order
    const updates = list.map((q, idx) => ({
        id: q.id,
        sequence_order: idx + 1
    }));
    
    // Update Local State (Optimistic)
    // We need to update the main `questions` ref, but preserving objects
    updates.forEach(u => {
        const q = questions.value.find(qq => qq.id === u.id);
        if (q) q.sequence_order = u.sequence_order;
    });

    try {
        await fetch(`/${props.courseCode.toLowerCase()}/api/questions/reorder`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-User-Id': props.userId 
            },
            body: JSON.stringify({ 
                items: updates,
                courseCode: props.courseCode,
                academicYear: props.academicYear,
                semester: props.semester
            })
        });
    } catch (e) {
        alert("Failed to save order");
        fetchQuestions(); // Revert
    }
};

const updateQuestion = async (q) => {
    try {
        await fetch(`/${props.courseCode.toLowerCase()}/api/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: props.userId,
                question: {
                    ...q,
                    courseCode: props.courseCode,
                    academicYear: props.academicYear,
                    semester: props.semester
                }
            })
        });
    } catch (e) {
        alert("Failed to update question");
    }
};

const toggleQuestionVisibility = async (q) => {
    // Optimistic Update
    q.is_visible = !q.is_visible; 
    await updateQuestion(q);
};



// --- DIFF COLORS ---
const getDiffColor = (d) => {
    if (d <= 2) return 'bg-green-100 text-green-700';
    if (d <= 4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
};

// --- API ---
const fetchData = async () => {
    // 0. Fetch Taxonomies
    try {
        const tRes = await fetch(`/${props.courseCode.toLowerCase()}/api/taxonomies`);
        if (tRes.ok) taxonomies.value = await tRes.json();
    } catch (e) { console.warn("Taxonomy Fetch Error", e); }

    // 1. Config
    const cRes = await fetch(`/${props.courseCode.toLowerCase()}/api/config`);
    if (cRes.ok) {
        const d = await cRes.json();
        config.value = { 
            iconUrl: d.iconUrl || '', 
            promptTemplate: d.promptTemplate || '', 
            apiKey: '' 
        };
        // Populate Context
        if (d.courseName) courseName.value = d.courseName;
    }

    // 2. Sets
    try {
        const sRes = await fetch(`/${props.courseCode.toLowerCase()}/api/sets/${props.courseCode}?userId=${props.userId}&academicYear=${props.academicYear}&semester=${props.semester}`);
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
        // PII Masking: userId moved to Header
        const aRes = await fetch(`/${props.courseCode.toLowerCase()}/api/analytics/${props.courseCode}?academicYear=${props.academicYear}&semester=${props.semester}`, {
            headers: { 'X-User-Id': props.userId }
        });
        if (aRes.ok) {
            const d = await aRes.json();
            analytics.value = d.stats;
        }
    } catch (e) {
        console.warn("Analytics Fetch Error", e);
    }
};

const saveConfig = async () => {
    await fetch(`/${props.courseCode.toLowerCase()}/api/courses/${props.courseCode}/config`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': props.userId
        },
        body: JSON.stringify({
            // userId: props.userId, // Removed from body
            academicYear: props.academicYear, semester: props.semester,
            config: config.value
        })
    });
    alert('Configuration Saved');
};

const getScopedKey = () => `atas_api_key_${props.courseCode}`;

// Helper: Resolve Media URL via Gateway (Identical to ATAS.vue)
const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    // If it starts with /assets, prefix with current course to route through Gateway to Agent
    const prefix = `/${props.courseCode.toLowerCase()}`;
    if (url.startsWith('/assets/')) return `${prefix}${url}`;
    // If it's a relative path, assume it belongs to the Agent
    if (!url.startsWith('/')) return `${prefix}/${url}`;
    return url;
};

const updateSet = async (set) => {
    await fetch(`/${props.courseCode.toLowerCase()}/api/sets/${props.courseCode}`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-User-Id': props.userId
        },
        body: JSON.stringify({
            userId: props.userId,
            academicYear: props.academicYear, 
            semester: props.semester,
            set: set
        })
    });
};

// ... (updateSetTaxonomy uses updateSet, so it's covered)

const deleteSet = async (setId) => {
    // Inject Context into Query Params for Delete
    const query = new URLSearchParams({
        userId: props.userId,
        academicYear: props.academicYear,
        semester: props.semester
    }).toString();

    await fetch(`/${props.courseCode.toLowerCase()}/api/sets/${props.courseCode}/${setId}?${query}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': props.userId }
    });
};

const confirmDeleteSet = async (set) => {
    if (confirm(`Delete '${set.name}'? This cannot be undone.`)) {
        try {
            await deleteSet(set.set_id);
            // Refresh
            sets.value = sets.value.filter(s => s.set_id !== set.set_id);
        } catch (e) {
            alert("Failed to delete set");
        }
    }
};

const updateSetTaxonomy = async (set) => {
    // RESTRICTION: Cannot change taxonomy if questions exist
    // The backend now returns 'question_count' on sets
    if (set.question_count && Number(set.question_count) > 0) {
        alert("Action Blocked: Cannot change taxonomy.\n\nThis question set contains existing questions. Changing the taxonomy would invalidate their classification.\n\nPlease remove all questions from this set first.");
        
        // Revert UI: We simply re-fetch the sets to restore the original value from server
        try {
            const sRes = await fetch(`/${props.courseCode.toLowerCase()}/api/sets/${props.courseCode}?userId=${props.userId}&academicYear=${props.academicYear}&semester=${props.semester}`);
            if (sRes.ok) {
                const fetched = await sRes.json();
                fetched.forEach((s, i) => { if (!s.sequence_order) s.sequence_order = i + 1; });
                fetched.sort((a,b) => a.sequence_order - b.sequence_order);
                sets.value = fetched;
            }
        } catch (e) { console.error("Revert failed", e); }
        
        return;
    }

    // Look up name
    const tax = taxonomies.value.find(t => t.uuid === set.difficulty_id);
    if (tax) set.difficulty_name = tax.taxonomy_name;
    await updateSet(set);
};

const toggleSetVisibility = async (set) => {
    // Optimistic Update
    set.is_visible = !set.is_visible; 
    await updateSet(set);
};

const moveSet = async (set, dir) => {
    const currentIndex = sets.value.findIndex(s => s.set_id === set.set_id);
    if (currentIndex === -1) return;
    
    const targetIndex = currentIndex + dir;
    if (targetIndex < 0 || targetIndex >= sets.value.length) return;
    
    const targetSet = sets.value[targetIndex];
    
    // Swap Sequence Orders
    const temp = set.sequence_order;
    set.sequence_order = targetSet.sequence_order;
    targetSet.sequence_order = temp;
    
    // Sort locally essentially immediately for UI
    sets.value.sort((a,b) => a.sequence_order - b.sequence_order);

    // Persist BOTH changes
    await updateSet(set);
    await updateSet(targetSet);
};

const addNewSet = async () => {
    // Stick to auto-increment Integer for Sets for user friendliness (Set 1, Set 2).
    const newId = sets.value.length > 0 ? Math.max(...sets.value.map(s => s.set_id)) + 1 : 1;
    const maxSeq = sets.value.length > 0 ? Math.max(...sets.value.map(s => s.sequence_order)) : 0;
    
    // Default to Bloom's (First taxonomy or hardcoded UUID)
    const defaultTax = taxonomies.value.find(t => t.taxonomy_name.includes("Bloom")) || taxonomies.value[0];
    const difficultyId = defaultTax ? defaultTax.uuid : '0d0ccc1d-0b00-4bf4-9e90-4069d1460fca';
    const difficultyName = defaultTax ? defaultTax.taxonomy_name : "Bloom's Taxonomy";

    const newSet = { 
        set_id: newId, 
        name: `Module ${newId}`, 
        sequence_order: maxSeq + 1, 
        is_visible: 0,
        difficulty_id: difficultyId,
        difficulty_name: difficultyName
    };

    sets.value.push(newSet);
    await updateSet(newSet);
};



// --- QUESTIONS ---
const fetchQuestions = async () => {
    if (!selectedSetId.value) return;
    // PII Masking: Header used in server.js for validation if needed, though getQuestions is loose
    // Wait, getQuestions also needs Header if we want to include hidden?
    // Let's add header
    const res = await fetch(`/${props.courseCode.toLowerCase()}/api/courses/${props.courseCode}/questions?setId=${selectedSetId.value}&academicYear=${props.academicYear}&semester=${props.semester}`, {
        headers: { 'X-User-Id': props.userId }
    });
    if (res.ok) questions.value = await res.json();
};

// FORM HELPERS
const addOption = () => optionList.value.push('');
const removeOption = (idx) => optionList.value.splice(idx, 1);
const addAnswer = () => answerList.value.push('');
const removeAnswer = (idx) => answerList.value.splice(idx, 1);

const openQuestionModal = (q = null) => {
    if (q) {
        editingQuestion.value = JSON.parse(JSON.stringify(q)); 
        
        // Parse Media
        mediaUrl.value = '';
        mediaType.value = 'link'; 
        
        let mediaObj = null;
        if (q.media && q.media.url) mediaObj = q.media;
        else if (typeof q.media === 'string') {
             try { mediaObj = JSON.parse(q.media); } catch(e){}
        }

        if (mediaObj) {
            mediaUrl.value = mediaObj.url || '';
            if (mediaObj.type === 'video') mediaType.value = 'video';
            else if (mediaUrl.value.startsWith('/assets/uploads')) mediaType.value = 'upload';
            else mediaType.value = 'link';
        }

        // Parse Options
        optionList.value = [];
        if (Array.isArray(q.options)) optionList.value = [...q.options];
        else if (typeof q.options === 'string') {
            try { optionList.value = JSON.parse(q.options) || []; } catch(e){}
        }

        // Parse Answer Key
        answerList.value = [];
        if (Array.isArray(q.answerKey || q.answer_key)) answerList.value = [...(q.answerKey || q.answer_key)];
         else if (typeof q.answerKey === 'string') {
            try { answerList.value = JSON.parse(q.answerKey) || []; } catch(e){}
        } else if (typeof q.answer_key === 'string') {
             try { answerList.value = JSON.parse(q.answer_key) || []; } catch(e){}
        }

    } else {
        // New: Use UUID for production readiness
        editingQuestion.value = {
            id: crypto.randomUUID(), 
            question_id: `Q${questions.value.length + 1}`,
            course_code: props.courseCode,
            academic_year: props.academicYear, semester: props.semester,
            set_id: selectedSetId.value,
            question_text: 'New Question',
            type: 'text',
            difficulty: 1,
            context: '',
            media: null,
            sequence_order: questions.value.length + 1
        };
        mediaUrl.value = '';
        mediaType.value = 'link';
        optionList.value = [];
        answerList.value = [];
    }
};

const saveQuestion = async () => {
    try {
        // Media Object Construction
        if (mediaUrl.value.trim()) {
            editingQuestion.value.media = { 
                type: mediaType.value === 'video' ? 'video' : 'image', 
                url: mediaUrl.value.trim() 
            };
        } else {
            editingQuestion.value.media = null;
        }

        // Options
        editingQuestion.value.options = optionList.value.filter(o => o.trim() !== '');

        // Answer Key
        editingQuestion.value.answerKey = answerList.value.filter(a => a.trim() !== '');

        // Ensure IDs
        editingQuestion.value.difficulty = Number(editingQuestion.value.difficulty);
        editingQuestion.value.set_id = Number(selectedSetId.value);
        
        const res = await fetch(`/${props.courseCode.toLowerCase()}/api/questions`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-User-Id': props.userId  // Header PII
            },
            body: JSON.stringify({
                userId: props.userId,
                question: {
                    ...editingQuestion.value,
                    courseCode: props.courseCode,
                    academicYear: props.academicYear,
                    semester: props.semester
                }
            })
        });

        if (res.ok) {
            editingQuestion.value = null;
            fetchQuestions(); // Refresh list
        } else {
            alert("Save failed");
        }
    } catch (e) {
        console.error(e);
        alert("Error saving question");
    }
};
const deleteQuestion = async (id) => {
    if (!confirm("Delete this question?")) return;
    try {
        const query = new URLSearchParams({ userId: props.userId, academicYear: props.academicYear, semester: props.semester });
        await fetch(`/${props.courseCode.toLowerCase()}/api/questions/${props.courseCode}/${id}?${query}`, { method: 'DELETE' });
        
        questions.value = questions.value.filter(q => q.id !== id);
    } catch (e) {
        alert("Failed to delete question");
    }
};


onMounted(() => {
    fetchData();
});
</script>
