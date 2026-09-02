const baseUrl = (process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

async function main() {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
        throw new Error(`Health check failed with HTTP ${response.status}`);
    }

    const body = await response.json();
    if (!body.ok) {
        throw new Error('Health check returned an unexpected response');
    }

    console.log(`Smoke test passed: ${baseUrl}/health`);
}

main().catch((error) => {
    console.error(`Smoke test failed: ${error.message}`);
    process.exitCode = 1;
});