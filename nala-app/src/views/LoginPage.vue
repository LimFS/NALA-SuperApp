<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 relative overflow-hidden">
    <!-- Decorative Orbs -->
    <div class="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
    <div class="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

    <div class="relative w-full max-w-md p-8 bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20">
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-white mb-2 tracking-tight">NALA Super App</h1>
        <p class="text-indigo-200 text-sm">Sign in to continue</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        <div>
           <label class="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Email Address</label>
           <input 
             v-model="email" 
             type="email" 
             required 
             class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
             placeholder="student@nala.ai"
           >
        </div>

        <div>
           <label class="block text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Password</label>
           <input 
             v-model="password" 
             type="password" 
             required 
             class="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
             placeholder="••••••••"
           >
        </div>

        <div v-if="error" class="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
            {{ error }}
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold py-3.5 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="animate-pulse">Signing in...</span>
          <span v-else>Sign In</span>
        </button>
      </form>
      
      <div class="mt-8 text-center text-xs text-indigo-300">
        <p>Production Manifesto Compliance • Secure Login</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  try {
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await res.json();
    
    if (res.ok) {
        // Save Token & User
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        
        // Redirect
        router.push('/');
    } else {
        error.value = data.error || 'Login failed';
    }
  } catch (e) {
      error.value = "Connection Error. Is the server running?";
  } finally {
      loading.value = false;
  }
};
</script>

<style>
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
</style>
