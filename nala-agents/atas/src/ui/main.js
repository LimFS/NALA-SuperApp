import { createApp } from 'vue'
import ATAS from './ATAS.vue'

const app = createApp(ATAS, {
    // Props matching what AgentView passed
    courseCode: 'MH1810',
    courseName: 'Mathematics 2',
    semester: 'AY2025 Semester 2',
    studentName: 'Student User'
})

app.mount('#app')
