import { createApp } from 'vue'
import './style.css'
import ATAS from './ATAS.vue'

const bootstrap = async () => {
    // 1. Determine Course Code from URL (e.g. /ee2101 -> EE2101)
    const path = window.location.pathname;
    const segments = path.split('/').filter(p => p.length > 0);

    // Default to MH1810 if root or invalid, otherwise use the first segment
    let courseCode = 'MH1810';
    if (segments.length > 0 && /^[a-z0-9]+$/i.test(segments[0])) {
        courseCode = segments[0].toUpperCase();
    }

    let config = {
        courseCode: courseCode,
        courseName: 'Loading...',
        academicYear: 'AY2025',
        semester: 'Semester 2',
        studentName: 'Student User'
    };

    try {
        // Fetch config for THIS course using the dynamic code
        // URL: /<courseCode>/api/config?courseCode=<courseCode>
        const res = await fetch(`/${courseCode.toLowerCase()}/api/config?courseCode=${courseCode}`);
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
