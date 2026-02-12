<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const agents = ref([
  {
    name: 'MH1810',
    fullName: 'ATAS',
    icon: '/assets/icons/mh1810_math.png',
    url: 'http://localhost:8000/mh1810',
    bg: 'bg-white'
  },
  {
    name: 'CC0001',
    fullName: 'Design Thinking',
    icon: '/assets/icons/cc0001_writing.png',
    url: 'http://localhost:8000/design-thinker',
    bg: 'bg-white'
  },
  {
    name: 'IE2107',
    fullName: 'Teachable Agent',
    icon: '/assets/icons/ie2107_linear_algebra.png',
    url: 'http://localhost:8000/ie2017',
    bg: 'bg-white'
  },
  {
    name: 'NED166',
    fullName: 'Disability Studies',
    icon: '/assets/icons/ned166_disability_studies.png',
    url: 'http://localhost:8000/ned166',
    bg: 'bg-white',
    scale: 'scale-110' // Fix for smaller icon
  },
  {
    name: 'EE2101',
    fullName: 'AI Grader',
    icon: '/assets/icons/ee2101_circuit.png',
    url: 'http://localhost:8000/ee2101',
    bg: 'bg-white'
  },
  {
    name: 'Analytics',
    fullName: 'Analytics',
    icon: '/assets/icons/dashboard_analytics.png',
    url: 'http://localhost:8000/analytics',
    bg: 'bg-white'
  }
]);

const currentTime = ref('');
const greeting = ref('Good Morning');
const userName = ref('Student');

const updateTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const hour = now.getHours();
    if (hour < 12) greeting.value = 'Good Morning';
    else if (hour < 18) greeting.value = 'Good Afternoon';
    else greeting.value = 'Good Evening';
};

let timer;

onMounted(async () => {
   updateTime();
   timer = setInterval(updateTime, 1000 * 60);

   // Populate User from Local Storage (set by Login)
   const userStr = localStorage.getItem('user_info');
   if (userStr) {
       const user = JSON.parse(userStr);
       userName.value = user.first_name || 'Student';
   } else {
       // Fallback fetch if not in storage (e.g. dev mode)
       try {
         const res = await fetch('http://localhost:3000/api/user/me', {
             headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
         });
         if (res.ok) {
            const user = await res.json();
            userName.value = user.first_name || 'Student';
         }
       } catch (e) {
         console.error("Failed to fetch user", e);
       }
   }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const handleLogout = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_info');
  window.location.href = '/login';
};
const navigateTo = async (url) => {
  // SECURE TOKEN HANDOFF
  try {
      const authToken = localStorage.getItem('auth_token');
      if (!authToken) {
          window.location.href = '/login';
          return;
      }

      // 1. Request One-Time Token from NALA Server
      const res = await fetch('http://localhost:3000/api/auth/issue-token', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
          const { token } = await res.json();
          // 2. Redirect with Token
          const separator = url.includes('?') ? '&' : '?';
          window.location.href = `${url}${separator}token=${encodeURIComponent(token)}`;
      } else {
          console.error("Token Issue Failed");
          // Fallback? Best to fail secure.
          alert("Secure Handover Failed. Please login again.");
      }
  } catch (e) {
      console.error("Handover Error", e);
      alert("Network Error during Handover");
  }
};
</script>

<template>
  <div class="bg-black min-h-screen flex flex-col items-center pt-10 pb-10 px-4 font-sans selection:bg-white/20">
    <!-- Status Bar Area -->
    <div class="w-full max-w-7xl flex flex-col items-center mb-8 sm:mb-12 z-10">
      
      <!-- Top Bar: Time & Brand -->
      <div class="w-full flex justify-between items-center text-white/60 text-sm font-medium px-4 mb-8">
        <span>{{ currentTime }}</span>
        <div class="flex gap-6 items-center">
           <button 
             @click="handleLogout" 
             class="text-xs uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
           >
             Logout
           </button>
           <div class="flex gap-2 items-center">
              <span class="tracking-widest opacity-80">NALA AI</span>
              <!-- WiFi Icon -->
              <div class="w-4 h-3 border-t-2 border-white/40 rounded-t-full"></div>
           </div>
        </div>
      </div>

      <!-- Greeting & User -->
      <div class="text-center animate-in fade-in slide-in-from-bottom-4 duration-700 flex flex-col items-center gap-4">
         <!-- Profile Picture -->
         <div class="relative group">
            <div class="absolute -inset-0.5 bg-gradient-to-r from-green-400 to-yellow-500 rounded-full opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt blur"></div>
            <img 
              src="/assets/profiles/del_durian.png" 
              alt="Profile" 
              class="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-black object-cover shadow-2xl bg-white"
            />
         </div>

         <div>
             <h1 class="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-2 tracking-tight">
               {{ greeting }}, <span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">{{ userName }}</span>
             </h1>
             <p class="text-white/40 text-sm sm:text-base font-light tracking-wide">
               Select an agent to begin your session.
             </p>
         </div>
      </div>

    </div>

    <!-- App Grid -->
    <div class="grid grid-cols-3 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-10 max-w-5xl w-full justify-items-center justify-center content-center mx-auto">
      <div 
        v-for="agent in agents" 
        :key="agent.name"
        @click="navigateTo(agent.url)"
        class="flex flex-col items-center gap-2 group cursor-pointer transition-transform duration-200 active:scale-95 w-20"
      >
        <!-- Icon Container: Strictly Sized -->
        <div class="icon-container relative w-[60px] h-[60px] sm:w-[72px] sm:h-[72px] rounded-[14px] sm:rounded-[18px] shadow-lg overflow-hidden bg-white/10 backdrop-blur-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-white/10 group-hover:brightness-110 flex items-center justify-center">
           <!-- Icon Image -->
           <img 
            :src="agent.icon" 
            :alt="agent.name" 
            class="w-full h-full object-cover"
            :class="agent.scale || 'scale-100'"
            style="width: 100%; height: 100%;" 
          />
        </div>
        
        <!-- Label: Course Code -->
        <span class="text-white text-[11px] sm:text-xs font-bold tracking-tight drop-shadow-md text-center leading-tight opacity-90 group-hover:opacity-100">{{ agent.name }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Failsafe sizing if Tailwind doesn't load */
img {
  max-width: 100%;
  height: auto;
}
.icon-container {
  width: 60px !important;
  height: 60px !important;
}
@media (min-width: 640px) {
  .icon-container {
    width: 72px !important;
    height: 72px !important;
  }
}
</style>
