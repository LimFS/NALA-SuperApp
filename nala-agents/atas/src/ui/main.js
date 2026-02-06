import { createApp } from 'vue'
import ATAS from './ATAS.vue'

const bootstrap = async () => {
    let config = {
        courseCode: 'MH1810',
        courseName: 'Mathematics 2',
        academicYear: 'AY2025',
        semester: 'Semester 2',
        studentName: 'Student User'
    };

    try {
        const res = await fetch('/atas/api/config');
        if (res.ok) {
            const data = await res.json();
            // Data has structured fields: academicYear, semester
            config = { ...config, ...data };
        }
    } catch (e) {
        console.warn("Using default config, API failed:", e);
    }

    const app = createApp(ATAS, config);
    app.mount('#app');
};

bootstrap();
