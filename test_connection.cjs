const fetch = require('node-fetch');

async function testSupabase() {
    const url = 'https://txzbruiseihlnphuisuc.supabase.co/rest/v1/friends?select=*&limit=1';
    const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4emJydWlzZWlobG5waHVpc3VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3NjA1MjYsImV4cCI6MjA4NjMzNjUyNn0.hanut-gLuzrevdU9wUFBG7p64k-Ff4osm-aDCF74Ves';

    console.log('Testing Supabase from Node.js (Main Process Context)...');
    try {
        const res = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Body:', text);
    } catch (err) {
        console.error('Fetch Error:', err);
    }
}

testSupabase();
