import axios from 'axios';

async function testTaskCreate() {
    try {
        const loginRes = await axios.post('http://localhost:4000/api/auth/login', {
            login: 'admin',
            password: '123'
        });
        const token = loginRes.data.token;

        const res = await axios.post('http://localhost:4000/api/tasks', {
            partCodeId: "1",
            methodId: "1",
            quantity: "10",
            assignedToUserId: "1",
            priority: "1"
        }, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        console.log("Success:", res.data);
    } catch (e: any) {
        console.log("Error status:", e.response?.status);
        console.log("Error details:", e.response?.data);
    }
}

testTaskCreate();
