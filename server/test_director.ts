import axios from 'axios';

async function test() {
    try {
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
            login: 'admin',
            password: '123'
        });
        const token = loginRes.data.token;
        console.log('Logged in. Token length:', token.length);

        console.log('Creating director task...');
        const taskRes = await axios.post('http://localhost:4000/api/director-tasks', {
            title: 'Test director task',
            description: 'Test description',
            priority: 2,
            assignedToId: 1
        }, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000 // fail fast if it hangs
        });

        console.log('Success:', taskRes.data);
    } catch (e: any) {
        console.error('Error:', e.response?.data || e.message);
    }
}

test();
