

const BASE_URL = 'http://localhost:3010';
const COURSE = 'MH1810';
const USER_ID = 'uuid-hal';

async function testUpdateSet() {
    try {
        console.log("Testing Set Update...");
        const payload = {
            userId: USER_ID,
            academicYear: 'AY2025/26',
            semester: 'Semester 2',
            set: {
                set_id: 1,
                name: "Module 1 - Calculus (Updated via Script)",
                is_visible: true, // Boolean, to test the cast
                sequence_order: 1,
                difficulty_id: '0d0ccc1d-0b00-4bf4-9e90-4069d1460fca',
                difficulty_name: "Bloom's Taxonomy"
            }
        };

        const res = await fetch(`${BASE_URL}/mh1810/api/sets/${COURSE}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': USER_ID
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            console.log("Success:", data);
        } else {
            console.error("Failed:", res.status, res.statusText);
            const text = await res.text();
            console.error("Body:", text);
        }

    } catch (e) {
        console.error("Error:", e);
    }
}

testUpdateSet();
