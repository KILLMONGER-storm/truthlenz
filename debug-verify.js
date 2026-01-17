const SUPABASE_URL = 'https://gfbdkbjmddfjlmcllkxx.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmYmRrYmptZGRmamxtY2xsa3h4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDk3NzQsImV4cCI6MjA4Mzk4NTc3NH0.9dtwlhpCX18D7wcXtvnJ_r3eXAOhQE5fMIBl_bHBQAM';

async function test() {
    console.log('Testing deployed function...');
    try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/verify-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({
                content: 'The sky is blue.',
                type: 'text'
            })
        });
        console.log('Status:', resp.status);
        const text = await resp.text();
        console.log('Response:', text);
    } catch (e) {
        console.error('Fetch error:', e);
    }
}
test();
